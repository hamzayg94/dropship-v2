import { DatabaseSync } from 'node:sqlite'
import path from 'path'

let _db: DatabaseSync | null = null

export function getDb(): DatabaseSync {
  if (_db) return _db

  const dbPath = process.env.DB_PATH
    ? path.resolve(process.cwd(), process.env.DB_PATH)
    : path.join(process.cwd(), 'data', 'dropship.db')

  _db = new DatabaseSync(dbPath)
  _db.exec('PRAGMA journal_mode = WAL')
  _db.exec('PRAGMA foreign_keys = ON')
  runMigrations(_db)
  return _db
}

function col(db: DatabaseSync, table: string, col: string): boolean {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>
  return rows.some(r => r.name === col)
}

function runMigrations(db: DatabaseSync) {
  // Ensure all tables exist (safe for both fresh and imported DB)
  db.exec(`
    CREATE TABLE IF NOT EXISTS tokens (
      id INTEGER PRIMARY KEY DEFAULT 1,
      access_token TEXT,
      refresh_token TEXT,
      expires_at INTEGER,
      scope TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS signing_keys (
      signing_key_id TEXT PRIMARY KEY,
      jwe TEXT,
      public_key TEXT,
      private_key TEXT,
      cipher TEXT DEFAULT 'ED25519',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      date TEXT,
      product TEXT,
      buyer TEXT,
      postcode TEXT DEFAULT '',
      price REAL DEFAULT 0,
      payout REAL DEFAULT 0,
      cost REAL DEFAULT 0,
      fvf REAL DEFAULT 0,
      profit REAL DEFAULT 0,
      margin REAL DEFAULT 0,
      status TEXT DEFAULT 'Completed',
      supplier TEXT DEFAULT '',
      supplier_link TEXT DEFAULT '',
      tracking TEXT DEFAULT '',
      dispatch TEXT DEFAULT '',
      supplier_order_id TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      ebay_line_item_id TEXT DEFAULT '',
      ebay_synced INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS pricing_cache (
      id INTEGER PRIMARY KEY DEFAULT 1,
      analysed_at TEXT DEFAULT (datetime('now')),
      result_json TEXT
    );
  `)

  // Safe column migrations
  const addCol = (table: string, column: string, def: string) => {
    if (!col(db, table, column)) {
      try { db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`) } catch (_) {}
    }
  }

  addCol('orders', 'supplier_refunded',    'INTEGER DEFAULT 1')
  addCol('orders', 'reconcile_status',     'TEXT DEFAULT NULL')
  addCol('orders', 'ad_fee',               'REAL DEFAULT 0')
  addCol('orders', 'supplier_cost_parsed', 'INTEGER DEFAULT 0')
  addCol('orders', 'country',              "TEXT DEFAULT ''")
  addCol('orders', 'country_code',         "TEXT DEFAULT ''")
  addCol('orders', 'quantity',             'INTEGER DEFAULT 1')
  addCol('orders', 'variation',            "TEXT DEFAULT ''")

  db.exec(`
    CREATE TABLE IF NOT EXISTS logs (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user        TEXT    NOT NULL,
      action      TEXT    NOT NULL,
      entity_type TEXT,
      entity_id   TEXT,
      detail      TEXT,
      old_value   TEXT,
      new_value   TEXT,
      created_at  TEXT    DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS logs_created ON logs(created_at DESC);

    CREATE TABLE IF NOT EXISTS monthly_expenses (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      month       TEXT    NOT NULL,
      category    TEXT    NOT NULL,
      description TEXT    NOT NULL,
      amount      REAL    NOT NULL DEFAULT 0,
      source      TEXT    NOT NULL DEFAULT 'manual',
      created_at  TEXT    DEFAULT (datetime('now')),
      updated_at  TEXT    DEFAULT (datetime('now')),
      UNIQUE(month, category, description)
    );
    CREATE INDEX IF NOT EXISTS monthly_expenses_month ON monthly_expenses(month);

    CREATE TABLE IF NOT EXISTS compliance_obligations (
      id           TEXT    PRIMARY KEY,
      title        TEXT    NOT NULL,
      description  TEXT    NOT NULL DEFAULT '',
      category     TEXT    NOT NULL DEFAULT 'tax',
      frequency    TEXT    NOT NULL DEFAULT 'annual',
      period       TEXT    NOT NULL DEFAULT '',
      due_date     TEXT    NOT NULL,
      submit_to    TEXT    NOT NULL DEFAULT '',
      submit_url   TEXT    NOT NULL DEFAULT '',
      sort_order   INTEGER NOT NULL DEFAULT 0,
      completed    INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT,
      notes        TEXT    NOT NULL DEFAULT '',
      created_at   TEXT    DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS compliance_subtasks (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      obligation_id TEXT    NOT NULL REFERENCES compliance_obligations(id) ON DELETE CASCADE,
      step_order    INTEGER NOT NULL DEFAULT 0,
      label         TEXT    NOT NULL,
      detail        TEXT    NOT NULL DEFAULT '',
      done          INTEGER NOT NULL DEFAULT 0,
      done_at       TEXT,
      created_at    TEXT    DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS compliance_subtasks_ob ON compliance_subtasks(obligation_id);
  `)
}

export interface OrderRow {
  id: string
  date: string
  product: string
  buyer: string
  postcode: string
  country: string
  country_code: string
  quantity: number
  variation: string
  price: number
  payout: number
  cost: number
  fvf: number
  ad_fee: number
  profit: number
  margin: number
  status: string
  supplier: string
  supplier_link: string
  tracking: string
  dispatch: string
  supplier_order_id: string
  notes: string
  ebay_line_item_id: string
  ebay_synced: number
  reconcile_status: string | null
  supplier_refunded: number
  created_at: string
  updated_at: string
}
