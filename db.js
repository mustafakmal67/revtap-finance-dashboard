// RevTap Financial OS - SQLite Database Engine
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DATA_DIR = process.env.VERCEL ? path.join('/tmp', 'revtap-data') : path.join(__dirname, 'data');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
const DB_PATH = path.join(DATA_DIR, 'brand_finances.db');

if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (e) {}
}
if (!fs.existsSync(BACKUPS_DIR)) {
  try {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  } catch (e) {}
}

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

function initSchema() {
  db.exec(`
    -- 1. Courier Cash Flow Transactions (Paid to Courier vs Received from Courier with Dates)
    CREATE TABLE IF NOT EXISTS courier_transactions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL, -- 'PAID_TO_COURIER' or 'RECEIVED_FROM_COURIER'
      tx_date TEXT NOT NULL,
      courier TEXT NOT NULL, -- 'PostEx', 'Trax', 'Leopards', 'Call Courier', 'TCS', 'Other'
      amount REAL NOT NULL,
      parcels_count INTEGER DEFAULT 0,
      reference_note TEXT,
      created_at TEXT NOT NULL
    );

    -- 2. Ad Spend Entries (Meta, TikTok, Google with Bank Tax)
    CREATE TABLE IF NOT EXISTS ad_spend_entries (
      id TEXT PRIMARY KEY,
      spend_date TEXT NOT NULL,
      platform TEXT NOT NULL, -- 'Meta Ads', 'TikTok Ads', 'Google Ads', 'Other'
      raw_spend REAL NOT NULL,
      bank_tax_percent REAL DEFAULT 8.0,
      effective_spend REAL NOT NULL,
      campaign_name TEXT,
      created_at TEXT NOT NULL
    );

    -- 3. Stock / Wholesale Inventory Sourcing
    CREATE TABLE IF NOT EXISTS stock_entries (
      id TEXT PRIMARY KEY,
      entry_date TEXT NOT NULL,
      item_name TEXT NOT NULL,
      supplier TEXT,
      total_cost REAL NOT NULL,
      units_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    -- 4. Business & Work Expenses (Petrol, Packaging, SIMs, Food, Rent)
    CREATE TABLE IF NOT EXISTS business_expenses (
      id TEXT PRIMARY KEY,
      expense_date TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      created_at TEXT NOT NULL
    );

    -- 5. Orders & Dispatches
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_date TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_city TEXT NOT NULL,
      tracking_number TEXT,
      courier TEXT DEFAULT 'PostEx',
      selling_price REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'In Transit', -- 'In Transit', 'Delivered', 'Returned', 'Cancelled'
      created_at TEXT NOT NULL
    );
  `);
}

// Automated Snapshot Backup Routine
function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `revtap_finances_backup_${timestamp}.db`;
  const backupPath = path.join(BACKUPS_DIR, backupFileName);
  
  try {
    fs.copyFileSync(DB_PATH, backupPath);
    pruneOldBackups();
    return { success: true, fileName: backupFileName, path: backupPath };
  } catch (err) {
    console.error('Failed to create backup:', err);
    return { success: false, error: err.message };
  }
}

function pruneOldBackups() {
  try {
    const files = fs.readdirSync(BACKUPS_DIR)
      .filter(f => f.endsWith('.db'))
      .map(f => ({ name: f, time: fs.statSync(path.join(BACKUPS_DIR, f)).mtime.getTime() }))
      .sort((a, b) => b.time - a.time);

    if (files.length > 20) {
      files.slice(20).forEach(f => {
        fs.unlinkSync(path.join(BACKUPS_DIR, f.name));
      });
    }
  } catch (e) {}
}

function resetDatabaseClean() {
  db.exec(`
    DELETE FROM courier_transactions;
    DELETE FROM ad_spend_entries;
    DELETE FROM stock_entries;
    DELETE FROM business_expenses;
    DELETE FROM orders;
  `);
  createBackup();
  return { success: true, message: 'All database records cleared to fresh 0 starting state.' };
}

