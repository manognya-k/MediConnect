export type AiMode     = 'general' | 'symptom' | 'report' | 'booking';
export type MessageRole = 'user' | 'assistant';

export interface AiMessage {
  id: string;
  role: MessageRole;
  content: string;       // may contain HTML for AI bubbles
  timestamp: Date;
  isError?: boolean;
}

export interface ConversationTurn {
  role: MessageRole;
  content: string;       // plain text — sent to API
}

export interface PatientAiContext {
  patientName: string;
  patientId: string;
  age: number;
  gender: string;
  bloodGroup: string;
  conditions: string[];
  prescriptions: string[];
  labFlags: string[];
  nextAppointment: string;
}

export interface ModeOption {
  id: AiMode;
  label: string;
  subLabel: string;
}

export interface ContextItem {
  dot: string;
  text: string;
}
