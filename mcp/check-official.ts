import { spawn } from 'node:child_process';
import process from 'node:process';
import { Client } from '@modelcontextprotocol/sdk/client';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio';

async function main() {
  const projectRef = process.env.SUPABASE_PROJECT_REF || 'jhqnypyxrkwdrgutzttf';
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) {
    console.error('[mcp:official:check] SUPABASE_ACCESS_TOKEN is not set');
    process.exit(1);
  }

  const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const args = ['-y', '@supabase/mcp-server-supabase@latest', `--project-ref=${projectRef}`];

  const child = spawn(cmd, args, {
    env: { ...process.env, SUPABASE_ACCESS_TOKEN: token },
    stdio: ['pipe', 'pipe', 'pipe']
  });

  child.stderr.on('data', (d) => process.stderr.write(String(d)));

  const transport = new StdioClientTransport(child.stdin!, child.stdout!);
  const client = new Client({ name: 'mcp-official-check', version: '0.1.0' }, { capabilities: { tools: {} } });
  await client.connect(transport);

  const tools = await client.listTools();
  console.log('[mcp:official:check] tools:', tools.map(t => t.name));

  // Optional: call first tool with empty args if possible
  if (tools[0]) {
    try {
      const res = await client.callTool(tools[0].name, {} as any);
      console.log('[mcp:official:check] sample call:', tools[0].name, res);
    } catch (e: any) {
      console.log('[mcp:official:check] sample call failed (this can be normal):', e?.message || String(e));
    }
  }

  child.kill();
}

main().catch((e) => {
  console.error('[mcp:official:check] fatal:', e?.message || String(e));
  process.exit(1);
});

