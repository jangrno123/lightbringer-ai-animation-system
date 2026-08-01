# Self-hosted LIGHTBRINGER demo

[English](SELF_HOSTED_DEMO.md) · [한국어](SELF_HOSTED_DEMO.ko.md)

The repository includes a clean-room public demo. It demonstrates the workflow without exposing the commercial application, client projects, production media, or account system.

## Run locally

Requirements: Node.js 20 or newer.

```bash
npm start
```

Open `http://localhost:4173`. The default `mock` provider is deterministic and never calls an external service.

## Connect your own LLM API

Copy `.env.example` into the secret environment settings of the server or hosting provider. Do not place a real key in Git, browser code, a public issue, or a screenshot.

Supported protocols:

- `mock`: deterministic public demo, no cost;
- `openai-compatible`: a server implementing `/v1/chat/completions`;
- `anthropic`: the Anthropic Messages API.

Example server configuration:

```text
LIGHTBRINGER_PROVIDER=anthropic
LIGHTBRINGER_EXTERNAL_API_ENABLED=true
LIGHTBRINGER_API_BASE_URL=https://api.anthropic.com
LIGHTBRINGER_API_KEY=stored-in-host-secret-manager
LIGHTBRINGER_MODEL=your-model-name
```

The browser receives only provider name, readiness, model name, and request limits. The API key and base URL are never included in the public health response.

## Guardrails

- external calls require the explicit `LIGHTBRINGER_EXTERNAL_API_ENABLED=true` switch;
- screenplay input and provider output are capped;
- requests time out;
- malformed JSON is rejected;
- failures are not retried automatically, preventing accidental duplicate charges;
- every response receives a request ID;
- render generation remains a zero-cost dummy queue in the public demo.

## API contract

### `GET /api/health`

Returns the public provider status. It never returns credentials or a private base URL.

### `POST /api/v1/screenplay/analyze`

```json
{
  "screenplay": "INT. OBSERVATION DECK...",
  "language": "en"
}
```

The normalized response contains `segments`, `shots`, and `continuity`. The UI uses the same result regardless of provider protocol.

## Container deployment

```bash
docker build -t lightbringer-demo .
docker run --rm -p 4173:4173 --env-file .env lightbringer-demo
```

Any platform that runs the included Dockerfile and provides secret environment variables can host the demo. Use HTTPS at the edge and never enable an external provider on an untrusted fork that shares your key.

## What this demo intentionally omits

- authentication, invitations, and production authorization;
- production database and object storage;
- client and unreleased project data;
- actual image or video generation;
- commercial LIGHTBRINGER source code.

Those boundaries keep the public demo useful without turning it into the production service.
