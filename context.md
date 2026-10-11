# Project Context

## Deployment & Environment
- Deployed on Vercel from GitHub (`https://github.com/WeiLieh/MCP-SERVER-SGSERVICES.git`).
- The MCP server is `https://server.smithery.ai/vdineshk/sg-weather-data-mcp`.
- The API key lives only in environment variables (`SMITHERY_API_KEY`).

## Context & Error Logging Rules
- Whenever the user gives any new context, automatically write it into `context.md` in the root directory.
- Whenever there are any errors, automatically write them into `error_log.txt` in the root directory.
- [2026-10-11] For every new line chunk of context added into `context.md`, prefix it with the date added.

## UI Display Context (Singapore Tab)
- [2026-10-11] Section 1 (PSI): Title is `PSI`, timestamp has `Last updated` prefix, `National` card and table column are omitted (displaying Central, North, South, East, West), and table header is `PSI Sub-Index`.
- [2026-10-11] Section 2 (Weather Now): Title is `Weather now (2 hourly) by area`, timestamp has `Last updated` prefix.
- [2026-10-11] Section 3 (Weather Forecast): Title is `Weather forecast for Singapore`, timestamp has `Last updated` prefix, and 4-Day Outlook dates are formatted as `Day (DD/MM)` across all 4 days.
- [2026-10-11] Mobile Layout & Geolocation/Postal Code Search: The app uses a mobile layout (`max-w-md` centered mobile container). At the top of the Singapore page above PSI, there is a search input with placeholder/help text `check PSI at your postal code` alongside a one-tap browser geolocation button. The search field accepts a 6-digit Singapore postal code and displays the resolved address below the search bar. Any unrecognised postal code format fails gracefully with the message `unrecognised postal code, defaulted to postal code nearest to you` and defaults to the nearest postal code and PSI region.
- [2026-10-11] 4-Day Forecast Look-and-Feel: Uses a horizontal list row layout with a `4-Day Forecast` header on the left and `Low / High` column label on the right. Each row displays the formatted date (`Day (DD/MM)`) on the left, a sky-blue weather icon with the forecast description and relative humidity/wind metadata in the middle, and `Low° / High°` (with bold high temperature) on the right, separated by subtle horizontal dividers.
- [2026-10-11] Weather Forecast for Singapore Card Layout: Removed the `Period` regional table section. Replaced the 24h outlook 4-box grid with the hero Singapore weather card layout displaying location (`Singapore, Singapore · 1.2897°, 103.8501°`), serif `Singapore` heading, large monospace temperature (`°C`), weather condition with icon, `Feels °C`, `H ° · L °`, and a 2x2 grid of soft rounded cards for `Humidity`, `Wind Speed`, `UV Index`, and `Pressure`.
- [2026-10-11] Weather Forecast for Singapore Card Refinements: Removed `Feels °C` line, removed `UV Index` and `Pressure` cards (retaining `Humidity` and `Wind Speed` side by side), and made the top Low and High temperature range format consistent with the 4-Day Forecast (`Low° / High°` with muted low temperature and bold high temperature).
- [2026-10-11] Weather now (2 hourly) by area Accordion & Placement: Moved the `Weather now (2 hourly) by area` section to appear after `Weather forecast for Singapore`, and collapsed it by default into an expandable/collapsible accordion.







