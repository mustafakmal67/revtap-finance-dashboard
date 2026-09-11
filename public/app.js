// RevTap™ Financial OS - FinPay-Inspired Dark Mode Client Controller (Mustafa)
let currentFinanceData = null;
let currentTxFilter = 'all';
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
  toast.className = `fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-2xl text-xs font-semibold text-white shadow-2xl flex items-center gap-2 animate-fade-in ${
    type === "success" 
      ? "bg-emerald-600/90 border border-emerald-400/50 backdrop-blur-xl shadow-emerald-950/50" 
      : "bg-rose-600/90 border border-rose-400/50 backdrop-blur-xl shadow-rose-950/50"
  }`;
  toast.innerHTML = `<i data-lucide="${type === 'success' ? 'check-circle' : 'alert-circle'}" class="w-4 h-4"></i> ${msg}`;
  document.body.appendChild(toast);
  lucide.createIcons();
  setTimeout(() => toast.remove(), 3200);
}

// View Switcher
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

// Modal Controllers
function openModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.remove("hidden");
    el.classList.add("flex");
  }
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.add("hidden");
    el.classList.remove("flex");
  }
}

function openQrModal() { openModal("modal-qr"); }
function closeQrModal() { closeModal("modal-qr"); }

// Copy financial summary to clipboard
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
    showToast("Summary copied!");
  });
}

// Initialize on Load
window.addEventListener("DOMContentLoaded", () => {
  setDefaultDates();
  initCharts();
  setupEventListeners();
  loadSystemInfo();
  loadUnifiedState();

  // Periodic background sync every 8s
  setInterval(() => {
    loadUnifiedState(true);
  }, 8000);
});

function setDefaultDates() {
  const today = new Date().toISOString().slice(0, 10);
  ["inflow-date", "cfee-date", "ad-date", "stock-date", "exp-date"].forEach(id => {
    const el = document.getElementById(id);
    if (el && !el.value) el.value = today;
  });
}

