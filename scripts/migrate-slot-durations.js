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

const client = createClient({ url, authToken });

async function run() {
  console.log('Checking table_pricing columns...');
  const info = await client.execute('PRAGMA table_info(table_pricing)');
  const cols = info.rows.map(r => r.name);
  console.log('Existing columns in table_pricing:', cols);

  if (!cols.includes('slot1_mins')) {
    console.log('Adding slot1_mins column...');
    await client.execute('ALTER TABLE table_pricing ADD COLUMN slot1_mins INTEGER DEFAULT 30');
  }
  if (!cols.includes('slot2_mins')) {
    console.log('Adding slot2_mins column...');
    await client.execute('ALTER TABLE table_pricing ADD COLUMN slot2_mins INTEGER DEFAULT 60');
  }

  // Update existing rows to have default 30 and 60 if null
  await client.execute('UPDATE table_pricing SET slot1_mins = 30 WHERE slot1_mins IS NULL');
  await client.execute('UPDATE table_pricing SET slot2_mins = 60 WHERE slot2_mins IS NULL');

  const rows = await client.execute('SELECT * FROM table_pricing');
  console.log('Updated table_pricing rows:', JSON.stringify(rows.rows, null, 2));
}

run().catch(console.error);
