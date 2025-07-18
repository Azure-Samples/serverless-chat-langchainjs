import { test, expect } from '@playwright/test';

test.describe('Chat API', () => {
  const API_BASE_URL = 'http://localhost:7071/api';

  test('should handle chat request and return streaming response', async ({ request }) => {
    const chatRequest = {
      messages: [
        {
          role: 'user',
          content: 'Hello, can you help me with information about rental properties?',
        },
      ],
      context: {
        sessionId: 'test-session-' + Date.now(),
      },
    };

    const response = await request.post(`${API_BASE_URL}/chats/stream`, {
      data: chatRequest,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toBe('application/x-ndjson');
    expect(response.headers()['transfer-encoding']).toBe('chunked');

    // Read the streaming response
    const responseText = await response.text();
    expect(responseText.length).toBeGreaterThan(0);

    // Parse NDJSON response lines
    const lines = responseText.trim().split('\n');
    expect(lines.length).toBeGreaterThan(0);

    // Each line should be valid JSON
    for (const line of lines) {
      if (line.trim()) {
        const chunk = JSON.parse(line);
        expect(chunk).toHaveProperty('delta');
        expect(chunk.delta).toHaveProperty('content');
        expect(chunk.delta).toHaveProperty('role', 'assistant');
        expect(chunk).toHaveProperty('context');
        expect(chunk.context).toHaveProperty('sessionId');
      }
    }
  });

  test('should handle empty messages array', async ({ request }) => {
    const chatRequest = {
      messages: [],
      context: {
        sessionId: 'test-session-empty',
      },
    };

    const response = await request.post(`${API_BASE_URL}/chats/stream`, {
      data: chatRequest,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    expect(response.status()).toBe(400);
    const responseBody = await response.json();
    expect(responseBody).toHaveProperty('error');
    expect(responseBody.error).toContain('messages');
  });

  test('should handle missing message content', async ({ request }) => {
    const chatRequest = {
      messages: [
        {
          role: 'user',
          content: '',
        },
      ],
      context: {
        sessionId: 'test-session-no-content',
      },
    };

    const response = await request.post(`${API_BASE_URL}/chats/stream`, {
      data: chatRequest,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    expect(response.status()).toBe(400);
    const responseBody = await response.json();
    expect(responseBody).toHaveProperty('error');
    expect(responseBody.error).toContain('messages');
  });

  test('should generate session ID when not provided', async ({ request }) => {
    const chatRequest = {
      messages: [
        {
          role: 'user',
          content: 'Test message without session ID',
        },
      ],
    };

    const response = await request.post(`${API_BASE_URL}/chats/stream`, {
      data: chatRequest,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    expect(response.status()).toBe(200);

    const responseText = await response.text();
    const lines = responseText.trim().split('\n');

    if (lines.length > 0) {
      const firstChunk = JSON.parse(lines[0]);
      expect(firstChunk.context).toHaveProperty('sessionId');
      expect(firstChunk.context.sessionId).toBeTruthy();
      expect(firstChunk.context.sessionId.length).toBeGreaterThan(0);
    }
  });
});