// -----------------------------------------------------------------------------
// 1. SYSTEM INFO & QR CODE
// -----------------------------------------------------------------------------
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
// 2. CHART.JS INITIALIZATION (MATCHES FINPAY INSPIRATION)
// -----------------------------------------------------------------------------
function initCharts() {
  // 1. Dual Bar Chart (Money Statistics)
  const ctxBar = document.getElementById("chartMoneyStats");
  if (ctxBar) {
    barChartInstance = new Chart(ctxBar.getContext("2d"), {
      type: "bar",
      data: {
        labels: ["Remittances", "Ad Spend (+Tax)", "Stock Sourcing", "Courier Paid", "Other Exp", "Net Pocket"],
        datasets: [{
          data: [0, 0, 0, 0, 0, 0],
          backgroundColor: [
            "#10b981", // Emerald Inflow
            "#38bdf8", // Sky Ads
            "#a855f7", // Purple Stock
            "#f59e0b", // Amber Courier
            "#f43f5e", // Rose Expenses
            "#2563eb"  // Blue Net Profit
          ],
          borderRadius: 8,
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
            ticks: { color: "#94a3b8", font: { size: 10, family: 'Poppins' } }
          },
          y: {
            grid: { color: "rgba(255, 255, 255, 0.05)" },
            ticks: {
              color: "#94a3b8",
              font: { size: 10 },
              callback: (val) => val >= 1000 ? (val / 1000).toFixed(0) + "k" : val
            }
          }
        }
      }
    });
  }

  // 2. Donut Chart (Cost Breakdown Statistics)
  const ctxDonut = document.getElementById("chartExpenseDonut");
  if (ctxDonut) {
    donutChartInstance = new Chart(ctxDonut.getContext("2d"), {
      type: "doughnut",
      data: {
        labels: ["Ad Spend", "Stock Sourcing", "Courier Paid", "Other Expenses"],
        datasets: [{
          data: [0, 0, 0, 0],
          backgroundColor: ["#38bdf8", "#a855f7", "#f59e0b", "#f43f5e"],
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
// 3. LOAD UNIFIED STATE (FETCH FROM SQLITE)
// -----------------------------------------------------------------------------
async function loadUnifiedState(silent = false) {
  try {
    const res = await fetch("/api/state");
    const json = await res.json();
    if (!json.success) return;

    const d = json.data;
    currentFinanceData = d;

    // 1. Master Hero Visa Card Net Profit
    const heroProfit = document.getElementById("hero-net-profit");
    if (heroProfit) {
      heroProfit.textContent = formatPKR(d.netPocketedProfit);
      if (d.netPocketedProfit < 0) {
        heroProfit.className = "text-3xl sm:text-4xl font-bold font-mono text-rose-300 tracking-normal";
      } else {
        heroProfit.className = "text-3xl sm:text-4xl font-bold font-mono text-white tracking-normal";
      }
    }

    const heroStatusPill = document.getElementById("hero-status-pill");
    if (heroStatusPill) {
      if (d.netPocketedProfit >= 0) {
        heroStatusPill.className = "px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 border border-white/30 text-white";
        heroStatusPill.textContent = "● Live Profit";
      } else {
        heroStatusPill.className = "px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/30 border border-rose-400/40 text-rose-200";
        heroStatusPill.textContent = "● Investment Mode";
      }
    }

    // 2. Top 3 Metric Cards
    const statInflow = document.getElementById("stat-total-inflow");
    if (statInflow) statInflow.textContent = formatPKR(d.totalCourierReceived);

    const statOutflow = document.getElementById("stat-total-outflow");
    if (statOutflow) statOutflow.textContent = formatPKR(d.totalCashOutflow);

    const statPending = document.getElementById("stat-pending-courier");
    if (statPending) statPending.textContent = formatPKR(d.pendingCourierCash);

    const dispBalance = document.getElementById("disp-stat-balance");
    if (dispBalance) dispBalance.textContent = formatPKR(d.netPocketedProfit);

    // 3. Update Legend Amounts
    const legAds = document.getElementById("leg-ads-amt");
    if (legAds) legAds.textContent = formatPKR(d.totalEffectiveAds);

    const legStock = document.getElementById("leg-stock-amt");
    if (legStock) legStock.textContent = formatPKR(d.totalStockCost);

    const legCourier = document.getElementById("leg-courier-amt");
    if (legCourier) legCourier.textContent = formatPKR(d.totalCourierPaid);

    const legExp = document.getElementById("leg-exp-amt");
    if (legExp) legExp.textContent = formatPKR(d.totalOtherExpenses);

    // 4. Update Bar & Donut Charts
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

    // 5. Render Recent Transactions Table
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
// 4. TRANSACTIONS LEDGER RENDERING (CHRONOLOGICAL STREAM)
// -----------------------------------------------------------------------------
function filterRecentTx(filter) {
  currentTxFilter = filter;
  const buttons = document.querySelectorAll(".tx-filter-btn");
  buttons.forEach(b => b.classList.remove("active", "bg-blue-600", "text-white"));
  if (event && event.currentTarget) {
    event.currentTarget.classList.add("active", "bg-blue-600", "text-white");
  }
  if (currentFinanceData) {
    renderRecentTransactions(currentFinanceData.allTransactions);
  }
}

function renderRecentTransactions(list) {
  const tbody = document.getElementById("recent-tx-tbody");
  if (!tbody) return;

  if (!list || list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-slate-500 text-xs">No transactions logged yet. Click any button above to log remittances, ads, or expenses!</td></tr>`;
    return;
  }

  // Filter list based on current active tab
  let filtered = list;
  if (currentTxFilter === 'income') filtered = list.filter(t => t.type === 'INCOME');
  else if (currentTxFilter === 'ads') filtered = list.filter(t => t.kind === 'ads');
  else if (currentTxFilter === 'stock') filtered = list.filter(t => t.kind === 'stock');
  else if (currentTxFilter === 'expenses') filtered = list.filter(t => t.kind === 'other_expense');

  tbody.innerHTML = filtered.map(t => {
    const isIncome = t.type === 'INCOME';
    const amtColor = isIncome ? "text-emerald-400 font-bold" : "text-slate-200 font-semibold";
    const amtSign = isIncome ? "+" : "-";

    let iconHtml = `<i data-lucide="arrow-down-left" class="w-3.5 h-3.5 text-emerald-400"></i>`;
    if (t.kind === 'ads') iconHtml = `<i data-lucide="megaphone" class="w-3.5 h-3.5 text-sky-400"></i>`;
    else if (t.kind === 'stock') iconHtml = `<i data-lucide="boxes" class="w-3.5 h-3.5 text-purple-400"></i>`;
    else if (t.kind === 'other_expense') iconHtml = `<i data-lucide="receipt" class="w-3.5 h-3.5 text-rose-400"></i>`;
    else if (t.kind === 'courier' && !isIncome) iconHtml = `<i data-lucide="truck" class="w-3.5 h-3.5 text-amber-400"></i>`;

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
          <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold ${isIncome ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60' : 'bg-slate-800 text-slate-300 border border-slate-700'}">
            ${t.status}
          </span>
        </td>
        <td class="py-3 px-3 text-center">
          <button onclick="deleteTx('${t.kind}', '${t.id}')" class="p-1 text-slate-500 hover:text-rose-400 transition" title="Delete">
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
    const amtColor = isIncome ? "text-emerald-400 font-bold" : "text-white font-semibold";
    const amtSign = isIncome ? "+" : "-";

    return `
      <tr class="hover:bg-white/[0.02] transition">
        <td class="py-3 px-3 font-mono text-[11px] text-slate-400">${t.id}</td>
        <td class="py-3 px-3">
          <span class="font-medium text-white block text-xs">${t.title}</span>
          <span class="text-[10px] text-slate-400">${t.category}</span>
        </td>
        <td class="py-3 px-3 font-mono text-[11px] text-slate-300">${t.date}</td>
        <td class="py-3 px-3 text-slate-400 text-xs">${t.notes || '—'}</td>
        <td class="py-3 px-3 text-right font-mono ${amtColor} text-xs">${amtSign} ${formatPKR(t.amount)}</td>
        <td class="py-3 px-3 text-center">
          <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold ${isIncome ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60' : 'bg-slate-800 text-slate-300 border border-slate-700'}">
            ${t.status}
          </span>
        </td>
        <td class="py-3 px-3 text-center">
          <button onclick="deleteTx('${t.kind}', '${t.id}')" class="p-1 text-slate-500 hover:text-rose-400 transition" title="Delete">
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
    showToast("Error removing transaction", "error");
  }
}

// -----------------------------------------------------------------------------
// 5. ORDERS VIEW RENDERING
// -----------------------------------------------------------------------------
function renderOrders(orders) {
  const tbody = document.getElementById("orders-full-tbody");
  if (!tbody) return;

  if (!orders || orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-slate-500 text-xs">No customer orders logged yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = orders.map(o => {
    let statusClass = "bg-sky-950/80 text-sky-300 border-sky-700/60";
    if (o.status === "Delivered") statusClass = "bg-emerald-950/80 text-emerald-300 border-emerald-700/60";
    else if (o.status === "Returned") statusClass = "bg-rose-950/80 text-rose-300 border-rose-700/60";

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
          <button onclick="cycleOrderStatus('${o.id}')" title="Click to change status" class="px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${statusClass} cursor-pointer hover:opacity-80 transition active:scale-95">
            ${o.status} ↻
          </button>
        </td>
        <td class="py-2.5 px-3 text-center">
          <button onclick="deleteOrder('${o.id}')" class="p-1 text-slate-500 hover:text-rose-400 transition" title="Delete">
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
// 6. FORM SUBMISSION EVENT LISTENERS
// -----------------------------------------------------------------------------
function setupEventListeners() {
  
  // 1. Submit Inflow (Remittance Received)
  const formInflow = document.getElementById("form-inflow");
  if (formInflow) {
    formInflow.addEventListener("submit", async (e) => {
      e.preventDefault();
      const payload = {
        type: "RECEIVED_FROM_COURIER",
        tx_date: document.getElementById("inflow-date").value,
        courier: document.getElementById("inflow-courier").value,
        amount: parseFloat(document.getElementById("inflow-amount").value) || 0,
        reference_note: document.getElementById("inflow-notes").value
      };

      try {
        const res = await fetch("/api/courier-tx", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          showToast(`Remittance Saved: ${payload.courier} Rs. ${payload.amount}`);
          document.getElementById("inflow-amount").value = "";
          document.getElementById("inflow-notes").value = "";
          closeModal("modal-add-inflow");
          loadUnifiedState();
        }
      } catch (err) {
        showToast("Error saving remittance", "error");
      }
    });
  }

  // 2. Submit Courier Fee
  const formCourierFee = document.getElementById("form-courier-fee");
  if (formCourierFee) {
    formCourierFee.addEventListener("submit", async (e) => {
      e.preventDefault();
      const payload = {
        type: "PAID_TO_COURIER",
        tx_date: document.getElementById("cfee-date").value,
        courier: document.getElementById("cfee-courier").value,
        amount: parseFloat(document.getElementById("cfee-amount").value) || 0,
        reference_note: document.getElementById("cfee-notes").value
      };

      try {
        const res = await fetch("/api/courier-tx", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          showToast(`Shipping Fee Saved: Rs. ${payload.amount}`);
          document.getElementById("cfee-amount").value = "";
          document.getElementById("cfee-notes").value = "";
          closeModal("modal-add-courier-fee");
          loadUnifiedState();
        }
      } catch (err) {
        showToast("Error saving fee", "error");
      }
    });
  }

  // 3. Submit Ad Spend
  const formAdSpend = document.getElementById("form-ad-spend");
  if (formAdSpend) {
    formAdSpend.addEventListener("submit", async (e) => {
      e.preventDefault();
      const payload = {
        spend_date: document.getElementById("ad-date").value,
        platform: document.getElementById("ad-platform").value,
        raw_spend: parseFloat(document.getElementById("ad-raw").value) || 0,
        bank_tax_percent: 8.0,
        campaign_name: document.getElementById("ad-campaign").value
      };

      try {
        const res = await fetch("/api/ad-spend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          showToast(`Ad Spend Logged with 8% Bank Tax`);
          document.getElementById("ad-raw").value = "";
          document.getElementById("ad-campaign").value = "";
          closeModal("modal-add-ad-spend");
          loadUnifiedState();
        }
      } catch (err) {
        showToast("Error saving ad spend", "error");
      }
    });
  }

  // 4. Submit Stock Entry
  const formStock = document.getElementById("form-stock");
  if (formStock) {
    formStock.addEventListener("submit", async (e) => {
      e.preventDefault();
      const payload = {
        entry_date: document.getElementById("stock-date").value,
        item_name: document.getElementById("stock-name").value,
        supplier: document.getElementById("stock-supplier").value,
        total_cost: parseFloat(document.getElementById("stock-cost").value) || 0,
        units_count: parseInt(document.getElementById("stock-units").value, 10) || 0
      };

      try {
        const res = await fetch("/api/stock-entry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          showToast(`Stock Batch Saved`);
          document.getElementById("stock-name").value = "";
          document.getElementById("stock-cost").value = "";
          document.getElementById("stock-units").value = "";
          document.getElementById("stock-supplier").value = "";
          closeModal("modal-add-stock");
          loadUnifiedState();
        }
      } catch (err) {
        showToast("Error saving stock entry", "error");
      }
    });
  }

  // 5. Submit Other Business Expense
  const formExpense = document.getElementById("form-expense");
  if (formExpense) {
    formExpense.addEventListener("submit", async (e) => {
      e.preventDefault();
      const payload = {
        expense_date: document.getElementById("exp-date").value,
        category: "Other Expense",
        description: document.getElementById("exp-desc").value,
        amount: parseFloat(document.getElementById("exp-amount").value) || 0
      };

      try {
        const res = await fetch("/api/expense", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          showToast(`Expense Saved: Rs. ${payload.amount}`);
          document.getElementById("exp-desc").value = "";
          document.getElementById("exp-amount").value = "";
          closeModal("modal-add-expense");
          loadUnifiedState();
        }
      } catch (err) {
        showToast("Error saving expense", "error");
      }
    });
  }

  // 6. Submit Customer Order
  const formOrder = document.getElementById("form-order");
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
          showToast(`Customer Order Saved`);
          document.getElementById("ord-name").value = "";
          document.getElementById("ord-city").value = "";
          document.getElementById("ord-tracking").value = "";
          document.getElementById("ord-price").value = "";
          closeModal("modal-add-order");
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
      if (confirm("Are you sure you want to wipe all records and start from Rs. 0 clean slate?")) {
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
