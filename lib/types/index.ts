export interface TelegramUser {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  username?: string;
}

export interface TelegramChat {
  id: number;
  type: "private" | "group" | "supergroup" | "channel";
  title?: string;
  username?: string;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

export interface SendMessageResult {
  ok: boolean;
  result?: {
    message_id: number;
  };
  description?: string;
}

export interface ParsedInput {
  kind: "text" | "telegram_post";
  raw: string;
  text: string;
  sourceUrl?: string;
}

export interface ExtractedEntities {
  claims: string[];
  dates: string[];
  numbers: string[];
  names: string[];
  links: string[];
}

export interface SearchProfile {
  queries: string[];
  dateFilter?: string;
}

export interface EntityExtractionResult {
  entities: ExtractedEntities;
  searchProfile: SearchProfile;
}

export type ConfidenceLevel = "high" | "medium" | "low";

export interface RankedSource {
  url: string;
  title: string;
  confidence: ConfidenceLevel;
  confidenceScore: number;
  reason: string;
  isPrimary?: boolean;
}

export interface RankingResult {
  sources: RankedSource[];
  summary: string;
}

export interface ProcessResult {
  success: boolean;
  message: string;
  sources?: RankedSource[];
}
