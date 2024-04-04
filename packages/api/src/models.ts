export type Message = {
  content: string;
  role: string;
};

export type ChatRequest = {
  messages: Message[];
  stream: boolean;
};

export type ChatResponseChunk = {
  choices: Array<{
    index: number;
    delta: Message;
  }>;
};
