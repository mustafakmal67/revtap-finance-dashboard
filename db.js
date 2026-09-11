// RevTap Financial OS - SQLite Database Engine
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, 'data');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
const DB_PATH = path.join(DATA_DIR, 'brand_finances.db');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });

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
  queryAll,
  queryOne,
  execute,
  DB_PATH,
  BACKUPS_DIR
};
