import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.mcp.local' });

// MCP client SDK
import { Client } from '@modelcontextprotocol/sdk/client';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio';

async function main() {
  const cwd = process.cwd();
  const cmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const args = ['run', 'mcp:supabase'];

  const child = spawn(cmd, args, {
    cwd,
    env: process.env,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  child.stderr.on('data', d => {
    process.stderr.write(String(d));
  });

  const transport = new StdioClientTransport(child.stdin!, child.stdout!);
  const client = new Client({ name: 'local-client', version: '0.1.0' }, { capabilities: { tools: {} } });
  await client.connect(transport);

  // List tools
  const tools = await client.listTools();
  console.log('Tools:', tools.map(t => t.name));

  // Call supabase.ping
  const result = await client.callTool('supabase.ping', {});
  console.log('Ping result:', result);

  child.kill();
}

main().catch(err => {
  console.error('[test-client] error:', err?.message || String(err));
  process.exit(1);
});
