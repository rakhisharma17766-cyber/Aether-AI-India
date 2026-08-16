export type ReasoningLevel = 'standard' | 'mid' | 'max';

export type MessageRole = 'user' | 'model' | 'system';

export interface Attachment {
  id: string;
  name: string;
  mimeType: string;
  base64Data: string; // pure base64 without data: prefix for API
  dataUrl: string; // with data: prefix for img/preview
  type: 'image' | 'document' | 'code' | 'audio';
  sizeBytes?: number;
}

export interface GroundingSource {
  title?: string;
  url: string;
  snippet?: string;
}

export interface GeneratedImagePayload {
  imageUrl: string;
  prompt: string;
  resolution?: '1K' | '2K' | '4K' | '512px';
  aspectRatio?: string;
  model: string;
}

export interface Message {
  id: string;
  conversationId?: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  attachments?: Attachment[];
  generatedImages?: GeneratedImagePayload[];
  generatedAudioUrl?: string;
  thinkingContent?: string;
  groundingSources?: GroundingSource[];
  latencyMs?: number;
  tokensUsed?: number;
  modelUsed?: string;
  isError?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  model: string;
  reasoningLevel: ReasoningLevel;
  systemInstruction?: string;
  personaId?: string;
  messages: Message[];
}

export interface Persona {
  id: string;
  name: string;
  title: string;
  description: string;
  systemInstruction: string;
  avatarIcon: string;
  color: string;
}

export interface ModelOption {
  id: string;
  name: string;
  badge: string;
  description: string;
  category: 'general' | 'reasoning' | 'fast' | 'multimodal' | 'image' | 'audio' | 'music';
  supportsThinking?: boolean;
  supportsVision?: boolean;
  supportsSearch?: boolean;
  supportsImageGen?: boolean;
  supportsAudio?: boolean;
  supportsMusic?: boolean;
  contextWindow?: string;
  isPaid?: boolean;
}

export interface UserPreferences {
  apiKey: string;
  selectedModel: string;
  reasoningLevel: ReasoningLevel;
  enableSearchGrounding: boolean;
  enableThinking: boolean;
  personaId: string;
  customSystemPrompt: string;
  ttsVoice: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
  ttsSpeed: number;
  imageResolution: '1K' | '2K' | '4K';
  imageAspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  soundEffects: boolean;
}

export interface FeedbackData {
  userId?: string;
  userEmail?: string;
  category: 'bug' | 'feature' | 'prompt_quality' | 'ui_ux' | 'other';
  rating: number;
  comment: string;
  createdAt: string;
}
