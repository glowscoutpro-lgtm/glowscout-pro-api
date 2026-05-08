import type { StoredFeedback } from "./feedback.js";

const DEFAULT_RECIPIENT = "glowscoutpro@gmail.com";
const DEFAULT_FROM = "GlowScout Feedback <onboarding@resend.dev>";

function formatValue(value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (Array.isArray(value)) return value.length === 0 ? "—" : value.join(", ");
  return String(value);
}

export function buildFeedbackEmail(record: StoredFeedback): { subject: string; text: string } {
  const ratingLabel =
    record.overallRating !== undefined ? `${record.overallRating}/5` : "n/a";
  const subject = `[GlowScout] ${record.surveyType} feedback (rating ${ratingLabel})`;

  const selected: Array<[string, unknown]> = [
    ["Survey type", record.surveyType],
    ["Overall rating", record.overallRating],
    ["Ease of use", record.easeOfUse],
    ["Search quality", record.searchQuality],
    ["Trust results", record.trustResults],
    ["Would use again", record.wouldUseAgain],
    ["Profession", record.profession],
    ["Offers mobile service", record.offersMobileService],
    ["Private studio", record.privateStudio],
    ["Would claim profile", record.wouldClaimProfile],
    ["License verification helpful", record.licenseVerificationHelpful],
    ["Would add pricing", record.wouldAddPricing],
    ["Would pay for enhanced profile", record.wouldPayForEnhancedProfile],
    ["Current search methods", record.currentSearchMethods],
    ["Trust signals", record.trustSignals],
    ["Tester role", record.testerRole],
    ["Can contact", record.canContact],
    ["Name", record.name],
    ["Email", record.email],
    ["App version", record.appVersion],
    ["Platform", record.platform]
  ];

  const openEnded: Array<[string, unknown]> = [
    ["Liked most", record.likedMost],
    ["Confusing part", record.confusingPart],
    ["Missing feature", record.missingFeature],
    ["Fix first", record.fixFirst],
    ["Current search method (other)", record.currentSearchMethodOther],
    ["Trust signal (other)", record.trustSignalOther],
    ["Booking confidence factor", record.bookingConfidenceFactor],
    ["Business value", record.businessValue],
    ["Concerns", record.concerns]
  ];

  const lines: string[] = [];
  lines.push(`New ${record.surveyType} feedback received`);
  lines.push(`ID: ${record.id}`);
  lines.push(`Received: ${record.receivedAt}`);
  lines.push("");
  lines.push("Selected answers:");
  for (const [label, value] of selected) {
    if (value === undefined || value === null || value === "") continue;
    lines.push(`  ${label}: ${formatValue(value)}`);
  }
  const filledOpen = openEnded.filter(([, v]) => typeof v === "string" && v.trim().length > 0);
  if (filledOpen.length > 0) {
    lines.push("");
    lines.push("Open-ended responses:");
    for (const [label, value] of filledOpen) {
      lines.push(`  ${label}:`);
      lines.push(`    ${String(value).split("\n").join("\n    ")}`);
    }
  }

  return { subject, text: lines.join("\n") };
}

export type NotifyResult =
  | { status: "skipped"; reason: string }
  | { status: "sent" }
  | { status: "error"; error: string };

export async function notifyFeedbackEmail(record: StoredFeedback): Promise<NotifyResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { status: "skipped", reason: "RESEND_API_KEY not configured" };
  }

  const to = process.env.FEEDBACK_NOTIFY_EMAIL ?? DEFAULT_RECIPIENT;
  const from = process.env.FEEDBACK_NOTIFY_FROM ?? DEFAULT_FROM;
  const { subject, text } = buildFeedbackEmail(record);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ from, to, subject, text })
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return {
        status: "error",
        error: `Resend HTTP ${response.status}: ${body.slice(0, 200)}`
      };
    }
    return { status: "sent" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { status: "error", error: message };
  }
}
