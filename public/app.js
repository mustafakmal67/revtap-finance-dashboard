// RevTap™ Apple Pro Financial OS - Zero-Lag Client Controller (Mustafa)
let currentFinanceData = null;
let currentTxFilter = 'all';
let currentQuickType = 'inflow';
let barChartInstance = null;
let donutChartInstance = null;
let lastSavedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

// Currency Formatter for PKR
function formatPKR(val) {
  if (isNaN(val) || val === null || val === undefined) return "Rs. 0";
  return "Rs. " + Math.round(val).toLocaleString("en-PK");
}

function updateAutoSaveBadge(timeStr) {
  if (timeStr) lastSavedTime = timeStr;
  else lastSavedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const el = document.getElementById("txt-autosave-status");
  if (el) el.textContent = `Auto-Saved (${lastSavedTime})`;
}

// Toast notification helper
function showToast(msg, type = "success") {
  updateAutoSaveBadge();
  const toast = document.createElement("div");
  toast.className = `fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-2xl text-xs font-semibold text-white shadow-2xl flex items-center gap-2 animate-apple-in ${
    type === "success" 
      ? "bg-emerald-600/90 border border-emerald-400/50 backdrop-blur-xl shadow-emerald-950/50" 
      : "bg-rose-600/90 border border-rose-400/50 backdrop-blur-xl shadow-rose-950/50"
  }`;
  toast.innerHTML = `<i data-lucide="${type === 'success' ? 'check-circle' : 'alert-circle'}" class="w-4 h-4"></i> ${msg}`;
  document.body.appendChild(toast);
  lucide.createIcons();
  setTimeout(() => toast.remove(), 3200);
}

// View Switcher (Dashboard / Transactions / Orders)
function switchView(viewName) {
  const views = {
    dashboard: document.getElementById("view-dashboard"),
    transactions: document.getElementById("view-transactions"),
    orders: document.getElementById("view-orders")
  };

  const navBtns = {
    dashboard: document.getElementById("nav-btn-dashboard"),
    transactions: document.getElementById("nav-btn-transactions"),
    orders: document.getElementById("nav-btn-orders")
  };

  Object.keys(views).forEach(k => {
    if (views[k]) {
      if (k === viewName) views[k].classList.remove("hidden");
      else views[k].classList.add("hidden");
    }
    if (navBtns[k]) {
      if (k === viewName) navBtns[k].classList.add("active");
      else navBtns[k].classList.remove("active");
    }
  });

  lucide.createIcons();
}

function openQrModal() {
  const modal = document.getElementById("modal-qr");
  if (modal) {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }
}

function closeQrModal() {
  const modal = document.getElementById("modal-qr");
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
}

function toggleOrderForm() {
  const form = document.getElementById("form-add-order");
  if (form) form.classList.toggle("hidden");
}

// Copy financial summary report
function copySummary() {
  if (!currentFinanceData) return;
  const d = currentFinanceData;
  const text = `📊 *RevTap™ Financial Report* — ${new Date().toLocaleDateString()}\n` +
    `👤 *Owner*: Mustafa\n` +
    `--------------------------------\n` +
    `💰 *REALIZED NET PROFIT*: ${formatPKR(d.netPocketedProfit)}\n\n` +
    `📥 Courier Cash Got: ${formatPKR(d.totalCourierReceived)}\n` +
    `📤 Courier Fees Paid: ${formatPKR(d.totalCourierPaid)}\n` +
    `📢 Ad Spend (with Tax): ${formatPKR(d.totalEffectiveAds)}\n` +
    `🏷️ Stock Sourced: ${formatPKR(d.totalStockCost)}\n` +
    `💼 Other Expenses: ${formatPKR(d.totalOtherExpenses)}\n` +
    `--------------------------------\n` +
    `📦 Total Customer Orders: ${d.totalOrdersCount}`;

  navigator.clipboard.writeText(text).then(() => {
    showToast("Financial report copied to clipboard!");
  }).catch(() => {
    showToast("Report copied!");
  });
}

