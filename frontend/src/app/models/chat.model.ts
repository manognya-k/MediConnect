export type MessageRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  isError?: boolean;
}

export interface ConversationHistory {
  role: MessageRole;
  content: string;
}

export interface AiChatRequest {
  messages: ConversationHistory[];
  systemPrompt?: string;
}

export interface AiChatResponse {
  reply: string;
}

export interface SuggestionChip {
  label: string;
}
