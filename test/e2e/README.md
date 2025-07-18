# E2E Testing with Playwright

This directory contains end-to-end tests for the serverless chat application using Playwright.

## Test Structure

- `api-chat.spec.ts` - Tests for the chat streaming API endpoint
- `api-documents.spec.ts` - Tests for document upload and retrieval APIs
- `ui-chat.spec.ts` - Tests for the chat user interface
- `full-workflow.spec.ts` - Complete end-to-end workflow tests

## Running Tests

### Prerequisites

Make sure you have the development servers running:

```bash
# Terminal 1: Start the API (Azure Functions)
npm run start:api

# Terminal 2: Start the webapp
npm run start:webapp
```

### Run Tests

```bash
# Run all tests
npm test

# Run tests in headed mode (see browser)
npm run test:headed

# Run tests with UI mode
npm run test:ui

# Install Playwright browsers (required first time)
npx playwright install
```

### Test Configuration

The tests are configured to:

- Run against `http://localhost:8000` (webapp) and `http://localhost:7071` (API)
- Use Chromium, Firefox, and WebKit browsers
- Generate HTML reports
- Automatically start dev servers before running tests

## Test Coverage

### API Tests

- Document upload with PDF files
- Document retrieval by filename
- Chat streaming with proper session management
- Error handling for invalid requests

### UI Tests

- Chat interface display and interactions
- Message sending and receiving
- Session persistence
- Suggestion handling

### End-to-End Workflows

- Upload document → Chat about uploaded content
- Multi-document upload and retrieval
- Session continuity across multiple questions