// -----------------------------------------------------------------------------
// 1. QUICK LOGGER SEGMENT SELECTOR
// -----------------------------------------------------------------------------
function selectQuickType(type) {
  currentQuickType = type;
  document.getElementById("quick-entry-type").value = type;

  // Update tabs
  ["inflow", "shipping", "ads", "stock", "expense"].forEach(t => {
    const el = document.getElementById(`tab-${t}`);
    if (el) {
      if (t === type) el.classList.add("active");
      else el.classList.remove("active");
    }
  });

  const lblSource = document.getElementById("quick-source-label");
  const selCourier = document.getElementById("quick-select-courier");
  const selPlatform = document.getElementById("quick-select-platform");
  const txtDesc = document.getElementById("quick-text-desc");
  const lblAmount = document.getElementById("quick-amount-label");
  const btnSubmit = document.getElementById("btn-quick-submit");
  const btnLabel = document.getElementById("btn-quick-label");
  const boxStockUnits = document.getElementById("box-stock-units");
  const inpNotes = document.getElementById("quick-notes");

  // Reset visibilities
  selCourier.classList.add("hidden");
  selPlatform.classList.add("hidden");
  txtDesc.classList.add("hidden");
  boxStockUnits.classList.add("hidden");

  if (type === "inflow") {
    lblSource.textContent = "Courier Partner";
    selCourier.classList.remove("hidden");
    lblAmount.textContent = "Amount Received in Bank (Rs.) *";
    lblAmount.className = "block text-[11px] font-semibold text-emerald-400 mb-1";
    btnSubmit.className = "apple-btn-success w-full h-[44px]";
    btnLabel.textContent = "Save Remittance";
    inpNotes.placeholder = "Notes (e.g. PostEx Remittance batch #9021)";
  } else if (type === "shipping") {
    lblSource.textContent = "Courier Partner";
    selCourier.classList.remove("hidden");
    lblAmount.textContent = "Shipping Paid (Rs.) *";
    lblAmount.className = "block text-[11px] font-semibold text-amber-300 mb-1";
    btnSubmit.className = "apple-btn-primary w-full h-[44px] !bg-amber-600 hover:!bg-amber-500";
    btnLabel.textContent = "Save Shipping";
    inpNotes.placeholder = "Notes (e.g. 10 parcels shipping booking fee)";
  } else if (type === "ads") {
    lblSource.textContent = "Ad Platform";
    selPlatform.classList.remove("hidden");
    lblAmount.textContent = "Raw Ad Spend (Rs.) * (+8% Tax)";
    lblAmount.className = "block text-[11px] font-semibold text-sky-400 mb-1";
    btnSubmit.className = "apple-btn-primary w-full h-[44px] !bg-sky-600 hover:!bg-sky-500";
    btnLabel.textContent = "Save Ad Spend";
    inpNotes.placeholder = "Campaign name (e.g. Advantage+ Shopping / Earbuds)";
  } else if (type === "stock") {
    lblSource.textContent = "Item / Batch Name";
    txtDesc.classList.remove("hidden");
    txtDesc.placeholder = "e.g. 50x Smart Watches";
    lblAmount.textContent = "Total Bill (Rs.) *";
    lblAmount.className = "block text-[11px] font-semibold text-purple-300 mb-1";
    btnSubmit.className = "apple-btn-primary w-full h-[44px] !bg-purple-600 hover:!bg-purple-500";
    btnLabel.textContent = "Save Stock";
    boxStockUnits.classList.remove("hidden");
    inpNotes.placeholder = "Supplier / Market (e.g. Shah Alam / Bolton Market)";
  } else if (type === "expense") {
    lblSource.textContent = "Expense Description";
    txtDesc.classList.remove("hidden");
    txtDesc.placeholder = "e.g. Petrol for dispatch, flyers packaging";
    lblAmount.textContent = "Expense Amount (Rs.) *";
    lblAmount.className = "block text-[11px] font-semibold text-rose-400 mb-1";
    btnSubmit.className = "apple-btn-primary w-full h-[44px] !bg-rose-600 hover:!bg-rose-500";
    btnLabel.textContent = "Save Expense";
    inpNotes.placeholder = "Notes / Work details";
  }

  lucide.createIcons();
}

// -----------------------------------------------------------------------------
// 2. INITIALIZE ON LOAD
// -----------------------------------------------------------------------------
window.addEventListener("DOMContentLoaded", () => {
  setDefaultDates();
  initCharts();
  setupEventListeners();
  loadSystemInfo();
  loadUnifiedState();

  // Periodic background sync
  setInterval(() => {
    loadUnifiedState(true);
  }, 8000);
});

function setDefaultDates() {
  const today = new Date().toISOString().slice(0, 10);
  const el = document.getElementById("quick-date");
  if (el && !el.value) el.value = today;
}

