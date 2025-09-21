Supabase MCP Server (local)

Overview
- Exposes a small set of Supabase tools over MCP so an AI client (Cursor/Claude Desktop/Codex) can list/select/insert/update/delete rows and call RPCs against your Supabase project.
- Runs locally via stdio; secrets stay on your machine and are NOT committed.

Install
- Add environment variables (do NOT commit real secrets):
  - Copy `mcp/.env.example` to `.env.mcp.local` and fill in values.
- Install dependencies:
  - npm i (from repo root)

Run (as a standalone process)
- npm run mcp:supabase

Configure in clients
- Cursor (Settings → Labs → MCP Servers → Add):
  - Name: Supabase
  - Command: npm
  - Args: ["run", "mcp:supabase"]
  - Working directory: this repo root
  - Env: leave empty (the script reads `.env.mcp.local`)
- Claude Desktop: Add to `~/.claude/mcp/config.json`:
  {
    "mcpServers": {
      "supabase": {
        "command": "npm",
        "args": ["run", "mcp:supabase"],
        "cwd": "/absolute/path/to/this/repo"
      }
    }
  }

Provided tools
- supabase.select: Read rows with basic filters/order/limit
- supabase.insert: Insert one or many rows
- supabase.update: Update rows by filters
- supabase.delete: Delete rows by filters
- supabase.rpc: Call stored procedures
- supabase.ping: Quick connectivity check

Safety
- Uses `SUPABASE_SERVICE_ROLE` only inside this local MCP server; never ship this key to the mobile app.
- `.env*` files are in `.gitignore` here. Keep real tokens out of version control.

Notes
- This server uses `@supabase/supabase-js` and requires Node 18+ (global fetch).
- Schema names: Default is `public`. If you use a different schema, pass it in parameters.

