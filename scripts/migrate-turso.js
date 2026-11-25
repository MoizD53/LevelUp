const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');

function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env.local');
  const env = { ...process.env };
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        let value = (match[2] || '').trim();
        value = value.replace(/^['"](.*)['"]$/, '$1');
        env[match[1]] = value;
      }
    }
  }
  return env;
}

const env = loadEnv();
const url = env.TURSO_DATABASE_URL || env.NEXT_PUBLIC_TURSO_DATABASE_URL;
const authToken = env.TURSO_AUTH_TOKEN || env.NEXT_PUBLIC_TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error('Error: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be configured in .env.local');
  process.exit(1);
}

const client = createClient({
  url,
  authToken
});


async function migrate() {
  console.log('Migrating Turso database schema for Level Up...');

  await client.execute(`
    CREATE TABLE IF NOT EXISTS club_tables (
      id TEXT PRIMARY KEY,
      number INTEGER NOT NULL,
      name TEXT NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('Royal', 'Snooker', 'Pool')),
      status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'playing', 'paused', 'maintenance')),
      hourly_rate REAL NOT NULL DEFAULT 250.00,
      min_fee REAL NOT NULL DEFAULT 50.00,
      current_player TEXT,
      current_phone TEXT,
      game_type TEXT,
      session_started_at TEXT,
      scheduled_end_at TEXT,
      duration_choice TEXT,
      current_session_id TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS table_pricing (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL UNIQUE,
      rate_30m REAL NOT NULL,
      rate_60m REAL NOT NULL,
      updated_by TEXT DEFAULT 'owner',
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL CHECK (category IN ('Drinks', 'Snacks', 'Other')),
      price REAL NOT NULL DEFAULT 0.00,
      cost_price REAL NOT NULL DEFAULT 0.00,
      active INTEGER NOT NULL DEFAULT 1,
      stock_count INTEGER DEFAULT 100,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      table_id TEXT,
      table_name TEXT NOT NULL,
      table_kind TEXT DEFAULT 'Snooker',
      customer_name TEXT NOT NULL DEFAULT 'Walk-in Player',
      customer_phone TEXT,
      hourly_rate REAL NOT NULL,
      rate_snapshot REAL DEFAULT 350.0,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      ended_at TEXT,
      scheduled_end_at TEXT,
      duration_choice TEXT,
      duration_minutes INTEGER DEFAULT 0,
      table_amount REAL NOT NULL DEFAULT 0.00,
      items_amount REAL NOT NULL DEFAULT 0.00,
      discount_amount REAL NOT NULL DEFAULT 0.00,
      discount_reason TEXT,
      final_total REAL NOT NULL DEFAULT 0.00,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'voided')),
      paid INTEGER NOT NULL DEFAULT 0,
      payment_status TEXT DEFAULT 'Unpaid' CHECK (payment_status IN ('Unpaid', 'Partially Paid', 'Paid')),
      payment_method TEXT CHECK (payment_method IN ('cash', 'upi', 'card', 'split', 'udhar')),
      cash_paid REAL DEFAULT 0,
      upi_paid REAL DEFAULT 0,
      udhar_amount REAL DEFAULT 0,
      upi_reference TEXT,
      created_by TEXT DEFAULT 'staff',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS session_items (
      id TEXT PRIMARY KEY,
      session_id TEXT REFERENCES sessions(id) ON DELETE CASCADE,
      product_id TEXT,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL DEFAULT 0.00,
      total_price REAL NOT NULL DEFAULT 0.00,
      added_at TEXT DEFAULT (datetime('now'))
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      expense_date TEXT NOT NULL,
      payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'upi', 'bank_transfer', 'card')),
      paid_to TEXT NOT NULL,
      notes TEXT,
      receipt_url TEXT,
      created_by TEXT NOT NULL DEFAULT 'owner',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'staff',
      target_id TEXT,
      details TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  console.log('Tables created. Seeding initial club tables & pricing...');

  // Seed 5 tables
  const tables = [
    { id: 't-royal-1', number: 1, name: 'Royal Table 1', kind: 'Royal', rate: 500, min: 100 },
    { id: 't-royal-2', number: 2, name: 'Royal Table 2', kind: 'Royal', rate: 500, min: 100 },
    { id: 't-snooker-1', number: 3, name: 'Snooker Table 1', kind: 'Snooker', rate: 350, min: 70 },
    { id: 't-snooker-2', number: 4, name: 'Snooker Table 2', kind: 'Snooker', rate: 350, min: 70 },
    { id: 't-pool-1', number: 5, name: 'Pool Table 1', kind: 'Pool', rate: 250, min: 50 },
  ];

  for (const t of tables) {
    await client.execute({
      sql: `INSERT INTO club_tables (id, number, name, kind, status, hourly_rate, min_fee)
            VALUES (?, ?, ?, ?, 'available', ?, ?)
            ON CONFLICT (id) DO UPDATE SET name = excluded.name, hourly_rate = excluded.hourly_rate`,
      args: [t.id, t.number, t.name, t.kind, t.rate, t.min]
    });
  }

  // Seed default pricing
  await client.execute(`
    INSERT INTO table_pricing (id, category, rate_30m, rate_60m, updated_by)
    VALUES ('price_royal', 'Royal', 300, 500, 'owner')
    ON CONFLICT (category) DO NOTHING;
  `);
  await client.execute(`
    INSERT INTO table_pricing (id, category, rate_30m, rate_60m, updated_by)
    VALUES ('price_snooker', 'Snooker', 200, 350, 'owner')
    ON CONFLICT (category) DO NOTHING;
  `);
  await client.execute(`
    INSERT INTO table_pricing (id, category, rate_30m, rate_60m, updated_by)
    VALUES ('price_pool', 'Pool', 150, 250, 'owner')
    ON CONFLICT (category) DO NOTHING;
  `);

  // Seed products
  const products = [
    { id: 'prod_redbull', name: 'Red Bull Energy Drink', category: 'Drinks', price: 160, cost: 110 },
    { id: 'prod_water', name: 'Mineral Water (1L)', category: 'Drinks', price: 30, cost: 12 },
    { id: 'prod_cold_coffee', name: 'Iced Cold Coffee', category: 'Drinks', price: 120, cost: 45 },
    { id: 'prod_chips', name: 'Artisan Nachos & Dip', category: 'Snacks', price: 140, cost: 50 },
    { id: 'prod_sandwich', name: 'Grilled Club Sandwich', category: 'Snacks', price: 180, cost: 70 },
    { id: 'prod_peanuts', name: 'Salted Roasted Peanuts', category: 'Snacks', price: 60, cost: 20 },
  ];

  for (const p of products) {
    await client.execute({
      sql: `INSERT INTO products (id, name, category, price, cost_price, active, stock_count)
            VALUES (?, ?, ?, ?, ?, 1, 100)
            ON CONFLICT (id) DO UPDATE SET price = excluded.price, name = excluded.name`,
      args: [p.id, p.name, p.category, p.price, p.cost]
    });
  }

  console.log('Successfully migrated and seeded Turso database!');
}

migrate().catch(console.error);
