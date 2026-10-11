ROLE: You are a senior full-stack developer working in this existing Vite + React project.

GOAL:
1.  Create a mobile responsive app fed by this MCP server https://server.smithery.ai/vdineshk/sg-weather-data-mcp
2. There should be 2 serverless functions
    1. Api/health.js reports whether the MCP server answered, including the HTTP status code for checking without opening the app.  It must never print any key or part of it
3. On the screen, there should be 2 tabs each corresponding to a page
    1. Tab 1 is called Singapore, and it should contain 3 separate sections corresponding to the data retrieved from  Get_sg_psi, get_sg_weather_now, get_sg_forecast.  
    2. The sections should be drawn in this order.  Do not include unnecessary UI elements, copy, or functions in these sections.  Minimise clutter at all costs
    3. Tab 2 is called ASEAN, and it should contain climate information for ASEAN member states including average temperatures, rainfall, monsoon seasons, and natural hazards. Covers all 10 ASEAN countries.
    4. All 10 ASEAN countries should be listed.  There should be NO other clickable UI elements on the page.  Do not include unnecessary UI elements, copy, or functions in these sections.  Minimise clutter at all costs


OUTPUT: 
5.  api/health.js in the PROJECT ROOT, siblings of
     package.json and never inside src/. This is the form Vercel runs.
  6.  If this project has no server.ts, create one. This is the
     form the AI Studio preview runs. 
7.  Make sure package.json contains "type": "module", which Vercel requires for .js files
 in api/ outside a framework; otherwise name the two files api/bus.mjs and api/health.mjs.
 8.  AFTER the fetch, check response.ok before reading the body. On a
 non-2xx reply, return the upstream status and a one-line reason in your own JSON instead.
 

GUARDRAILS: 
9. Never write the key into any file, any comment, or the README. Never create a
 variable whose name starts with VITE_. 
10 .  Never print the key, or any part of it, in a
 response or a log. No new npm packages. No database, no login.

CONTEXT: 
11.Deployed on Vercel from GitHub.  The key lives only in environment variables
12. Create a context.md file in the project root. Whenever new context is provided, automatically write it into context.md. For every new line chunk of context added into context.md, prefix it with the date added.
13. Create an error_log.txt file in the project root. Whenever there are any errors, automatically write them into error_log.txt.


