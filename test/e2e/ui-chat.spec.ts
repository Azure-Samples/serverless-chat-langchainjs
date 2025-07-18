import { test, expect } from '@playwright/test';

test.describe('Chat UI E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display chat interface with initial elements', async ({ page }) => {
    // Check for main navigation
    await expect(page.locator('nav')).toContainText('AI Chat with Enterprise Data');

    // Check for chat components
    await expect(page.locator('azc-chat')).toBeVisible();
    await expect(page.locator('azc-history')).toBeVisible();

    // Check for chat input
    await expect(page.locator('azc-chat').locator('.chat-input-container')).toBeVisible();
  });

  test('should display default prompt suggestions', async ({ page }) => {
    // Wait for the component to load
    await page.waitForTimeout(1000);

    // Check for prompt suggestions
    const suggestions = page.locator('azc-chat').locator('.suggestion');

    // Should have some default suggestions
    await expect(suggestions.first()).toBeVisible({ timeout: 10_000 });

    // Check for expected suggestion content
    await expect(page.locator('azc-chat')).toContainText('Ask anything or try an example');
  });

  test('should allow user to type and send a message', async ({ page }) => {
    // Wait for component to be ready
    await page.waitForTimeout(1000);

    // Find the chat input
    const chatInput = page.locator('azc-chat').locator('textarea');
    await expect(chatInput).toBeVisible({ timeout: 10_000 });

    // Type a message
    const testMessage = 'Hello, can you help me with rental information?';
    await chatInput.fill(testMessage);

    // Send the message
    const sendButton = page.locator('azc-chat').locator('button[type="submit"]');
    await sendButton.click();

    // Check that the message appears in the chat
    await expect(page.locator('azc-chat').locator('.messages')).toContainText(testMessage, { timeout: 10_000 });

    // Check for loading indicator
    await expect(page.locator('azc-chat').locator('.loading')).toBeVisible({ timeout: 5000 });
  });

  test('should handle suggestion click', async ({ page }) => {
    // Wait for component to load
    await page.waitForTimeout(1000);

    // Find and click the first suggestion
    const firstSuggestion = page.locator('azc-chat').locator('.suggestion').first();
    await expect(firstSuggestion).toBeVisible({ timeout: 10_000 });

    const suggestionText = await firstSuggestion.textContent();
    await firstSuggestion.click();

    // Verify the suggestion text appears in the chat
    await expect(page.locator('azc-chat').locator('.messages')).toContainText(suggestionText || '', {
      timeout: 10_000,
    });
  });

  test('should display chat history', async ({ page }) => {
    // Check that history component exists
    await expect(page.locator('azc-history')).toBeVisible();

    // Send a message to create history
    await page.waitForTimeout(1000);
    const chatInput = page.locator('azc-chat').locator('textarea');
    await expect(chatInput).toBeVisible({ timeout: 10_000 });

    await chatInput.fill('Test message for history');
    const sendButton = page.locator('azc-chat').locator('button[type="submit"]');
    await sendButton.click();

    // Wait for response and check history updates
    await page.waitForTimeout(3000);

    // History should show the conversation
    await expect(page.locator('azc-history')).toBeVisible();
  });

  test('should generate unique user ID and persist in localStorage', async ({ page }) => {
    // Check that a user ID is generated and stored
    const userId = await page.evaluate(() => localStorage.getItem('userId'));
    expect(userId).toBeTruthy();
    expect(userId).toMatch(/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i);

    // Refresh the page and check that the same user ID is used
    await page.reload();
    const sameUserId = await page.evaluate(() => localStorage.getItem('userId'));
    expect(sameUserId).toBe(userId);
  });

  test('should handle new chat functionality', async ({ page }) => {
    // Send a message first
    await page.waitForTimeout(1000);
    const chatInput = page.locator('azc-chat').locator('textarea');
    await expect(chatInput).toBeVisible({ timeout: 10_000 });

    await chatInput.fill('First message');
    const sendButton = page.locator('azc-chat').locator('button[type="submit"]');
    await sendButton.click();

    // Wait for message to appear
    await expect(page.locator('azc-chat').locator('.messages')).toContainText('First message', { timeout: 10_000 });

    // Look for new chat button and click it
    const newChatButton = page
      .locator('azc-chat')
      .locator('button')
      .filter({ hasText: /new chat/i });
    if ((await newChatButton.count()) > 0) {
      await newChatButton.click();

      // Check that messages are cleared
      await page.waitForTimeout(1000);
      const messagesCount = await page.locator('azc-chat').locator('.message').count();
      expect(messagesCount).toBe(0);
    }
  });
});
