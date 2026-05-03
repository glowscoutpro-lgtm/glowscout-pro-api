import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { z } from "zod";

const ratingField = z.coerce.number().min(0).max(5).optional();

const sentimentEnum = z.enum(["yes", "somewhat", "no", "maybe"]);
const sentimentOrRatingField = z
  .union([sentimentEnum, z.coerce.number().min(0).max(5)])
  .optional();

const baseSchema = z.object({
  surveyType: z.enum(["consumer_beta", "professional_beta"]),
  name: z.string().trim().max(120).optional(),
  email: z.string().trim().email().max(200).optional(),
  canContact: z.boolean().optional(),
  testerRole: z.string().trim().max(120).optional(),
  overallRating: z.coerce.number().min(1).max(5).optional(),
  easeOfUse: sentimentOrRatingField,
  searchQuality: sentimentOrRatingField,
  trustResults: sentimentOrRatingField,
  wouldUseAgain: sentimentOrRatingField,
  likedMost: z.string().trim().max(4000).optional(),
  confusingPart: z.string().trim().max(4000).optional(),
  missingFeature: z.string().trim().max(4000).optional(),
  fixFirst: z.string().trim().max(4000).optional(),
  profession: z.string().trim().max(120).optional(),
  offersMobileService: z.boolean().optional(),
  privateStudio: z.boolean().optional(),
  wouldClaimProfile: z.boolean().optional(),
  licenseVerificationHelpful: ratingField,
  wouldAddPricing: z.boolean().optional(),
  wouldPayForEnhancedProfile: z.boolean().optional(),
  businessValue: z.string().trim().max(4000).optional(),
  concerns: z.string().trim().max(4000).optional(),
  appVersion: z.string().trim().max(40).optional(),
  platform: z.string().trim().max(40).optional()
});

export const feedbackSchema = baseSchema.strict();

export type FeedbackPayload = z.infer<typeof feedbackSchema>;

const FIELD_ALIASES: Record<string, keyof z.infer<typeof baseSchema>> = {
  type: "surveyType",
  searchResultsUseful: "searchQuality",
  resultsTrustworthy: "trustResults",
  confusing: "confusingPart",
  missing: "missingFeature"
};

const SURVEY_TYPE_ALIASES: Record<string, "consumer_beta" | "professional_beta"> = {
  beta: "consumer_beta",
  consumer: "consumer_beta",
  consumer_beta: "consumer_beta",
  pro: "professional_beta",
  professional: "professional_beta",
  professional_beta: "professional_beta"
};

function normalizeSurveyType(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const key = value.trim().toLowerCase();
  return SURVEY_TYPE_ALIASES[key] ?? value;
}

export function normalizeFeedbackPayload(input: unknown): unknown {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return input;
  }
  const source = input as Record<string, unknown>;
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    const canonical = FIELD_ALIASES[key] ?? key;
    if (canonical in normalized && normalized[canonical] !== undefined) {
      continue;
    }
    normalized[canonical] = canonical === "surveyType" ? normalizeSurveyType(value) : value;
  }
  return normalized;
}

export type StoredFeedback = FeedbackPayload & {
  id: string;
  receivedAt: string;
  ipHash?: string;
};

const FALLBACK_DIR = path.join(os.tmpdir(), "glowscout-feedback");
const MAX_MEMORY_RECORDS = 1000;
const memoryStore: StoredFeedback[] = [];
let resolvedDir: string | null = null;
let useMemoryOnly = false;

export function getFeedbackDir(): string {
  return process.env.FEEDBACK_DIR
    ? path.resolve(process.env.FEEDBACK_DIR)
    : FALLBACK_DIR;
}

function getFeedbackFile(dir: string): string {
  return path.join(dir, "feedback.jsonl");
}

async function tryDir(dir: string): Promise<boolean> {
  try {
    await fs.mkdir(dir, { recursive: true });
    await fs.access(dir, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

async function resolveWritableDir(): Promise<string | null> {
  if (resolvedDir) return resolvedDir;
  if (useMemoryOnly) return null;

  const candidates: string[] = [];
  if (process.env.FEEDBACK_DIR) {
    candidates.push(path.resolve(process.env.FEEDBACK_DIR));
  }
  candidates.push(FALLBACK_DIR);

  for (const dir of candidates) {
    if (await tryDir(dir)) {
      resolvedDir = dir;
      return dir;
    }
  }

  useMemoryOnly = true;
  console.warn("[feedback] no writable directory available; using in-memory fallback");
  return null;
}

function generateId(): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}-${random}`;
}

export async function appendFeedback(record: StoredFeedback): Promise<void> {
  const dir = await resolveWritableDir();
  if (!dir) {
    memoryStore.push(record);
    if (memoryStore.length > MAX_MEMORY_RECORDS) {
      memoryStore.splice(0, memoryStore.length - MAX_MEMORY_RECORDS);
    }
    return;
  }

  try {
    const line = JSON.stringify(record) + "\n";
    await fs.appendFile(getFeedbackFile(dir), line, "utf8");
  } catch (error) {
    console.warn("[feedback] file write failed, falling back to memory:", error);
    useMemoryOnly = true;
    resolvedDir = null;
    memoryStore.push(record);
    if (memoryStore.length > MAX_MEMORY_RECORDS) {
      memoryStore.splice(0, memoryStore.length - MAX_MEMORY_RECORDS);
    }
  }
}

export async function listFeedback(limit = 500): Promise<StoredFeedback[]> {
  const dir = await resolveWritableDir();
  if (!dir) {
    const start = Math.max(0, memoryStore.length - limit);
    return memoryStore.slice(start);
  }

  try {
    const contents = await fs.readFile(getFeedbackFile(dir), "utf8");
    const lines = contents.split("\n").filter((line) => line.trim().length > 0);
    const start = Math.max(0, lines.length - limit);
    return lines.slice(start).map((line) => JSON.parse(line) as StoredFeedback);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

export function buildStoredFeedback(payload: FeedbackPayload, ipHash?: string): StoredFeedback {
  return {
    ...payload,
    id: generateId(),
    receivedAt: new Date().toISOString(),
    ipHash
  };
}