async function loadSystemInfo() {
  try {
    const res = await fetch("/api/system/info");
    const data = await res.json();
    if (data.success) {
      const qrImg = document.getElementById("qr-img");
      const qrUrl = document.getElementById("qr-network-url");
      if (qrImg) qrImg.src = data.qrCodeDataUrl;
      if (qrUrl) qrUrl.textContent = data.networkUrl;
    }
  } catch (e) {}
}

// -----------------------------------------------------------------------------
// 3. CHART.JS INITIALIZATION
// -----------------------------------------------------------------------------
function initCharts() {
  // Bar Chart
  const ctxBar = document.getElementById("chartMoneyStats");
  if (ctxBar) {
    barChartInstance = new Chart(ctxBar.getContext("2d"), {
      type: "bar",
      data: {
        labels: ["Remittances", "Ad Spend (+Tax)", "Stock Sourcing", "Courier Paid", "Other Exp", "Net Pocket"],
        datasets: [{
          data: [0, 0, 0, 0, 0, 0],
          backgroundColor: [
            "#30d158", // Mint Inflow
            "#0a84ff", // Apple Blue Ads
            "#bf5af2", // Apple Purple Stock
            "#ffd60a", // Apple Gold Courier
            "#ff453a", // Apple Red Expenses
            "#ffffff"  // White Net Profit
          ],
          borderRadius: 6,
          barThickness: 24
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` Rs. ${Math.round(ctx.parsed.y).toLocaleString("en-PK")}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: "#86868b", font: { size: 10 } }
          },
          y: {
            grid: { color: "rgba(255, 255, 255, 0.04)" },
            ticks: {
              color: "#86868b",
              font: { size: 10 },
              callback: (val) => val >= 1000 ? (val / 1000).toFixed(0) + "k" : val
            }
          }
        }
      }
    });
  }

  // Donut Chart
  const ctxDonut = document.getElementById("chartExpenseDonut");
  if (ctxDonut) {
    donutChartInstance = new Chart(ctxDonut.getContext("2d"), {
      type: "doughnut",
      data: {
        labels: ["Ad Spend", "Stock Sourcing", "Courier Paid", "Other Expenses"],
        datasets: [{
          data: [0, 0, 0, 0],
          backgroundColor: ["#0a84ff", "#bf5af2", "#ffd60a", "#ff453a"],
          borderWidth: 0,
          cutout: "75%"
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` Rs. ${Math.round(ctx.parsed).toLocaleString("en-PK")}`
            }
          }
        }
      }
    });
  }
}

// -----------------------------------------------------------------------------
// 4. LOAD UNIFIED STATE (FETCH FROM SQLITE)
// -----------------------------------------------------------------------------
async function loadUnifiedState(silent = false) {
  try {
    const res = await fetch("/api/state");
    const json = await res.json();
    if (!json.success) return;

    const d = json.data;
    currentFinanceData = d;

    // 1. Hero Net Profit
    const heroProfit = document.getElementById("hero-net-profit");
    if (heroProfit) {
      heroProfit.textContent = formatPKR(d.netPocketedProfit);
      if (d.netPocketedProfit < 0) {
        heroProfit.className = "text-3xl sm:text-5xl font-bold font-mono text-[#ff453a] tracking-tight block";
      } else {
        heroProfit.className = "text-3xl sm:text-5xl font-bold font-mono text-white tracking-tight block";
      }
    }

    const heroStatusPill = document.getElementById("hero-status-pill");
    if (heroStatusPill) {
      if (d.netPocketedProfit >= 0) {
        heroStatusPill.className = "badge-green";
        heroStatusPill.textContent = "● Live Profit";
      } else {
        heroStatusPill.className = "badge-red";
        heroStatusPill.textContent = "● Negative (Investment)";
      }
    }

    const dispInflow = document.getElementById("hero-disp-inflow");
    if (dispInflow) dispInflow.textContent = formatPKR(d.totalCourierReceived);

    const dispOutflow = document.getElementById("hero-disp-outflow");
    if (dispOutflow) dispOutflow.textContent = formatPKR(d.totalCashOutflow);

    // 2. Top 3 Metric Cards
    const statInflow = document.getElementById("stat-total-inflow");
    if (statInflow) statInflow.textContent = formatPKR(d.totalCourierReceived);

    const statOutflow = document.getElementById("stat-total-outflow");
    if (statOutflow) statOutflow.textContent = formatPKR(d.totalCashOutflow);

    const statPending = document.getElementById("stat-pending-courier");
    if (statPending) statPending.textContent = formatPKR(d.pendingCourierCash);

    const dispNet = document.getElementById("disp-stat-net");
    if (dispNet) dispNet.textContent = `Net: ${formatPKR(d.netPocketedProfit)}`;

    // 3. Update Legend Amounts
    const legAds = document.getElementById("leg-ads-amt");
    if (legAds) legAds.textContent = formatPKR(d.totalEffectiveAds);

    const legStock = document.getElementById("leg-stock-amt");
    if (legStock) legStock.textContent = formatPKR(d.totalStockCost);

    const legCourier = document.getElementById("leg-courier-amt");
    if (legCourier) legCourier.textContent = formatPKR(d.totalCourierPaid);

    const legExp = document.getElementById("leg-exp-amt");
    if (legExp) legExp.textContent = formatPKR(d.totalOtherExpenses);

    // 4. Update Charts
    if (barChartInstance) {
      barChartInstance.data.datasets[0].data = [
        d.totalCourierReceived,
        d.totalEffectiveAds,
        d.totalStockCost,
        d.totalCourierPaid,
        d.totalOtherExpenses,
        Math.max(0, d.netPocketedProfit)
      ];
      barChartInstance.update();
    }

    if (donutChartInstance) {
      const costs = [d.totalEffectiveAds, d.totalStockCost, d.totalCourierPaid, d.totalOtherExpenses];
      const hasCost = costs.some(c => c > 0);
      donutChartInstance.data.datasets[0].data = hasCost ? costs : [1, 1, 1, 1];
      donutChartInstance.update();
    }

    // 5. Render Tables
    renderRecentTransactions(d.allTransactions);
    renderFullTransactions(d.allTransactions);
    renderOrders(d.orders);

    updateAutoSaveBadge(d.lastUpdated);
    if (!silent) lucide.createIcons();
  } catch (err) {
    console.error("Failed to load state:", err);
  }
}

// -----------------------------------------------------------------------------
// 5. TRANSACTIONS LEDGER RENDERING
// -----------------------------------------------------------------------------
function filterRecentTx(filter) {
  currentTxFilter = filter;
  const buttons = document.querySelectorAll(".tx-filter-btn");
  buttons.forEach(b => b.classList.remove("active"));
  if (event && event.currentTarget) {
    event.currentTarget.classList.add("active");
  }
  if (currentFinanceData) {
    renderRecentTransactions(currentFinanceData.allTransactions);
  }
}

function renderRecentTransactions(list) {
  const tbody = document.getElementById("recent-tx-tbody");
  if (!tbody) return;

  if (!list || list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-slate-500 text-xs">No transactions recorded yet. Use the Quick Entry bar above to log your first payment or expense!</td></tr>`;
    return;
  }

  let filtered = list;
  if (currentTxFilter === 'income') filtered = list.filter(t => t.type === 'INCOME');
  else if (currentTxFilter === 'ads') filtered = list.filter(t => t.kind === 'ads');
  else if (currentTxFilter === 'stock') filtered = list.filter(t => t.kind === 'stock');
  else if (currentTxFilter === 'expenses') filtered = list.filter(t => t.kind === 'other_expense');

  tbody.innerHTML = filtered.map(t => {
    const isIncome = t.type === 'INCOME';
    const amtColor = isIncome ? "text-[#30d158] font-bold" : "text-white font-medium";
    const amtSign = isIncome ? "+" : "-";

    let iconHtml = `<i data-lucide="arrow-down-left" class="w-3.5 h-3.5 text-[#30d158]"></i>`;
    if (t.kind === 'ads') iconHtml = `<i data-lucide="megaphone" class="w-3.5 h-3.5 text-[#0a84ff]"></i>`;
    else if (t.kind === 'stock') iconHtml = `<i data-lucide="boxes" class="w-3.5 h-3.5 text-[#bf5af2]"></i>`;
    else if (t.kind === 'other_expense') iconHtml = `<i data-lucide="receipt" class="w-3.5 h-3.5 text-[#ff453a]"></i>`;
    else if (t.kind === 'courier' && !isIncome) iconHtml = `<i data-lucide="truck" class="w-3.5 h-3.5 text-[#ffd60a]"></i>`;

    return `
      <tr class="hover:bg-white/[0.02] transition">
        <td class="py-3 px-3">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-lg bg-white/[0.05] border border-white/10 flex items-center justify-center shrink-0">
              ${iconHtml}
            </div>
            <div>
              <span class="font-medium text-white block text-xs">${t.title}</span>
              <span class="text-[10px] text-slate-400">${t.category}</span>
            </div>
          </div>
        </td>
        <td class="py-3 px-3 font-mono text-[11px] text-slate-300">${t.date}</td>
        <td class="py-3 px-3 text-slate-400 text-xs truncate max-w-[140px]">${t.notes || '—'}</td>
        <td class="py-3 px-3 text-right font-mono ${amtColor} text-xs">${amtSign} ${formatPKR(t.amount)}</td>
        <td class="py-3 px-3 text-center">
          <span class="${isIncome ? 'badge-green' : 'badge-neutral'}">
            ${t.status}
          </span>
        </td>
        <td class="py-3 px-3 text-center">
          <button onclick="deleteTx('${t.kind}', '${t.id}')" class="p-1 text-slate-500 hover:text-[#ff453a] transition" title="Delete">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </td>
      </tr>
    `;
  }).join("");
  lucide.createIcons();
}

function renderFullTransactions(list) {
  const tbody = document.getElementById("full-tx-tbody");
  if (!tbody) return;

  if (!list || list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-500 text-xs">No transactions recorded.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(t => {
    const isIncome = t.type === 'INCOME';
    const amtColor = isIncome ? "text-[#30d158] font-bold" : "text-white font-medium";
    const amtSign = isIncome ? "+" : "-";

    return `
      <tr class="hover:bg-white/[0.02] transition">
        <td class="py-3 px-3 font-mono text-[11px] text-slate-400">${t.id}</td>
        <td class="py-3 px-3 font-medium text-white text-xs">${t.title}</td>
        <td class="py-3 px-3 text-[11px] text-slate-400">${t.category}</td>
        <td class="py-3 px-3 font-mono text-[11px] text-slate-300">${t.date}</td>
        <td class="py-3 px-3 text-slate-400 text-xs">${t.notes || '—'}</td>
        <td class="py-3 px-3 text-right font-mono ${amtColor} text-xs">${amtSign} ${formatPKR(t.amount)}</td>
        <td class="py-3 px-3 text-center">
          <button onclick="deleteTx('${t.kind}', '${t.id}')" class="p-1 text-slate-500 hover:text-[#ff453a] transition" title="Delete">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </td>
      </tr>
    `;
  }).join("");
  lucide.createIcons();
}

async function deleteTx(kind, id) {
  let endpoint = "";
  if (kind === "courier") endpoint = `/api/courier-tx/${id}`;
  else if (kind === "ads") endpoint = `/api/ad-spend/${id}`;
  else if (kind === "stock") endpoint = `/api/stock-entry/${id}`;
  else if (kind === "other_expense") endpoint = `/api/expense/${id}`;

  if (!endpoint) return;

  try {
    const res = await fetch(endpoint, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      showToast("Transaction removed");
      loadUnifiedState();
    }
  } catch (e) {
    showToast("Error deleting transaction", "error");
  }
}

// -----------------------------------------------------------------------------
// 6. ORDERS VIEW RENDERING
// -----------------------------------------------------------------------------
function renderOrders(orders) {
  const tbody = document.getElementById("orders-full-tbody");
  if (!tbody) return;

  if (!orders || orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-slate-500 text-xs">No customer orders logged yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = orders.map(o => {
    let statusClass = "badge-neutral";
    if (o.status === "Delivered") statusClass = "badge-green";
    else if (o.status === "Returned") statusClass = "badge-red";

    return `
      <tr class="hover:bg-white/[0.02] transition">
        <td class="py-2.5 px-3">
          <span class="font-mono font-bold text-white block text-xs">${o.id}</span>
          <span class="text-[10px] text-slate-400 font-mono">${o.order_date}</span>
        </td>
        <td class="py-2.5 px-3">
          <span class="font-medium text-white block text-xs">${o.customer_name}</span>
          <span class="text-[10px] text-slate-400">${o.customer_city}</span>
        </td>
        <td class="py-2.5 px-3 font-mono text-[11px] text-slate-300">${o.tracking_number || '—'}</td>
        <td class="py-2.5 px-3 text-right font-mono font-bold text-white text-xs">${formatPKR(o.selling_price)}</td>
        <td class="py-2.5 px-3 text-center">
          <button onclick="cycleOrderStatus('${o.id}')" title="Click to change status" class="${statusClass} cursor-pointer hover:opacity-80 transition">
            ${o.status} ↻
          </button>
        </td>
        <td class="py-2.5 px-3 text-center">
          <button onclick="deleteOrder('${o.id}')" class="p-1 text-slate-500 hover:text-[#ff453a] transition" title="Delete">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </td>
      </tr>
    `;
  }).join("");
  lucide.createIcons();
}

async function cycleOrderStatus(id) {
  try {
    const res = await fetch(`/api/order/${id}/cycle-status`, { method: "POST" });
    const data = await res.json();
    if (data.success) {
      showToast(`Status: ${data.status}`);
      loadUnifiedState();
    }
  } catch (e) {}
}

async function deleteOrder(id) {
  try {
    const res = await fetch(`/api/order/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      showToast("Order removed");
      loadUnifiedState();
    }
  } catch (e) {}
}

// -----------------------------------------------------------------------------
// 7. FORM SUBMISSIONS & EVENT LISTENERS
// -----------------------------------------------------------------------------
function setupEventListeners() {
  
  // 1. Submit Dynamic Quick Logger Form
  const formQuick = document.getElementById("form-quick-entry");
  if (formQuick) {
    formQuick.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const type = currentQuickType;
      const date = document.getElementById("quick-date").value;
      const amount = parseFloat(document.getElementById("quick-amount").value) || 0;
      const notes = document.getElementById("quick-notes").value;

      let endpoint = "";
      let payload = {};

      if (type === "inflow") {
        endpoint = "/api/courier-tx";
        payload = {
          type: "RECEIVED_FROM_COURIER",
          tx_date: date,
          courier: document.getElementById("quick-select-courier").value,
          amount: amount,
          reference_note: notes
        };
      } else if (type === "shipping") {
        endpoint = "/api/courier-tx";
        payload = {
          type: "PAID_TO_COURIER",
          tx_date: date,
          courier: document.getElementById("quick-select-courier").value,
          amount: amount,
          reference_note: notes
        };
      } else if (type === "ads") {
        endpoint = "/api/ad-spend";
        payload = {
          spend_date: date,
          platform: document.getElementById("quick-select-platform").value,
          raw_spend: amount,
          bank_tax_percent: 8.0,
          campaign_name: notes
        };
      } else if (type === "stock") {
        endpoint = "/api/stock-entry";
        payload = {
          entry_date: date,
          item_name: document.getElementById("quick-text-desc").value || "Inventory Batch",
          supplier: notes,
          total_cost: amount,
          units_count: parseInt(document.getElementById("quick-stock-units").value, 10) || 0
        };
      } else if (type === "expense") {
        endpoint = "/api/expense";
        payload = {
          expense_date: date,
          category: "Other Expense",
          description: document.getElementById("quick-text-desc").value || "Work Expense",
          amount: amount
        };
      }

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          showToast(`Logged: Rs. ${amount.toLocaleString('en-PK')} saved!`);
          document.getElementById("quick-amount").value = "";
          document.getElementById("quick-notes").value = "";
          const txtDesc = document.getElementById("quick-text-desc");
          if (txtDesc) txtDesc.value = "";
          loadUnifiedState();
        } else {
          showToast("Error saving record", "error");
        }
      } catch (err) {
        showToast("Error connecting to server", "error");
      }
    });
  }

  // 2. Submit Customer Order Form
  const formOrder = document.getElementById("form-add-order");
  if (formOrder) {
    formOrder.addEventListener("submit", async (e) => {
      e.preventDefault();
      const payload = {
        customer_name: document.getElementById("ord-name").value,
        customer_city: document.getElementById("ord-city").value,
        tracking_number: document.getElementById("ord-tracking").value,
        selling_price: parseFloat(document.getElementById("ord-price").value) || 0
      };

      try {
        const res = await fetch("/api/order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          showToast(`Customer parcel logged`);
          document.getElementById("ord-name").value = "";
          document.getElementById("ord-city").value = "";
          document.getElementById("ord-tracking").value = "";
          document.getElementById("ord-price").value = "";
          formOrder.classList.add("hidden");
          loadUnifiedState();
        }
      } catch (err) {
        showToast("Error saving order", "error");
      }
    });
  }

  // Reset Clean Slate
  const btnReset = document.getElementById("btn-reset-clean");
  if (btnReset) {
    btnReset.addEventListener("click", async () => {
      if (confirm("Wipe all records and start from Rs. 0 clean slate?")) {
        try {
          const res = await fetch("/api/system/reset-clean", { method: "POST" });
          const data = await res.json();
          if (data.success) {
            showToast("All data wiped to 0 fresh start!");
            loadUnifiedState();
          }
        } catch (e) {
          showToast("Failed to reset", "error");
        }
      }
    });
  }
}
