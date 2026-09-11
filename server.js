// RevTap Financial OS - Express Backend Server
const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');
const QRCode = require('qrcode');
const db = require('./db.js');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

function getLocalNetworkIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

// -----------------------------------------------------------------------------
// 1. SYSTEM & STORAGE INFO (WHERE DATA IS SAVED)
// -----------------------------------------------------------------------------
app.get('/api/system/info', async (req, res) => {
  try {
    const localIP = getLocalNetworkIP();
    const networkUrl = `http://${localIP}:${PORT}`;
    const qrCodeDataUrl = await QRCode.toDataURL(networkUrl, {
      width: 280,
      margin: 2,
      color: { dark: '#060911', light: '#ffffff' }
    });

    res.json({
      success: true,
      port: PORT,
      localIP,
      networkUrl,
      qrCodeDataUrl,
      dbPath: db.DB_PATH,
      backupsPath: db.BACKUPS_DIR
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -----------------------------------------------------------------------------
// 2. UNIFIED STATE & AUTO-CALCULATOR API
// -----------------------------------------------------------------------------
app.get('/api/state', (req, res) => {
  try {
    const courierTx = db.queryAll('SELECT * FROM courier_transactions ORDER BY tx_date DESC, created_at DESC');
    const adSpends = db.queryAll('SELECT * FROM ad_spend_entries ORDER BY spend_date DESC, created_at DESC');
    const stockEntries = db.queryAll('SELECT * FROM stock_entries ORDER BY entry_date DESC, created_at DESC');
    const expenses = db.queryAll('SELECT * FROM business_expenses ORDER BY expense_date DESC, created_at DESC');
    const orders = db.queryAll('SELECT * FROM orders ORDER BY order_date DESC, created_at DESC');

    // 1. Calculate Courier Cash Flows
    let totalCourierReceived = 0; // Remittance received in bank
    let totalCourierPaid = 0;     // Shipping fees paid at dispatch
    courierTx.forEach(t => {
      if (t.type === 'RECEIVED_FROM_COURIER') {
        totalCourierReceived += (t.amount || 0);
      } else if (t.type === 'PAID_TO_COURIER') {
        totalCourierPaid += (t.amount || 0);
      }
    });

    // 2. Calculate Ad Spends
    let totalRawAds = 0;
    let totalEffectiveAds = 0;
    adSpends.forEach(a => {
      totalRawAds += (a.raw_spend || 0);
      totalEffectiveAds += (a.effective_spend || (a.raw_spend * 1.08));
    });

    // 3. Calculate Stock Sourcing Cost
    let totalStockCost = 0;
    let totalStockUnits = 0;
    stockEntries.forEach(s => {
      totalStockCost += (s.total_cost || 0);
      totalStockUnits += (s.units_count || 0);
    });

    // 4. Calculate Business & Work Expenses (Petrol, Packaging, SIMs, Food, Rent)
    let totalOtherExpenses = 0;
    const categoryTotals = {};
    expenses.forEach(e => {
      totalOtherExpenses += (e.amount || 0);
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + (e.amount || 0);
    });

    // 5. Calculate Orders & Revenue Flow
    let totalOrdersCount = orders.length;
    let deliveredOrdersCount = 0;
    let returnedOrdersCount = 0;
    let inTransitOrdersCount = 0;
    let totalOrderSalesRevenue = 0;

    orders.forEach(o => {
      if (o.status === 'Delivered') {
        deliveredOrdersCount++;
        totalOrderSalesRevenue += (o.selling_price || 0);
      } else if (o.status === 'Returned') {
        returnedOrdersCount++;
      } else if (o.status === 'In Transit') {
        inTransitOrdersCount++;
      }
    });

    const resolvedOrders = deliveredOrdersCount + returnedOrdersCount;
    const deliveryRate = resolvedOrders > 0 ? (deliveredOrdersCount / resolvedOrders) * 100 : 0;
    const rtoRate = resolvedOrders > 0 ? (returnedOrdersCount / resolvedOrders) * 100 : 0;

    // 6. MASTER TRUE NET CASH POCKET PROFIT:
    // If courier remittances are logged, use actual cash collected from couriers.
    // If not yet logged, fallback to delivered order sales value.
    const totalCashInflow = totalCourierReceived > 0 ? totalCourierReceived : totalOrderSalesRevenue;
    const totalCashOutflow = totalStockCost + totalEffectiveAds + totalCourierPaid + totalOtherExpenses;
    const netPocketedProfit = totalCashInflow - totalCashOutflow;

    // Money Still in Courier Pipeline
    const pendingCourierCash = Math.max(0, totalOrderSalesRevenue - totalCourierReceived);

    res.json({
      success: true,
      data: {
        netPocketedProfit,
        totalCashInflow,
        totalCashOutflow,
        totalCourierReceived,
        totalCourierPaid,
        totalRawAds,
        totalEffectiveAds,
        totalStockCost,
        totalStockUnits,
        totalOtherExpenses,
        categoryTotals,
        totalOrdersCount,
        deliveredOrdersCount,
        returnedOrdersCount,
        inTransitOrdersCount,
        totalOrderSalesRevenue,
        deliveryRate,
        rtoRate,
        pendingCourierCash,
        courierTx,
        adSpends,
        stockEntries,
        expenses,
        orders,
        storageFile: db.DB_PATH,
        lastUpdated: new Date().toLocaleTimeString()
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -----------------------------------------------------------------------------
// 3. COURIER TRANSACTIONS (PAID TO COURIER VS RECEIVED FROM COURIER)
// -----------------------------------------------------------------------------
app.post('/api/courier-tx', (req, res) => {
  try {
    const { type, tx_date = new Date().toISOString().slice(0, 10), courier = 'PostEx', amount, parcels_count = 0, reference_note } = req.body;
    const id = `CTX-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();

    db.execute(`
      INSERT INTO courier_transactions (id, type, tx_date, courier, amount, parcels_count, reference_note, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, type, tx_date, courier, parseFloat(amount) || 0, parseInt(parcels_count, 10) || 0, reference_note || '', now
    ]);

    db.createBackup();
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/courier-tx/:id', (req, res) => {
  try {
    db.execute('DELETE FROM courier_transactions WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -----------------------------------------------------------------------------
// 4. AD SPEND ENTRIES (META, TIKTOK, GOOGLE WITH PAKISTANI BANK TAX)
// -----------------------------------------------------------------------------
app.post('/api/ad-spend', (req, res) => {
  try {
    const { spend_date = new Date().toISOString().slice(0, 10), platform = 'Meta Ads', raw_spend, bank_tax_percent = 8.0, campaign_name } = req.body;
    const raw = parseFloat(raw_spend) || 0;
    const tax = parseFloat(bank_tax_percent) || 8.0;
    const effective = raw * (1 + tax / 100);
    const id = `AD-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();

    db.execute(`
      INSERT INTO ad_spend_entries (id, spend_date, platform, raw_spend, bank_tax_percent, effective_spend, campaign_name, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, spend_date, platform, raw, tax, effective, campaign_name || '', now
    ]);

    db.createBackup();
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/ad-spend/:id', (req, res) => {
  try {
    db.execute('DELETE FROM ad_spend_entries WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -----------------------------------------------------------------------------
// 5. STOCK / WHOLESALE SOURCING ENTRIES
// -----------------------------------------------------------------------------
app.post('/api/stock-entry', (req, res) => {
  try {
    const { entry_date = new Date().toISOString().slice(0, 10), item_name = 'Inventory Stock Batch', supplier, total_cost, units_count = 0 } = req.body;
    const id = `STK-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();

    db.execute(`
      INSERT INTO stock_entries (id, entry_date, item_name, supplier, total_cost, units_count, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      id, entry_date, item_name, supplier || 'Shah Alam / Wholesale', parseFloat(total_cost) || 0, parseInt(units_count, 10) || 0, now
    ]);

    db.createBackup();
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/stock-entry/:id', (req, res) => {
  try {
    db.execute('DELETE FROM stock_entries WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -----------------------------------------------------------------------------
// 6. BUSINESS & WORK EXPENSES (PETROL, PACKAGING, SIMS, FOOD, RENT)
// -----------------------------------------------------------------------------
app.post('/api/expense', (req, res) => {
  try {
    const { expense_date = new Date().toISOString().slice(0, 10), category = 'Petrol / Fuel ⛽', description, amount } = req.body;
    const id = `EXP-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();

    db.execute(`
      INSERT INTO business_expenses (id, expense_date, category, description, amount, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      id, expense_date, category, description || category, parseFloat(amount) || 0, now
    ]);

    db.createBackup();
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/expense/:id', (req, res) => {
  try {
    db.execute('DELETE FROM business_expenses WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -----------------------------------------------------------------------------
// 7. ORDERS & DISPATCHES
// -----------------------------------------------------------------------------
app.post('/api/order', (req, res) => {
  try {
    const { customer_name, customer_city, tracking_number, courier = 'PostEx', selling_price = 0, status = 'In Transit', order_date = new Date().toISOString().slice(0, 10) } = req.body;
    const count = db.queryOne('SELECT COUNT(*) as count FROM orders');
    const id = `PK-${1000 + (count ? count.count + 1 : 1)}`;
    const now = new Date().toISOString();

    db.execute(`
      INSERT INTO orders (id, order_date, customer_name, customer_city, tracking_number, courier, selling_price, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, order_date, customer_name || 'Customer', customer_city || 'Pakistan', tracking_number || '', courier, parseFloat(selling_price) || 0, status, now
    ]);

    db.createBackup();
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/order/:id/cycle-status', (req, res) => {
  try {
    const ord = db.queryOne('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (!ord) return res.status(404).json({ success: false, error: 'Order not found' });

    const statuses = ['In Transit', 'Delivered', 'Returned', 'Cancelled'];
    const nextIdx = (statuses.indexOf(ord.status) + 1) % statuses.length;
    const nextStatus = statuses[nextIdx];

    db.execute('UPDATE orders SET status = ? WHERE id = ?', [nextStatus, req.params.id]);
    res.json({ success: true, status: nextStatus });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/order/:id', (req, res) => {
  try {
    db.execute('DELETE FROM orders WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -----------------------------------------------------------------------------
// 8. RESET CLEAN
// -----------------------------------------------------------------------------
app.post('/api/system/reset-clean', (req, res) => {
  const result = db.resetDatabaseClean();
  res.json(result);
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    const localIP = getLocalNetworkIP();
    console.log(`RevTap Live at http://localhost:${PORT} and http://${localIP}:${PORT}`);
    console.log(`Data stored in SQLite: ${db.DB_PATH}`);
  });
}

module.exports = app;

