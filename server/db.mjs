import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const migrationsDir = fileURLToPath(new URL('../migrations/', import.meta.url));
const sqlForPg = sql => { let n = 0; return sql.replace(/\?/g, () => `$${++n}`); };
export async function openDatabase({ dataDir, databaseUrl = process.env.DATABASE_URL } = {}) {
  let db;
  if (databaseUrl) {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: databaseUrl, max: 8, connectionTimeoutMillis: 10000, idleTimeoutMillis: 30000,
      ...(process.env.PGSSL === 'true' ? { ssl: { rejectUnauthorized: true } } : {}) });
    const adapter = client => ({
      kind: 'postgres',
      all: async (sql, params = []) => (await client.query(sqlForPg(sql), params)).rows,
      get: async (sql, params = []) => (await client.query(sqlForPg(sql), params)).rows[0],
      run: async (sql, params = []) => ({ changes: (await client.query(sqlForPg(sql), params)).rowCount }),
      exec: async sql => { await client.query(sql); },
    });
    db = adapter(pool);
    db.transaction = async fn => { const client = await pool.connect(); try { await client.query('BEGIN'); const result = await fn(adapter(client)); await client.query('COMMIT'); return result; } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); } };
    db.close = () => pool.end();
  } else {
    if (!dataDir) throw new Error('DATA_DIR is required for SQLite.');
    fs.mkdirSync(dataDir, { recursive: true });
    const { DatabaseSync } = await import('node:sqlite');
    const native = new DatabaseSync(path.join(dataDir, 'yerli.sqlite'));
    native.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=10000;');
    const adapter = {
      kind: 'sqlite',
      all: async (sql, params = []) => native.prepare(sql).all(...params),
      get: async (sql, params = []) => native.prepare(sql).get(...params),
      run: async (sql, params = []) => native.prepare(sql).run(...params),
      exec: async sql => { native.exec(sql); },
    };
    // Queue every connection operation so async transactions cannot interleave.
    let tail = Promise.resolve();
    const queue = fn => { const result = tail.then(fn); tail = result.catch(() => {}); return result; };
    db = { kind: 'sqlite', native };
    for (const method of ['all', 'get', 'run', 'exec']) db[method] = (...args) => queue(() => adapter[method](...args));
    db.transaction = fn => queue(async () => { native.exec('BEGIN IMMEDIATE'); try { const result = await fn(adapter); native.exec('COMMIT'); return result; } catch (error) { native.exec('ROLLBACK'); throw error; } });
    db.close = async () => { await tail; native.close(); };
  }
  const migrations = fs.readdirSync(migrationsDir).filter(file => /^\d+-[\w-]+\.sql$/.test(file)).sort();
  if (!migrations.length) throw new Error('Database migration tapılmadı.');
  await db.transaction(async tx => {
    // The first migration creates schema_migrations, so it is safe to run repeatedly.
    await tx.exec(fs.readFileSync(path.join(migrationsDir, migrations[0]), 'utf8'));
    for (const file of migrations) {
      const version = Number(file.match(/^(\d+)/)[1]);
      const applied = await tx.get('SELECT version FROM schema_migrations WHERE version=?', [version]);
      if (applied) continue;
      if (file !== migrations[0]) await tx.exec(fs.readFileSync(path.join(migrationsDir, file), 'utf8'));
      await tx.run('INSERT INTO schema_migrations(version, applied_at) VALUES(?, ?)', [version, new Date().toISOString()]);
    }
  });
  return db;
}
export const TABLES = ['users','stores','products','product_images','categories','orders','shipments','order_items','settings','media','audit_log','legacy_imports','sessions','otp_challenges','webhook_events','schema_migrations'];
