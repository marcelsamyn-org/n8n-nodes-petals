# n8n-nodes-petals

An [n8n](https://n8n.io) community node that ingests content into your
[Petals](https://petals.chat) assistant memory.

## Installation

In n8n: **Settings → Community Nodes → Install**, then enter `n8n-nodes-petals`.

## Credentials

Create a **Petals API** credential with an API key from your Petals account
(Settings → API Keys). The key authenticates as you; the proxy derives your user
from it. Self-hosters can override the **Base URL**.

## Operations

The node maps each operation to one Petals proxy endpoint:

| Resource | Operation | Endpoint |
|---|---|---|
| Document | Ingest | `POST /api/memory/ingest/document` |
| File | Ingest | `POST /api/memory/ingest/file` |
| Transcript | Ingest | `POST /api/memory/ingest/transcript` |
| Metric | Record Observation | `POST /api/memory/metrics/observations` |
| Metric | Record Observations (Bulk) | `POST /api/memory/metrics/observations/bulk` |

## Keeping this node in tandem with the API

This table is the source of truth for the **proxy-endpoint ↔ node-operation**
pairing. When the Petals proxy gains a new end-user-relevant ingestion or metrics
capability (because the underlying Memory SDK/MCP did), add the matching
Resource/Operation here in the same change. The capability chain is **Memory
SDK/MCP → Petals proxy → this node**.

## License

MIT
