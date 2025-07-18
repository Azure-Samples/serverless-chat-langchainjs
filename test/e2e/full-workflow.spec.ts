import { test, expect } from '@playwright/test';

test.describe('Full E2E Workflow', () => {
  const API_BASE_URL = 'http://localhost:7071/api';

  test('should upload document and then chat about it', async ({ page, request }) => {
    // Step 1: Upload a test document via API
    const testPdfContent = Buffer.from(
      [
        '%PDF-1.4',
        '1 0 obj',
        '<<',
        '/Type /Catalog',
        '/Pages 2 0 R',
        '>>',
        'endobj',
        '2 0 obj',
        '<<',
        '/Type /Pages',
        '/Kids [3 0 R]',
        '/Count 1',
        '>>',
        'endobj',
        '3 0 obj',
        '<<',
        '/Type /Page',
        '/Parent 2 0 R',
        '/MediaBox [0 0 612 792]',
        '/Contents 4 0 R',
        '>>',
        'endobj',
        '4 0 obj',
        '<<',
        '/Length 44',
        '>>',
        'stream',
        'BT',
        '/F1 12 Tf',
        '72 720 Td',
        '(Rental Property Information) Tj',
        'ET',
        'endstream',
        'endobj',
        'xref',
        '0 5',
        '0000000000 65535 f ',
        '0000000009 00000 n ',
        '0000000058 00000 n ',
        '0000000115 00000 n ',
        '0000000179 00000 n ',
        'trailer',
        '<<',
        '/Size 5',
        '/Root 1 0 R',
        '>>',
        'startxref',
        '267',
        '%%EOF',
      ].join('\n'),
    );

    const fileName = 'test-rental-info.pdf';

    // Upload the document
    const uploadResponse = await request.post(`${API_BASE_URL}/documents`, {
      multipart: {
        file: {
          name: fileName,
          mimeType: 'application/pdf',
          buffer: testPdfContent,
        },
      },
    });

    expect(uploadResponse.status()).toBe(200);
    const uploadResult = await uploadResponse.json();
    expect(uploadResult.message).toContain('uploaded successfully');

    // Step 2: Wait a moment for document to be indexed
    await page.waitForTimeout(3000);

    // Step 3: Navigate to chat UI
    await page.goto('/');

    // Wait for the chat component to load
    await page.waitForTimeout(2000);

    // Step 4: Ask a question about the uploaded document
    const chatInput = page.locator('azc-chat').locator('textarea');
    await expect(chatInput).toBeVisible({ timeout: 10_000 });

    const question = 'What information do you have about rental properties?';
    await chatInput.fill(question);

    const sendButton = page.locator('azc-chat').locator('button[type="submit"]');
    await sendButton.click();

    // Step 5: Verify the question appears
    await expect(page.locator('azc-chat').locator('.messages')).toContainText(question, { timeout: 10_000 });

    // Step 6: Wait for and verify response
    // Look for loading indicator first
    await expect(page.locator('azc-chat').locator('.loading')).toBeVisible({ timeout: 5000 });

    // Wait for response to complete (loading indicator should disappear)
    await expect(page.locator('azc-chat').locator('.loading')).not.toBeVisible({ timeout: 30_000 });

    // Check that we got some response from the assistant
    const assistantMessages = page.locator('azc-chat').locator('.message.assistant');
    await expect(assistantMessages).toHaveCount(1, { timeout: 10_000 });

    // Step 7: Verify citation link works (if citations are present)
    const citationLinks = page.locator('azc-chat').locator('a[href*="/api/documents/"]');
    if ((await citationLinks.count()) > 0) {
      const citationHref = await citationLinks.first().getAttribute('href');
      expect(citationHref).toContain('/api/documents/');

      // Test that citation link points to our uploaded document
      if (citationHref) {
        const citationResponse = await request.get(citationHref);
        expect(citationResponse.status()).toBe(200);
        expect(citationResponse.headers()['content-type']).toBe('application/pdf');
      }
    }
  });

  test('should handle multiple document uploads and retrieve specific documents', async ({ request }) => {
    const documents = [
      {
        name: 'rental-policy.pdf',
        content: 'Rental policy information about deposits and lease terms',
      },
      {
        name: 'maintenance-guide.pdf',
        content: 'Maintenance guide for tenants and property management',
      },
    ];

    // Upload multiple documents
    for (const document of documents) {
      const testPdfContent = Buffer.from(
        [
          '%PDF-1.4',
          '1 0 obj',
          '<<',
          '/Type /Catalog',
          '/Pages 2 0 R',
          '>>',
          'endobj',
          '2 0 obj',
          '<<',
          '/Type /Pages',
          '/Kids [3 0 R]',
          '/Count 1',
          '>>',
          'endobj',
          '3 0 obj',
          '<<',
          '/Type /Page',
          '/Parent 2 0 R',
          '/MediaBox [0 0 612 792]',
          '/Contents 4 0 R',
          '>>',
          'endobj',
          '4 0 obj',
          '<<',
          `/Length ${document.content.length + 20}`,
          '>>',
          'stream',
          'BT',
          '/F1 12 Tf',
          '72 720 Td',
          `(${document.content}) Tj`,
          'ET',
          'endstream',
          'endobj',
          'xref',
          '0 5',
          '0000000000 65535 f ',
          '0000000009 00000 n ',
          '0000000058 00000 n ',
          '0000000115 00000 n ',
          '0000000179 00000 n ',
          'trailer',
          '<<',
          '/Size 5',
          '/Root 1 0 R',
          '>>',
          'startxref',
          '300',
          '%%EOF',
        ].join('\n'),
      );

      const response = await request.post(`${API_BASE_URL}/documents`, {
        multipart: {
          file: {
            name: document.name,
            mimeType: 'application/pdf',
            buffer: testPdfContent,
          },
        },
      });

      expect(response.status()).toBe(200);
    }

    // Verify we can retrieve each document
    for (const document of documents) {
      const getResponse = await request.get(`${API_BASE_URL}/documents/${document.name}`);
      expect(getResponse.status()).toBe(200);
      expect(getResponse.headers()['content-type']).toBe('application/pdf');
    }
  });

  test('should maintain chat session across multiple questions', async ({ page }) => {
    // Navigate to chat
    await page.goto('/');
    await page.waitForTimeout(2000);

    const chatInput = page.locator('azc-chat').locator('textarea');
    const sendButton = page.locator('azc-chat').locator('button[type="submit"]');

    // Send first question
    await chatInput.fill('What are your rental policies?');
    await sendButton.click();

    // Wait for response
    await expect(page.locator('azc-chat').locator('.message.user')).toHaveCount(1, { timeout: 10_000 });
    await expect(page.locator('azc-chat').locator('.loading')).not.toBeVisible({ timeout: 30_000 });

    // Send follow-up question
    await chatInput.fill('What about maintenance requests?');
    await sendButton.click();

    // Verify both questions are in chat history
    await expect(page.locator('azc-chat').locator('.message.user')).toHaveCount(2, { timeout: 10_000 });
    await expect(page.locator('azc-chat').locator('.messages')).toContainText('rental policies');
    await expect(page.locator('azc-chat').locator('.messages')).toContainText('maintenance requests');
  });
});
