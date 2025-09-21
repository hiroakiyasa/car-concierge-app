/*
  Local MCP server exposing minimal Supabase tools.
  Run: npm run mcp:supabase
*/

import dotenv from 'dotenv';
// Load base .env, then overlay .env.mcp.local if present
dotenv.config();
dotenv.config({ path: '.env.mcp.local' });
import { createClient, SupabaseClient } from '@supabase/supabase-js';
// MCP SDK imports (paths may vary by version); if you see import errors,
// install @modelcontextprotocol/sdk and adjust the import paths accordingly.
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { JSONSchema } from '@modelcontextprotocol/sdk/types.js';

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

const selectSchema: JSONSchema = {
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

const modifySchema: JSONSchema = {
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

const deleteSchema: JSONSchema = {
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

const rpcSchema: JSONSchema = {
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

  const server = new Server({
    name: 'supabase-mcp',
    version: '0.1.0'
  }, {
    capabilities: { tools: {} }
  });

  server.tool('supabase.ping', {
    description: 'Validate connection and return project info (no secrets).',
    inputSchema: { type: 'object', properties: {} }
  }, async () => {
    return {
      projectId,
      url: process.env.SUPABASE_URL,
      ok: true
    };
  });

  server.tool('supabase.select', {
    description: 'Select rows from a table with optional filters and ordering',
    inputSchema: selectSchema
  }, async (input: any) => {
    const { table, columns = '*', filters, order, limit = 100, offset = 0 } = input;
    let q: any = supabase.from(table).select(columns, { count: 'exact' }).range(offset, offset + Math.max(0, limit - 1));
    q = applyFilters(q, filters);
    if (order?.column) {
      q = q.order(order.column, { ascending: order.ascending !== false, nullsFirst: !!order.nullsFirst });
    }
    const { data, error, count } = await q;
    if (error) throw new Error(error.message);
    return { count, data };
  });

  server.tool('supabase.insert', {
    description: 'Insert rows into a table',
    inputSchema: modifySchema
  }, async (input: any) => {
    const { table, values, upsert = false, onConflict, returning = 'representation' } = input;
    let q: any = supabase.from(table).insert(values, { returning });
    if (upsert) q = q.upsert(values, { onConflict, ignoreDuplicates: false });
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return { data };
  });

  server.tool('supabase.update', {
    description: 'Update rows in a table matching filters',
    inputSchema: modifySchema
  }, async (input: any) => {
    const { table, values, filters, returning = 'representation' } = input;
    let q: any = supabase.from(table).update(values, { returning });
    q = applyFilters(q, filters);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return { data };
  });

  server.tool('supabase.delete', {
    description: 'Delete rows from a table matching filters',
    inputSchema: deleteSchema
  }, async (input: any) => {
    const { table, filters, returning = 'representation' } = input;
    let q: any = supabase.from(table).delete({ returning });
    q = applyFilters(q, filters);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return { data };
  });

  server.tool('supabase.rpc', {
    description: 'Call a Postgres function via RPC',
    inputSchema: rpcSchema
  }, async (input: any) => {
    const { fn, args = {} } = input;
    const { data, error } = await supabase.rpc(fn, args as any);
    if (error) throw new Error(error.message);
    return { data };
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