function exportAllData() {
  const courierTx = queryAll('SELECT * FROM courier_transactions ORDER BY tx_date DESC, created_at DESC');
  const adSpends = queryAll('SELECT * FROM ad_spend_entries ORDER BY spend_date DESC, created_at DESC');
  const stockEntries = queryAll('SELECT * FROM stock_entries ORDER BY entry_date DESC, created_at DESC');
  const expenses = queryAll('SELECT * FROM business_expenses ORDER BY expense_date DESC, created_at DESC');
  const orders = queryAll('SELECT * FROM orders ORDER BY order_date DESC, created_at DESC');
  return { courierTx, adSpends, stockEntries, expenses, orders };
}

function importAllData(payload) {
  if (!payload) return { success: false, error: 'No data provided' };
  
  if (Array.isArray(payload.courierTx)) {
    for (const t of payload.courierTx) {
      if (!t.id) continue;
      const existing = queryOne('SELECT id FROM courier_transactions WHERE id = ?', [t.id]);
      if (!existing) {
        execute(`
          INSERT INTO courier_transactions (id, type, tx_date, courier, amount, parcels_count, reference_note, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [t.id, t.type || 'RECEIVED_FROM_COURIER', t.tx_date || '', t.courier || 'PostEx', parseFloat(t.amount) || 0, parseInt(t.parcels_count, 10) || 0, t.reference_note || '', t.created_at || new Date().toISOString()]);
      }
    }
  }

  if (Array.isArray(payload.adSpends)) {
    for (const a of payload.adSpends) {
      if (!a.id) continue;
      const existing = queryOne('SELECT id FROM ad_spend_entries WHERE id = ?', [a.id]);
      if (!existing) {
        execute(`
          INSERT INTO ad_spend_entries (id, spend_date, platform, raw_spend, bank_tax_percent, effective_spend, campaign_name, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [a.id, a.spend_date || '', a.platform || 'Meta Ads', parseFloat(a.raw_spend) || 0, parseFloat(a.bank_tax_percent) || 8.0, parseFloat(a.effective_spend) || (parseFloat(a.raw_spend) || 0) * 1.08, a.campaign_name || '', a.created_at || new Date().toISOString()]);
      }
    }
  }

  if (Array.isArray(payload.stockEntries)) {
    for (const s of payload.stockEntries) {
      if (!s.id) continue;
      const existing = queryOne('SELECT id FROM stock_entries WHERE id = ?', [s.id]);
      if (!existing) {
        execute(`
          INSERT INTO stock_entries (id, entry_date, item_name, supplier, total_cost, units_count, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [s.id, s.entry_date || '', s.item_name || '', s.supplier || '', parseFloat(s.total_cost) || 0, parseInt(s.units_count, 10) || 0, s.created_at || new Date().toISOString()]);
      }
    }
  }

  if (Array.isArray(payload.expenses)) {
    for (const e of payload.expenses) {
      if (!e.id) continue;
      const existing = queryOne('SELECT id FROM business_expenses WHERE id = ?', [e.id]);
      if (!existing) {
        execute(`
          INSERT INTO business_expenses (id, expense_date, category, description, amount, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [e.id, e.expense_date || '', e.category || 'Other Expense', e.description || '', parseFloat(e.amount) || 0, e.created_at || new Date().toISOString()]);
      }
    }
  }

  if (Array.isArray(payload.orders)) {
    for (const o of payload.orders) {
      if (!o.id) continue;
      const existing = queryOne('SELECT id FROM orders WHERE id = ?', [o.id]);
      if (!existing) {
        execute(`
          INSERT INTO orders (id, order_date, customer_name, customer_city, tracking_number, courier, selling_price, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [o.id, o.order_date || '', o.customer_name || '', o.customer_city || '', o.tracking_number || '', o.courier || 'PostEx', parseFloat(o.selling_price) || 0, o.status || 'In Transit', o.created_at || new Date().toISOString()]);
      }
    }
  }

  return { success: true, message: 'Sync data rehydrated successfully' };
}

function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  return stmt.all(...params);
}

function queryOne(sql, params = []) {
  const stmt = db.prepare(sql);
  return stmt.get(...params);
}

function execute(sql, params = []) {
  const stmt = db.prepare(sql);
  return stmt.run(...params);
}

initSchema();

module.exports = {
  db,
  initSchema,
  resetDatabaseClean,
  createBackup,
  exportAllData,
  importAllData,
  queryAll,
  queryOne,
  execute,
  DB_PATH,
  BACKUPS_DIR
};
