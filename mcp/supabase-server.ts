/*
  Local MCP server exposing minimal Supabase tools.
  Run: npm run mcp:supabase
*/

import dotenv from 'dotenv';
// Load base .env, then overlay .env.mcp.local if present
dotenv.config();
dotenv.config({ path: '.env.mcp.local' });
import { createClient, SupabaseClient } from '@supabase/supabase-js';
// MCP SDK imports (pin to dist/esm paths for TS/ts-node compatibility)
// eslint-disable-next-line import/no-unresolved
import { Server } from '@modelcontextprotocol/sdk/dist/esm/server/index.js';
// eslint-disable-next-line import/no-unresolved
import { StdioServerTransport } from '@modelcontextprotocol/sdk/dist/esm/server/stdio.js';

type FilterOp = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'is' | 'in';

type BasicFilter = {
  column: string;
  op: FilterOp;
  value: any;
};

function buildClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE;

  if (!url || !serviceRole) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE in env');
  }

  const client = createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-client-info': 'mcp-supabase/0.1.0' } },
  });
  return client;
}

function applyFilters<T>(q: any, filters?: BasicFilter[]) {
  if (!filters || !filters.length) return q;
  let query = q;
  for (const f of filters) {
    switch (f.op) {
      case 'eq':
        query = query.eq(f.column, f.value);
        break;
      case 'neq':
        query = query.neq(f.column, f.value);
        break;
      case 'gt':
        query = query.gt(f.column, f.value);
        break;
      case 'gte':
        query = query.gte(f.column, f.value);
        break;
      case 'lt':
        query = query.lt(f.column, f.value);
        break;
      case 'lte':
        query = query.lte(f.column, f.value);
        break;
      case 'like':
        query = query.like(f.column, f.value);
        break;
      case 'ilike':
        query = query.ilike(f.column, f.value);
        break;
      case 'is':
        query = query.is(f.column, f.value);
        break;
      case 'in':
        query = query.in(f.column, Array.isArray(f.value) ? f.value : [f.value]);
        break;
      default:
        throw new Error(`Unsupported filter op: ${f.op}`);
    }
  }
  return query;
}

const selectSchema: any = {
  type: 'object',
  required: ['table'],
  properties: {
    table: { type: 'string', description: 'Target table name (optionally schema.table)' },
    columns: { type: 'string', description: 'Comma-separated columns, default *' },
    filters: {
      type: 'array',
      items: {
        type: 'object',
        required: ['column', 'op', 'value'],
        properties: {
          column: { type: 'string' },
          op: { type: 'string', enum: ['eq','neq','gt','gte','lt','lte','like','ilike','is','in'] },
          value: {}
        }
      }
    },
    order: {
      type: 'object',
      properties: {
        column: { type: 'string' },
        ascending: { type: 'boolean', default: true },
        nullsFirst: { type: 'boolean', default: false }
      }
    },
    limit: { type: 'integer', minimum: 1, maximum: 10000, default: 100 },
    offset: { type: 'integer', minimum: 0, default: 0 }
  }
};

const modifySchema: any = {
  type: 'object',
  required: ['table', 'values'],
  properties: {
    table: { type: 'string' },
    values: { description: 'Row object or array of row objects', anyOf: [ { type: 'object' }, { type: 'array', items: { type: 'object' } } ] },
    filters: {
      type: 'array',
      items: {
        type: 'object',
        required: ['column', 'op', 'value'],
        properties: {
          column: { type: 'string' },
          op: { type: 'string', enum: ['eq','neq','gt','gte','lt','lte','like','ilike','is','in'] },
          value: {}
        }
      }
    },
    upsert: { type: 'boolean', default: false },
    onConflict: { type: 'string', description: 'Column(s) for upsert conflict' },
    returning: { type: 'string', enum: ['minimal', 'representation'], default: 'representation' }
  }
};

const deleteSchema: any = {
  type: 'object',
  required: ['table'],
  properties: {
    table: { type: 'string' },
    filters: {
      type: 'array',
      items: {
        type: 'object',
        required: ['column', 'op', 'value'],
        properties: {
          column: { type: 'string' },
          op: { type: 'string', enum: ['eq','neq','gt','gte','lt','lte','like','ilike','is','in'] },
          value: {}
        }
      }
    },
    returning: { type: 'string', enum: ['minimal', 'representation'], default: 'representation' }
  }
};

