# AI Reports and Chat

AI features are optional and depend on the configured CLI/API integration.

## Strategy Reports

- Generated per strategy after refresh when AI is configured.
- Displayed on Strategy Detail.
- Can be regenerated manually.

Endpoints:

- `GET /api/strategies/{id}/report`
- `POST /api/strategies/{id}/report`

## Chat

- Portfolio-aware Q&A through `/api/chat`.
- Can include portfolio context depending on request options.

## Configuration

Important environment variables:

- `AI_CLI_COMMAND`
- `AI_CLI_MODEL`
- `AI_CLI_TIMEOUT_S`
- `AI_CLI_PROMPTS_DIR`
- `ANTHROPIC_API_KEY` for legacy/optional integrations

## UX Notes

- AI output should support, not replace, benchmark-relative validation.
