export type Message = {
  content: string;
  role: string;
};

export type ChatDebugDetails = {
  thoughts: string;
  dataPoints: string[];
};

export type ChatMessageContext = Record<string, any> & {
  thoughts?: string;
  data_points?: string[];
};

export type ChatMessage = Message & {
  context?: ChatMessageContext;
};

export type ChatResponse = {
  choices: Array<{
    index: number;
    message: ChatMessage;
  }>;
  error?: string;
};

export type ChatResponseChunk = {
  choices: Array<{
    index: number;
    delta: Partial<ChatMessage>;
  }>;
  error?: string;
};

export type ChatRequestOptions = {
  messages: Message[];
  stream: boolean;
  chunkIntervalMs: number;
  apiUrl: string;
} & ChatRequestOverrides;

export type ChatRequestOverrides = {
  top?: number;
  temperature?: number;
};
