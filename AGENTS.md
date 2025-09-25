# Serverless AI Chat with RAG using LangChain.js

Serverless TypeScript Retrieval-Augmented Generation (RAG) chat sample: Lit + Vite frontend (Azure Static Web Apps), Azure Functions backend with LangChain.js, Cosmos DB vector store, Blob Storage for source documents, optional Azure OpenAI or local Ollama models. Provisioned by Bicep & Azure Developer CLI (azd) with CI/CD. Focus: reliability, citations, low cost, clear extension points.

> **MISSION**: Provide a maintained Azure reference implementation of a serverless LangChain.js RAG chat that showcases best practices (citations, reliability, tooling) while staying lean and easy to extend.

## Overview

- End-user asks questions in a web UI; backend performs RAG: embed/query vector store (Cosmos DB or in‑memory/faiss fallback), assemble context, invoke LLM (Azure OpenAI or local Ollama), stream answer + citations to client.
- Documents (PDF/others) uploaded -> chunked & embedded -> stored for retrieval; blob storage keeps originals.
- Architecture (high level):
  - Frontend: `packages/webapp` (Lit components, served locally by Vite, deployed via Static Web Apps)
  - Backend: `packages/api` (Azure Functions isolated worker w/ LangChain.js chains)
  - Data: Cosmos DB (vector and chat history), Blob Storage (docs)
  - Infra: `infra/` Bicep templates composed by `infra/main.bicep`, parameters in `infra/main.parameters.json`
  - Scripts: ingestion helper in `scripts/upload-documents.js`

## Key Technologies and Frameworks

- TypeScript (monorepo via npm workspaces)
- Azure Functions (Node.js runtime v4) + LangChain.js core/community providers
- Lit + Vite for frontend UI
- Azure Cosmos DB (vector store via @langchain/azure-cosmosdb) / faiss-node (local alt)
- Azure Blob Storage (document source persistence)
- Azure OpenAI / Ollama (LLM + embeddings)
- Infrastructure as Code: Bicep + Azure Developer CLI (azd)
- CI/CD: GitHub Actions

## Constraints and Requirements

- Maintain simplicity; avoid premature abstractions or heavy frameworks
- No proprietary dependencies beyond Azure services (prefer OSS + Azure)

## Development Workflow

Root scripts (run from repository root):

- `npm run start` – Launch webapp (`:8000`) and API Functions host (`:7071`) concurrently
- `npm run build` – Build all workspaces
- `npm run clean` – Clean build outputs
- `npm run upload:docs` – Invoke ingestion script against local Functions host

Backend (`packages/api`):

- `npm run start` – Clean, build, start Functions host with TS watch
- `npm run build` – TypeScript compile to `dist`

Frontend (`packages/webapp`):

- `npm run dev` – Vite dev server (port 8000)
- `npm run build` – Production build

## Coding Guidelines

- TypeScript strict-ish (reduced lint rules via XO config) balancing clarity for newcomers
- Prettier enforced via lint-staged pre-commit hook
- Favor explicit imports; keep functions small & composable

## Security Considerations

- Secrets managed via Azure (Function App / Static Web App settings) – Avoid committing secrets
- Test artifacts (traces, screenshots) must not include secrets → scrub logs & env variable exposure
- Principle of least privilege in Bicep role assignments

## Extension Points

- Swappable embeddings & LLM providers (Azure OpenAI ↔ Ollama) with minimal config changes

## Environment Variables (High-Level)

- Azure OpenAI endpoints
- Cosmos DB connection / database name
- Blob storage account & container
