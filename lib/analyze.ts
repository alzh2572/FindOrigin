import { findSourcesWithAi } from "@/lib/ai";
import { MIN_INPUT_LENGTH } from "@/lib/config";
import {
  parseUserInput,
  validateTextLength,
} from "@/lib/parser/input";
import type { RankingResult } from "@/lib/types";

export async function analyzeText(rawText: string): Promise<RankingResult> {
  const parsed = await parseUserInput(rawText);
  validateTextLength(parsed.text, MIN_INPUT_LENGTH);
  return findSourcesWithAi(parsed.text);
}
