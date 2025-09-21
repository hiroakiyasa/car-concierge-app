/* Local MCP server for Supabase (CommonJS) */
const dotenv = require('dotenv');
dotenv.config();
dotenv.config({ path: '.env.mcp.local' });

const { createClient } = require('@supabase/supabase-js');
const { Server } = require('@modelcontextprotocol/sdk/server');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  ListToolsRequestSchema,
  ListToolsResultSchema,
  CallToolRequestSchema,
  CallToolResultSchema,
  LoggingMessageNotificationSchema,
} = require('@modelcontextprotocol/sdk/types.js');

function buildClient() {
  const url = process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !serviceRole) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE');
  return createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-client-info': 'mcp-supabase/1.0.0' } }
  });
}

function applyFilters(q, filters) {
  if (!filters || !filters.length) return q;
  let query = q;
  for (const f of filters) {
    switch (f.op) {
      case 'eq': query = query.eq(f.column, f.value); break;
      case 'neq': query = query.neq(f.column, f.value); break;
      case 'gt': query = query.gt(f.column, f.value); break;
      case 'gte': query = query.gte(f.column, f.value); break;
      case 'lt': query = query.lt(f.column, f.value); break;
      case 'lte': query = query.lte(f.column, f.value); break;
      case 'like': query = query.like(f.column, f.value); break;
      case 'ilike': query = query.ilike(f.column, f.value); break;
      case 'is': query = query.is(f.column, f.value); break;
      case 'in': query = query.in(f.column, Array.isArray(f.value) ? f.value : [f.value]); break;
      default: throw new Error('Unsupported filter op: ' + f.op);
    }
  }
  return query;
}

const selectSchema = {
  type: 'object', required: ['table'], properties: {
    table: { type: 'string' },
    columns: { type: 'string' },
    filters: { type: 'array', items: { type: 'object', required: ['column','op','value'], properties: { column: {type:'string'}, op: { type:'string', enum:['eq','neq','gt','gte','lt','lte','like','ilike','is','in']}, value: {} } } },
    order: { type: 'object', properties: { column: {type:'string'}, ascending: {type:'boolean', default:true}, nullsFirst: {type:'boolean', default:false} } },
    limit: { type: 'integer', minimum: 1, maximum: 10000, default: 100 },
    offset: { type: 'integer', minimum: 0, default: 0 }
  }
};

const modifySchema = {
  type: 'object', required: ['table','values'], properties: {
    table: { type: 'string' },
    values: { anyOf: [ { type: 'object' }, { type: 'array', items: { type: 'object' } } ] },
    filters: { type: 'array', items: { type: 'object', required: ['column','op','value'], properties: { column: {type:'string'}, op: { type:'string', enum:['eq','neq','gt','gte','lt','lte','like','ilike','is','in']}, value: {} } } },
    upsert: { type: 'boolean', default: false },
    onConflict: { type: 'string' },
    returning: { type: 'string', enum: ['minimal','representation'], default: 'representation' }
  }
};

const deleteSchema = {
  type: 'object', required: ['table'], properties: {
    table: { type: 'string' },
    filters: { type: 'array', items: { type: 'object', required: ['column','op','value'], properties: { column: {type:'string'}, op: { type:'string', enum:['eq','neq','gt','gte','lt','lte','like','ilike','is','in']}, value: {} } } },
    returning: { type: 'string', enum: ['minimal','representation'], default: 'representation' }
  }
};

const rpcSchema = { type: 'object', required: ['fn'], properties: { fn: { type: 'string' }, args: { type: 'object' } } };

async function main() {
  const projectId = process.env.SUPABASE_PROJECT_ID || '(unknown)';
  const supabase = buildClient();
  const server = new Server({ name: 'supabase-mcp', version: '1.0.0' }, { capabilities: { tools: {}, logging: {} } });

  const tools = [
    { name: 'supabase.ping', description: 'Validate connection', inputSchema: { type:'object', properties:{} }, handler: async () => ({ projectId, url: process.env.SUPABASE_URL, ok: true }) },
    { name: 'supabase.select', description: 'Select rows', inputSchema: selectSchema, handler: async (input) => {
        const { table, columns='*', filters, order, limit=100, offset=0 } = input;
        let q = supabase.from(table).select(columns, { count:'exact' }).range(offset, offset + Math.max(0, limit-1));
        q = applyFilters(q, filters);
        if (order && order.column) q = q.order(order.column, { ascending: order.ascending !== false, nullsFirst: !!order.nullsFirst });
        const { data, error, count } = await q; if (error) throw new Error(error.message); return { count, data };
      }
    },
    { name: 'supabase.insert', description: 'Insert/upsert rows', inputSchema: modifySchema, handler: async (input) => {
        const { table, values, upsert=false, onConflict, returning='representation' } = input;
        let q = upsert ? supabase.from(table).upsert(values, { onConflict, ignoreDuplicates:false }) : supabase.from(table).insert(values);
        if (returning === 'representation') q = q.select();
        const { data, error } = await q; if (error) throw new Error(error.message); return { data };
      }
    },
    { name: 'supabase.update', description: 'Update rows', inputSchema: modifySchema, handler: async (input) => {
        const { table, values, filters, returning='representation' } = input;
        let q = supabase.from(table).update(values);
        q = applyFilters(q, filters);
        if (returning === 'representation') q = q.select();
        const { data, error } = await q; if (error) throw new Error(error.message); return { data };
      }
    },
    { name: 'supabase.delete', description: 'Delete rows', inputSchema: deleteSchema, handler: async (input) => {
        const { table, filters, returning='representation' } = input;
        let q = supabase.from(table).delete();
        q = applyFilters(q, filters);
        if (returning === 'representation') q = q.select();
        const { data, error } = await q; if (error) throw new Error(error.message); return { data };
      }
    },
    { name: 'supabase.rpc', description: 'Call Postgres function', inputSchema: rpcSchema, handler: async (input) => {
        const { fn, args = {} } = input;
        const { data, error } = await supabase.rpc(fn, args);
        if (error) throw new Error(error.message); return { data };
      }
    }
  ];

  // tools/list
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map(t => ({ name: t.name, description: t.description, inputSchema: t.inputSchema }))
  }), ListToolsResultSchema);

  // tools/call
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const tool = tools.find(t => t.name === name);
    if (!tool) throw new Error(`Unknown tool: ${name}`);
    const result = await tool.handler(args || {});
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }, CallToolResultSchema);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(err => {
  console.error('[supabase-mcp] fatal:', err && err.message ? err.message : String(err));
  process.exit(1);
});
