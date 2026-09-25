// src/lib/server-db.ts — PostgreSQL driver for Vercel + Neon/Supabase/Turso
// Replaces node:sqlite version. Same API: safeGetDb(), initSchema()

import { Pool, PoolConfig, QueryResultRow, PoolClient } from 'pg';

// Lazy singleton pool (serverless-friendly)
let pool: Pool | null = null;

export function getPool(): Pool | null {
  if (pool) return pool;
  
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  
  const config: PoolConfig = {
    connectionString: url,
    max: 3,
    idleTimeoutMillis: 20000,
    connectionTimeoutMillis: 10000,
    // Neon/Supabase require SSL
    ssl: url.includes('supabase.co') || url.includes('neon.tech') 
      ? { rejectUnauthorized: false } 
      : false,
  };
  
  pool = new Pool(config);
  
  // Handle pool errors (don't crash the function)
  pool.on('error', (err) => {
    console.error('[db] pool error:', err.message);
  });
  
  return pool;
}

// Compatibility alias for existing API routes
export const safeGetDb = getPool;

// Initialize schema (run once per cold start, or via separate script)
let schemaInited = false;

export async function initSchema(): Promise<void> {
  if (schemaInited) return;
  const p = getPool();
  if (!p) return;
  
  const client = await p.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id        TEXT PRIMARY KEY,
        ts        TIMESTAMPTZ NOT NULL,
        session   TEXT NOT NULL,
        event     TEXT NOT NULL,
        path      TEXT,
        lang      TEXT,
        device    TEXT,
        referrer  TEXT,
        ua        TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_analytics_ts 
        ON analytics_events (ts DESC);
      CREATE INDEX IF NOT EXISTS idx_analytics_session 
        ON analytics_events (session);
      CREATE INDEX IF NOT EXISTS idx_analytics_event 
        ON analytics_events (event);
      
      CREATE TABLE IF NOT EXISTS relay_snapshots (
        id          BIGSERIAL PRIMARY KEY,
        ts          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        payload     JSONB NOT NULL,
        sent_json   JSONB
      );
      
      CREATE INDEX IF NOT EXISTS idx_relay_ts 
        ON relay_snapshots (ts DESC);
    `);
    schemaInited = true;
  } finally {
    client.release();
  }
}

// Helper: run a query with auto-init
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<{ rows: T[]; rowCount: number }> {
  await initSchema();
  const p = getPool();
  if (!p) throw new Error('DATABASE_URL not configured');
  const result = await p.query<T>(text, params);
  return { rows: result.rows, rowCount: result.rowCount ?? 0 };
}

// Helper: run in transaction
export async function transaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  await initSchema();
  const p = getPool();
  if (!p) throw new Error('DATABASE_URL not configured');
  
  const client = await p.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// Graceful shutdown (for local dev / non-serverless)
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    schemaInited = false;
  }
}