import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";

const ratingField = z.coerce.number().min(0).max(5).optional();

const baseSchema = z.object({
  surveyType: z.enum(["consumer_beta", "professional_beta"]),
  name: z.string().trim().max(120).optional(),
  email: z.string().trim().email().max(200).optional(),
  canContact: z.boolean().optional(),
  testerRole: z.string().trim().max(120).optional(),
  overallRating: ratingField,
  easeOfUse: ratingField,
  searchQuality: ratingField,
  trustResults: ratingField,
  wouldUseAgain: ratingField,
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

export type StoredFeedback = FeedbackPayload & {
  id: string;
  receivedAt: string;
  ipHash?: string;
};

const DEFAULT_DIR = path.resolve(process.cwd(), "data");

export function getFeedbackDir(): string {
  return process.env.FEEDBACK_DIR
    ? path.resolve(process.env.FEEDBACK_DIR)
    : DEFAULT_DIR;
}

function getFeedbackFile(): string {
  return path.join(getFeedbackDir(), "feedback.jsonl");
}

async function ensureDir(): Promise<void> {
  await fs.mkdir(getFeedbackDir(), { recursive: true });
}

function generateId(): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}-${random}`;
}

export async function appendFeedback(record: StoredFeedback): Promise<void> {
  await ensureDir();
  const line = JSON.stringify(record) + "\n";
  await fs.appendFile(getFeedbackFile(), line, "utf8");
}

export async function listFeedback(limit = 500): Promise<StoredFeedback[]> {
  try {
    const contents = await fs.readFile(getFeedbackFile(), "utf8");
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
