# Project Context

## Deployment & Environment
- Deployed on Vercel from GitHub (`https://github.com/WeiLieh/MCP-SERVER-SGSERVICES.git`).
- The MCP server is `https://server.smithery.ai/vdineshk/sg-weather-data-mcp`.
- The API key lives only in environment variables (`SMITHERY_API_KEY`).

## Context & Error Logging Rules
- Whenever the user gives any new context, automatically write it into `context.md` in the root directory.
- Whenever there are any errors, automatically write them into `error_log.txt` in the root directory.