const rpcSchema: any = {
  type: 'object',
  required: ['fn'],
  properties: {
    fn: { type: 'string', description: 'Name of the Postgres function' },
    args: { type: 'object', description: 'Arguments object for the function' }
  }
};

async function main() {
  const projectId = process.env.SUPABASE_PROJECT_ID || '(unknown)';
  const supabase = buildClient();

  const server = new Server({ name: 'supabase-mcp', version: '1.0.0' }, {
    capabilities: { tools: {}, logging: {} },
    instructions: 'Supabase tools: supabase.ping/select/insert/update/delete/rpc'
  });

  type ToolDef = {
    name: string;
    description?: string;
    inputSchema: any;
    handler: (args: any) => Promise<any>;
  };

  const tools: ToolDef[] = [
    {
      name: 'supabase.ping',
      description: 'Validate connection and return project info (no secrets).',
      inputSchema: { type: 'object', properties: {} },
      handler: async () => ({ projectId, url: process.env.SUPABASE_URL, ok: true })
    },
    {
      name: 'supabase.select',
      description: 'Select rows with optional filters/order/limit',
      inputSchema: selectSchema,
      handler: async (input: any) => {
        const { table, columns = '*', filters, order, limit = 100, offset = 0 } = input;
        let q: any = supabase.from(table).select(columns, { count: 'exact' }).range(offset, offset + Math.max(0, limit - 1));
        q = applyFilters(q, filters);
        if (order?.column) {
          q = q.order(order.column, { ascending: order.ascending !== false, nullsFirst: !!order.nullsFirst });
        }
        const { data, error, count } = await q;
        if (error) throw new Error(error.message);
        return { count, data };
      }
    },
    {
      name: 'supabase.insert',
      description: 'Insert or upsert rows',
      inputSchema: modifySchema,
      handler: async (input: any) => {
        const { table, values, upsert = false, onConflict, returning = 'representation' } = input;
        let q: any = upsert
          ? supabase.from(table).upsert(values, { onConflict, ignoreDuplicates: false })
          : supabase.from(table).insert(values);
        if (returning === 'representation') q = q.select();
        const { data, error } = await q;
        if (error) throw new Error(error.message);
        return { data };
      }
    },
    {
      name: 'supabase.update',
      description: 'Update rows matching filters',
      inputSchema: modifySchema,
      handler: async (input: any) => {
        const { table, values, filters, returning = 'representation' } = input;
        let q: any = supabase.from(table).update(values);
        q = applyFilters(q, filters);
        if (returning === 'representation') q = q.select();
        const { data, error } = await q;
        if (error) throw new Error(error.message);
        return { data };
      }
    },
    {
      name: 'supabase.delete',
      description: 'Delete rows matching filters',
      inputSchema: deleteSchema,
      handler: async (input: any) => {
        const { table, filters, returning = 'representation' } = input;
        let q: any = supabase.from(table).delete();
        q = applyFilters(q, filters);
        if (returning === 'representation') q = q.select();
        const { data, error } = await q;
        if (error) throw new Error(error.message);
        return { data };
      }
    },
    {
      name: 'supabase.rpc',
      description: 'Call a Postgres function via RPC',
      inputSchema: rpcSchema,
      handler: async (input: any) => {
        const { fn, args = {} } = input;
        const { data, error } = await supabase.rpc(fn, args as any);
        if (error) throw new Error(error.message);
        return { data };
      }
    }
  ];

  // tools/list
  server.setRequestHandler({ method: 'tools/list', params: {} } as any, async () => {
    return {
      tools: tools.map(t => ({ name: t.name, description: t.description, inputSchema: t.inputSchema }))
    };
  });

  // tools/call
  server.setRequestHandler({ method: 'tools/call', params: { name: '', arguments: {} } } as any, async (request: any) => {
    const { name, arguments: args } = request.params;
    const tool = tools.find(t => t.name === name);
    if (!tool) {
      throw new Error(`Unknown tool: ${name}`);
    }
    const result = await tool.handler(args || {});
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  // Avoid printing secrets; only print message
  const msg = err?.message || String(err);
  console.error('[supabase-mcp] fatal:', msg);
  process.exit(1);
});
