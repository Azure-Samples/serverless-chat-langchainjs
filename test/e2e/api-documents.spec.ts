import { test, expect } from '@playwright/test';

test.describe('Documents API', () => {
  const API_BASE_URL = 'http://localhost:7071/api';

  test('should upload a PDF document successfully', async ({ request }) => {
    // Create a small test PDF file content (this is a minimal PDF structure)
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
        '>>',
        'endobj',
        'xref',
        '0 4',
        '0000000000 65535 f ',
        '0000000009 00000 n ',
        '0000000058 00000 n ',
        '0000000115 00000 n ',
        'trailer',
        '<<',
        '/Size 4',
        '/Root 1 0 R',
        '>>',
        'startxref',
        '174',
        '%%EOF',
      ].join('\n'),
    );

    // Upload the test PDF
    const formData = new FormData();
    const file = new File([testPdfContent], 'test-document.pdf', { type: 'application/pdf' });
    formData.append('file', file);

    const response = await request.post(`${API_BASE_URL}/documents`, {
      multipart: {
        file: {
          name: 'test-document.pdf',
          mimeType: 'application/pdf',
          buffer: testPdfContent,
        },
      },
    });

    expect(response.status()).toBe(200);
    const responseBody = await response.json();
    expect(responseBody).toHaveProperty('message');
    expect(responseBody.message).toContain('uploaded successfully');
  });

  test('should retrieve an uploaded document', async ({ request }) => {
    // First upload a document
    const testPdfContent = Buffer.from(
      [
        '%PDF-1.4',
        '1 0 obj',
        '<<',
        '/Type /Catalog',
        '/Pages 2 0 R',
        '>>',
        'endobj',
        'xref',
        '0 2',
        '0000000000 65535 f ',
        '0000000009 00000 n ',
        'trailer',
        '<<',
        '/Size 2',
        '/Root 1 0 R',
        '>>',
        'startxref',
        '58',
        '%%EOF',
      ].join('\n'),
    );

    const fileName = 'test-retrieve.pdf';

    // Upload the document first
    await request.post(`${API_BASE_URL}/documents`, {
      multipart: {
        file: {
          name: fileName,
          mimeType: 'application/pdf',
          buffer: testPdfContent,
        },
      },
    });

    // Then try to retrieve it
    const getResponse = await request.get(`${API_BASE_URL}/documents/${fileName}`);

    expect(getResponse.status()).toBe(200);
    expect(getResponse.headers()['content-type']).toBe('application/pdf');

    const retrievedContent = await getResponse.body();
    expect(retrievedContent.length).toBeGreaterThan(0);
  });

  test('should return 404 for non-existent document', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/documents/non-existent-file.pdf`);
    expect(response.status()).toBe(404);
  });

  test('should handle invalid file upload', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/documents`, {
      data: {},
    });

    expect(response.status()).toBe(400);
    const responseBody = await response.json();
    expect(responseBody).toHaveProperty('error');
    expect(responseBody.error).toContain('file');
  });
});
