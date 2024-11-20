import { type HTMLTemplateResult, html, nothing } from 'lit';
import { AIChatMessage } from '@microsoft/ai-chat-protocol';

export type ParsedMessage = {
  html: HTMLTemplateResult;
  citations: string[];
  followupQuestions: string[];
  role: string;
  context?: object;
};

export function parseMessageIntoHtml(
  message: AIChatMessage,
  renderCitationReference: (citation: string, index: number) => HTMLTemplateResult,
): ParsedMessage {
  if (message.role === 'user') {
    return {
      html: html`${message.content}`,
      citations: [],
      followupQuestions: [],
      role: message.role,
      context: message.context,
    };
  }

  const citations: string[] = [];
  const followupQuestions: string[] = [];

  // Extract any follow-up questions that might be in the message
  const text = message.content
    .replaceAll(/<<([^>]+)>>/g, (_match, content: string) => {
      followupQuestions.push(content);
      return '';
    })
    .split('<<')[0] // Truncate incomplete questions
    .trim();

  // Extract any citations that might be in the message
  const parts = text.split(/\[([^\]]+)]/g);
  const result = html`${parts.map((part, index) => {
    if (index % 2 === 0) {
      return html`${part}`;
    }

    if (index + 1 < parts.length) {
      // Handle only completed citations
      let citationIndex = citations.indexOf(part);
      if (citationIndex === -1) {
        citations.push(part);
        citationIndex = citations.length;
      } else {
        citationIndex++;
      }

      return renderCitationReference(part, citationIndex);
    }

    return nothing;
  })}`;

  return {
    html: result,
    citations,
    followupQuestions,
    role: message.role,
    context: message.context,
  };
}
