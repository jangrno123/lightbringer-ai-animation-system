# External AI provider setup

LIGHTBRINGER separates screenplay analysis from video generation through server-side adapters. API keys never enter browser storage and must be stored only as encrypted deployment secrets.

## Recommended routing

- Use a balanced Claude model or a cost-efficient OpenAI model for routine segment and shot conversion.
- Route only ambiguous direction and final-review passages to a top reasoning model such as GPT-5.6 Sol or the strongest Claude model available to your account.
- Use a BytePlus or Volcengine Ark Seedance endpoint for asynchronous storyboard and video jobs.

Exact model IDs vary by account and region. LIGHTBRINGER therefore reads them from environment variables instead of hard-coding marketing names.

## LLM adapters

```dotenv
LIGHTBRINGER_LLM_EXTERNAL_ENABLED=true
LIGHTBRINGER_LLM_PROVIDER=anthropic

ANTHROPIC_API_KEY=your-secret
ANTHROPIC_MODEL=your-claude-model-id

OPENAI_API_KEY=your-secret
OPENAI_MODEL=your-openai-model-id
```

When both are ready, the UI lets the operator select Claude or OpenAI per screenplay request. OpenAI uses Responses API strict JSON Schema output; Anthropic uses Messages API structured output through `output_config.format`.

## Seedance adapter

```dotenv
LIGHTBRINGER_VIDEO_EXTERNAL_ENABLED=true
LIGHTBRINGER_VIDEO_PROVIDER=byteplus
BYTEPLUS_API_KEY=your-secret
BYTEPLUS_SEEDANCE_MODEL=your-endpoint-or-model-id
BYTEPLUS_API_BASE_URL=https://ark.ap-southeast.bytepluses.com/api/v3
```

Volcengine Ark is also supported through `LIGHTBRINGER_VIDEO_PROVIDER=volcengine` and the `VOLCENGINE_*` variables in `.env.example`.

The render adapter creates one asynchronous task per shot and preserves the returned task ID. External render creation is rejected unless `confirmedCost` is explicitly true. Automatic retries stay disabled so failed shots can be retried without duplicating successful paid jobs.

## Verify

`GET /api/health` reports each LLM and video adapter without returning secrets. Use `POST /api/v1/screenplay/analyze`, `POST /api/v1/render/jobs`, and `GET /api/v1/render/jobs/{id}?provider=byteplus` for the production flow.

Keep the public demo in `mock` mode. Run real paid providers only behind authentication and role-based access.

See the official [OpenAI model guide](https://developers.openai.com/api/docs/models), [OpenAI Responses API](https://platform.openai.com/docs/api-reference/responses), [Anthropic Messages API](https://platform.claude.com/docs/en/api/messages/create), [Anthropic structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs), [BytePlus task creation](https://docs.byteplus.com/en/docs/modelark/1520757), and [task retrieval](https://docs.byteplus.com/en/docs/ModelArk/1521309).
