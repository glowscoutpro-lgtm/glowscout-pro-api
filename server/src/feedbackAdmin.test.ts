import { spawn } from "child_process";
import { mkdtempSync, rmSync } from "fs";
import os from "os";
import path from "path";
import { setTimeout as sleep } from "timers/promises";

type FetchResponse = {
  status: number;
  headers: Headers;
  body: string;
};

async function get(url: string, init?: RequestInit): Promise<FetchResponse> {
  const res = await fetch(url, init);
  const body = await res.text();
  return { status: res.status, headers: res.headers, body };
}

async function waitForServer(url: string, timeoutMs = 5000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // server not up yet
    }
    await sleep(100);
  }
  throw new Error(`server did not start within ${timeoutMs}ms`);
}

const TOKEN = "test-admin-token-abc123";
const PORT = 4099;
const BASE = `http://127.0.0.1:${PORT}`;

const feedbackDir = mkdtempSync(path.join(os.tmpdir(), "glowscout-fb-test-"));
const srcEntry = path.join(import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname), "index.ts");

const child = spawn(process.execPath, ["--import", "tsx", srcEntry], {
  env: {
    ...process.env,
    PORT: String(PORT),
    FEEDBACK_DIR: feedbackDir,
    FEEDBACK_ADMIN_TOKEN: TOKEN,
    ADMIN_TOKEN: "",
    GOOGLE_MAPS_API_KEY: "",
    RESEND_API_KEY: ""
  },
  stdio: ["ignore", "pipe", "pipe"]
});

let stderrBuffer = "";
child.stderr.on("data", (chunk) => {
  stderrBuffer += chunk.toString();
});

let failed = 0;
function record(name: string, ok: boolean, detail?: string) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  -- ${detail}` : ""}`);
  if (!ok) failed++;
}

async function run() {
  try {
    await waitForServer(`${BASE}/health`);
  } catch (error) {
    console.error("server failed to start:", error);
    console.error("stderr:", stderrBuffer);
    failed++;
    return;
  }

  // Submit one feedback record so admin endpoints have something to return.
  const post = await fetch(`${BASE}/api/feedback`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      surveyType: "consumer_beta",
      overallRating: 5,
      likedMost: "fast results",
      appVersion: "1.0.0",
      appBuild: "9",
      platform: "ios",
      deviceModel: "iPhone 15 Pro",
      searchLocation: "Lake Zurich, IL"
    })
  });
  record("POST /api/feedback returns 201", post.status === 201, `status=${post.status}`);

  // 401 without token
  const noAuth = await get(`${BASE}/api/feedback`);
  record("GET /api/feedback without token rejects", noAuth.status === 401, `status=${noAuth.status}`);

  // 401 with wrong token
  const wrongAuth = await get(`${BASE}/api/feedback?token=wrong`);
  record(
    "GET /api/feedback with wrong token rejects",
    wrongAuth.status === 401,
    `status=${wrongAuth.status}`
  );

  // 200 with query token
  const qOk = await get(`${BASE}/api/feedback?token=${TOKEN}`);
  let qOkParsed: unknown;
  try {
    qOkParsed = JSON.parse(qOk.body);
  } catch {
    qOkParsed = null;
  }
  const items = (qOkParsed as { items?: unknown[] } | null)?.items;
  record(
    "GET /api/feedback?token=... returns JSON with items",
    qOk.status === 200 && Array.isArray(items) && items.length >= 1,
    `status=${qOk.status} items=${Array.isArray(items) ? items.length : "n/a"}`
  );

  // 200 with bearer token
  const bearer = await get(`${BASE}/api/feedback`, {
    headers: { authorization: `Bearer ${TOKEN}` }
  });
  record(
    "GET /api/feedback with bearer header returns 200",
    bearer.status === 200,
    `status=${bearer.status}`
  );

  // CSV
  const csv = await get(`${BASE}/api/feedback.csv?token=${TOKEN}`);
  const csvOk =
    csv.status === 200 &&
    csv.headers.get("content-type")?.startsWith("text/csv") &&
    csv.body.startsWith("id,") &&
    csv.body.includes("consumer_beta");
  record("GET /api/feedback.csv returns CSV", Boolean(csvOk), `status=${csv.status}`);

  // CSV without token rejects
  const csvNoAuth = await get(`${BASE}/api/feedback.csv`);
  record(
    "GET /api/feedback.csv without token rejects",
    csvNoAuth.status === 401,
    `status=${csvNoAuth.status}`
  );

  // HTML viewer
  const html = await get(`${BASE}/admin/feedback?token=${TOKEN}`);
  const htmlOk =
    html.status === 200 &&
    html.headers.get("content-type")?.startsWith("text/html") &&
    html.body.includes("GlowScout beta feedback") &&
    html.body.includes("consumer_beta");
  record("GET /admin/feedback returns HTML viewer", Boolean(htmlOk), `status=${html.status}`);

  // HTML viewer without token still returns HTML but with 401
  const htmlNoAuth = await get(`${BASE}/admin/feedback`);
  record(
    "GET /admin/feedback without token returns 401 HTML",
    htmlNoAuth.status === 401 && htmlNoAuth.body.includes("Unauthorized"),
    `status=${htmlNoAuth.status}`
  );
}

try {
  await run();
} finally {
  child.kill("SIGTERM");
  await sleep(100);
  try {
    rmSync(feedbackDir, { recursive: true, force: true });
  } catch {
    // ignore cleanup errors
  }
}

if (failed > 0) {
  console.log(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log("\nAll admin endpoint tests passed");
