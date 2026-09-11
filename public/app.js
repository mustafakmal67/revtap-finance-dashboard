// RevTap™ Financial OS - Dark Mode Unified Client Controller (Mustafa)
let currentFinanceData = null;
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
    `⛽ Petrol & Work Costs: ${formatPKR(d.totalOtherExpenses)}\n` +
    `--------------------------------\n` +
    `📦 Total Customer Orders: ${d.totalOrdersCount}`;

  navigator.clipboard.writeText(text).then(() => {
    showToast("Financial summary copied to clipboard!");
  }).catch(() => {
    showToast("Summary copied!");
  });
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

// Initialize on Load
window.addEventListener("DOMContentLoaded", () => {
  setDefaultDates();
  setupEventListeners();
  loadSystemInfo();
  loadUnifiedState();

  // Periodic background sync every 10s
  setInterval(() => {
    loadUnifiedState(true);
  }, 10000);
});

// Set today's date in all date inputs
function setDefaultDates() {
  const today = new Date().toISOString().slice(0, 10);
  const dateInputs = ["ctx-date", "ad-date", "stk-date", "work-exp-date"];
  dateInputs.forEach(id => {
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
// 2. LOAD UNIFIED STATE (FETCH FROM SQLITE)
// -----------------------------------------------------------------------------
async function loadUnifiedState(silent = false) {
  try {
    const res = await fetch("/api/state");
    const json = await res.json();
    if (!json.success) return;

    const d = json.data;
    currentFinanceData = d;

    // 1. Master Hero Profit Display
    const heroProfit = document.getElementById("hero-net-profit");
    if (heroProfit) {
      heroProfit.textContent = formatPKR(d.netPocketedProfit);
      if (d.netPocketedProfit < 0) {
        heroProfit.className = "text-3xl sm:text-5xl font-bold font-mono text-rose-400 tracking-normal";
      } else {
        heroProfit.className = "text-3xl sm:text-5xl font-bold font-mono text-white tracking-normal";
      }
    }

    const heroStatusPill = document.getElementById("hero-status-pill");
    if (heroStatusPill) {
      if (d.netPocketedProfit >= 0) {
        heroStatusPill.className = "pill-badge-green";
        heroStatusPill.textContent = "● In Profit";
      } else {
        heroStatusPill.className = "pill-badge-rose";
        heroStatusPill.textContent = "● Investment Mode";
      }
    }

    // 2. 4 Snapshot Badges
    const snapCourierGot = document.getElementById("snap-courier-got");
    if (snapCourierGot) snapCourierGot.textContent = formatPKR(d.totalCourierReceived);

    const snapCourierPaid = document.getElementById("snap-courier-paid");
    if (snapCourierPaid) snapCourierPaid.textContent = formatPKR(d.totalCourierPaid);

    const snapAdsTotal = document.getElementById("snap-ads-total");
    if (snapAdsTotal) snapAdsTotal.textContent = formatPKR(d.totalEffectiveAds);

    const snapExpensesTotal = document.getElementById("snap-expenses-total");
    if (snapExpensesTotal) snapExpensesTotal.textContent = formatPKR(d.totalOtherExpenses);

    // 3. Hub Header Total Badges
    const sumAds = document.getElementById("disp-ad-spend-sum");
    if (sumAds) sumAds.textContent = `Total: ${formatPKR(d.totalEffectiveAds)}`;

    const sumStock = document.getElementById("disp-stock-sum");
    if (sumStock) sumStock.textContent = `Total Sourced: ${formatPKR(d.totalStockCost)}`;

    const sumExp = document.getElementById("disp-expenses-sum");
    if (sumExp) sumExp.textContent = `Total: ${formatPKR(d.totalOtherExpenses)}`;

    // 4. Render All Hub Tables
    renderCourierTransactions(d.courierTx);
    renderAdSpends(d.adSpends);
    renderStockEntries(d.stockEntries);
    renderWorkExpenses(d.expenses);
    renderOrders(d.orders);

    updateAutoSaveBadge(d.lastUpdated);
    if (!silent) lucide.createIcons();
  } catch (err) {
    console.error("Failed to load state:", err);
  }
}

// -----------------------------------------------------------------------------
// 3. RENDER HUB TABLES
// -----------------------------------------------------------------------------

// Hub 1: Courier Transactions
function renderCourierTransactions(list) {
  const tbody = document.getElementById("courier-tx-tbody");
  if (!tbody) return;

  if (!list || list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="py-5 text-center text-slate-500 text-xs">No courier transactions logged yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(t => {
    const isRecv = t.type === "RECEIVED_FROM_COURIER";
    const typeBadge = isRecv 
      ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60">Received</span>`
      : `<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-950/80 text-amber-300 border border-amber-700/60">Paid</span>`;
    
    const amtColor = isRecv ? "text-emerald-400" : "text-amber-300";
    const amtSign = isRecv ? "+" : "-";

    return `
      <tr class="hover:bg-white/[0.02] transition">
        <td class="py-2 px-2.5 font-mono text-[11px] text-slate-300">${t.tx_date}</td>
        <td class="py-2 px-2">${typeBadge}</td>
        <td class="py-2 px-2 font-medium text-white">${t.courier}</td>
        <td class="py-2 px-2 text-right font-mono font-semibold ${amtColor} text-xs">${amtSign} ${formatPKR(t.amount)}</td>
        <td class="py-2 px-2 text-center">
          <button onclick="deleteCourierTx('${t.id}')" class="p-1 text-slate-500 hover:text-rose-400 transition" title="Delete">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </td>
      </tr>
    `;
  }).join("");
  lucide.createIcons();
}

async function deleteCourierTx(id) {
  try {
    const res = await fetch(`/api/courier-tx/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      showToast("Courier record removed");
      loadUnifiedState();
    }
  } catch (e) {}
}

// Hub 2: Ad Spend Entries
function renderAdSpends(list) {
  const tbody = document.getElementById("ad-spend-tbody");
  if (!tbody) return;

  if (!list || list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="py-5 text-center text-slate-500 text-xs">No ad spend logged yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(a => `
    <tr class="hover:bg-white/[0.02] transition">
      <td class="py-2 px-2.5 font-mono text-[11px] text-slate-300">${a.spend_date}</td>
      <td class="py-2 px-2">
        <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-950/80 text-sky-300 border border-sky-700/60">${a.platform}</span>
      </td>
      <td class="py-2 px-2 text-white font-normal text-xs truncate max-w-[120px]">${a.campaign_name || 'Campaign'}</td>
      <td class="py-2 px-2 text-right font-mono font-semibold text-sky-300 text-xs">${formatPKR(a.effective_spend)}</td>
      <td class="py-2 px-2 text-center">
        <button onclick="deleteAdSpend('${a.id}')" class="p-1 text-slate-500 hover:text-rose-400 transition" title="Delete">
          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
        </button>
      </td>
    </tr>
  `).join("");
  lucide.createIcons();
}

async function deleteAdSpend(id) {
  try {
    const res = await fetch(`/api/ad-spend/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      showToast("Ad spend entry removed");
      loadUnifiedState();
    }
  } catch (e) {}
}

// Hub 3: Stock Entries
function renderStockEntries(list) {
  const tbody = document.getElementById("stock-tbody");
  if (!tbody) return;

  if (!list || list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="py-5 text-center text-slate-500 text-xs">No inventory batches logged yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(s => `
    <tr class="hover:bg-white/[0.02] transition">
      <td class="py-2 px-2.5 font-mono text-[11px] text-slate-300">${s.entry_date}</td>
      <td class="py-2 px-2 font-medium text-white text-xs">${s.item_name}</td>
      <td class="py-2 px-2 text-slate-400 text-[11px]">${s.supplier || '—'}</td>
      <td class="py-2 px-2 text-right font-mono font-semibold text-emerald-400 text-xs">${formatPKR(s.total_cost)}</td>
      <td class="py-2 px-2 text-center">
        <button onclick="deleteStockEntry('${s.id}')" class="p-1 text-slate-500 hover:text-rose-400 transition" title="Delete">
          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
        </button>
      </td>
    </tr>
  `).join("");
  lucide.createIcons();
}

async function deleteStockEntry(id) {
  try {
    const res = await fetch(`/api/stock-entry/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      showToast("Stock entry removed");
      loadUnifiedState();
    }
  } catch (e) {}
}

// Hub 4: Business & Work Expenses
function renderWorkExpenses(list) {
  const tbody = document.getElementById("work-exp-tbody");
  if (!tbody) return;

  if (!list || list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="py-5 text-center text-slate-500 text-xs">No work expenses logged yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(e => `
    <tr class="hover:bg-white/[0.02] transition">
      <td class="py-2 px-2.5 font-mono text-[11px] text-slate-300">${e.expense_date}</td>
      <td class="py-2 px-2">
        <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-950/80 text-rose-300 border border-rose-700/60">${e.category}</span>
      </td>
      <td class="py-2 px-2 text-white font-normal text-xs truncate max-w-[140px]">${e.description}</td>
      <td class="py-2 px-2 text-right font-mono font-semibold text-rose-400 text-xs">${formatPKR(e.amount)}</td>
      <td class="py-2 px-2 text-center">
        <button onclick="deleteWorkExpense('${e.id}')" class="p-1 text-slate-500 hover:text-rose-400 transition" title="Delete">
          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
        </button>
      </td>
    </tr>
  `).join("");
  lucide.createIcons();
}

async function deleteWorkExpense(id) {
  try {
    const res = await fetch(`/api/expense/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      showToast("Work expense removed");
      loadUnifiedState();
    }
  } catch (e) {}
}

// Hub 5: Orders & Dispatches
function renderOrders(orders) {
  const tbody = document.getElementById("orders-tbody");
  if (!tbody) return;

  if (!orders || orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="py-5 text-center text-slate-500 text-xs">No customer parcels logged yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = orders.map(o => {
    let statusClass = "bg-sky-950/80 text-sky-300 border-sky-700/60";
    if (o.status === "Delivered") statusClass = "bg-emerald-950/80 text-emerald-300 border-emerald-700/60";
    else if (o.status === "Returned") statusClass = "bg-rose-950/80 text-rose-300 border-rose-700/60";
    else if (o.status === "Cancelled") statusClass = "bg-slate-800 text-slate-400 border-slate-700";

    return `
      <tr class="hover:bg-white/[0.02] transition">
        <td class="py-2 px-2.5 font-mono text-[11px] text-white">${o.id}</td>
        <td class="py-2 px-2">
          <span class="font-medium text-white block text-xs">${o.customer_name}</span>
          <span class="text-[10px] text-slate-400">${o.customer_city}</span>
        </td>
        <td class="py-2 px-2 font-mono text-[11px] text-slate-300">${o.tracking_number || '—'}</td>
        <td class="py-2 px-2 text-right font-mono font-semibold text-white text-xs">${formatPKR(o.selling_price)}</td>
        <td class="py-2 px-2 text-center">
          <button onclick="cycleOrderStatus('${o.id}')" title="Click to toggle status" class="px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${statusClass} cursor-pointer hover:opacity-80 transition active:scale-95">
            ${o.status} ↻
          </button>
        </td>
        <td class="py-2 px-2 text-center">
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
// 4. EVENT LISTENERS & FORM SUBMISSIONS
// -----------------------------------------------------------------------------
function setupEventListeners() {
  
  // Courier Tab Toggle (Paid vs Received)
  const btnPaid = document.getElementById("tab-btn-courier-paid");
  const btnRecv = document.getElementById("tab-btn-courier-recv");
  const ctxType = document.getElementById("ctx-type");
  const ctxLabel = document.getElementById("ctx-amount-label");
  const ctxSubmit = document.getElementById("btn-submit-courier-tx");

  if (btnPaid && btnRecv) {
    btnPaid.addEventListener("click", () => {
      ctxType.value = "PAID_TO_COURIER";
      btnPaid.className = "px-2.5 py-1 rounded-lg bg-amber-600 text-white transition";
      btnRecv.className = "px-2.5 py-1 rounded-lg text-slate-400 hover:text-white transition";
      ctxLabel.className = "block text-[11px] font-semibold text-amber-300 mb-1";
      ctxLabel.textContent = "Amount Paid (Rs.) *";
      ctxSubmit.className = "py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shadow transition flex items-center justify-center gap-1.5";
      ctxSubmit.innerHTML = `<i data-lucide="plus" class="w-4 h-4"></i><span>Save Record</span>`;
      lucide.createIcons();
    });

    btnRecv.addEventListener("click", () => {
      ctxType.value = "RECEIVED_FROM_COURIER";
      btnRecv.className = "px-2.5 py-1 rounded-lg bg-emerald-600 text-white transition";
      btnPaid.className = "px-2.5 py-1 rounded-lg text-slate-400 hover:text-white transition";
      ctxLabel.className = "block text-[11px] font-semibold text-emerald-300 mb-1";
      ctxLabel.textContent = "Remittance Got (Rs.) *";
      ctxSubmit.className = "py-2.5 px-4 rounded-xl btn-emerald text-white font-semibold text-xs shadow transition flex items-center justify-center gap-1.5";
      ctxSubmit.innerHTML = `<i data-lucide="plus" class="w-4 h-4"></i><span>Log Remittance</span>`;
      lucide.createIcons();
    });
  }

  // Work Expense Category Pills
  const catPills = document.querySelectorAll(".category-pill");
  const hiddenExpCat = document.getElementById("work-exp-cat");
  catPills.forEach(pill => {
    pill.addEventListener("click", () => {
      catPills.forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      if (hiddenExpCat) {
        hiddenExpCat.value = pill.getAttribute("data-cat");
      }
    });
  });

  // Toggle Customer Order Form
  const btnToggleOrder = document.getElementById("btn-toggle-add-order");
  const formAddOrder = document.getElementById("form-add-order");
  if (btnToggleOrder && formAddOrder) {
    btnToggleOrder.addEventListener("click", () => {
      formAddOrder.classList.toggle("hidden");
    });
  }

  // 1. Submit Courier Transaction
  const formCourier = document.getElementById("form-courier-tx");
  if (formCourier) {
    formCourier.addEventListener("submit", async (e) => {
      e.preventDefault();
      const payload = {
        type: document.getElementById("ctx-type").value,
        tx_date: document.getElementById("ctx-date").value,
        courier: document.getElementById("ctx-courier").value,
        amount: parseFloat(document.getElementById("ctx-amount").value) || 0,
        reference_note: document.getElementById("ctx-notes").value
      };

      try {
        const res = await fetch("/api/courier-tx", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          showToast(`Saved: ${payload.courier} Rs. ${payload.amount}`);
          document.getElementById("ctx-amount").value = "";
          document.getElementById("ctx-notes").value = "";
          loadUnifiedState();
        }
      } catch (err) {
        showToast("Error saving courier record", "error");
      }
    });
  }

  // 2. Submit Ad Spend
  const formAds = document.getElementById("form-ad-spend");
  if (formAds) {
    formAds.addEventListener("submit", async (e) => {
      e.preventDefault();
      const payload = {
        spend_date: document.getElementById("ad-date").value,
        platform: document.getElementById("ad-platform").value,
        raw_spend: parseFloat(document.getElementById("ad-raw-amount").value) || 0,
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
          showToast(`Logged ${payload.platform} (+8% Tax)`);
          document.getElementById("ad-raw-amount").value = "";
          document.getElementById("ad-campaign").value = "";
          loadUnifiedState();
        }
      } catch (err) {
        showToast("Error saving ad spend", "error");
      }
    });
  }

  // 3. Submit Stock Entry
  const formStock = document.getElementById("form-stock-entry");
  if (formStock) {
    formStock.addEventListener("submit", async (e) => {
      e.preventDefault();
      const payload = {
        entry_date: document.getElementById("stk-date").value,
        item_name: document.getElementById("stk-name").value,
        supplier: document.getElementById("stk-supplier").value,
        total_cost: parseFloat(document.getElementById("stk-cost").value) || 0,
        units_count: parseInt(document.getElementById("stk-units").value, 10) || 0
      };

      try {
        const res = await fetch("/api/stock-entry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          showToast(`Stock batch saved!`);
          document.getElementById("stk-name").value = "";
          document.getElementById("stk-cost").value = "";
          document.getElementById("stk-units").value = "";
          document.getElementById("stk-supplier").value = "";
          loadUnifiedState();
        }
      } catch (err) {
        showToast("Error saving stock entry", "error");
      }
    });
  }

  // 4. Submit Work / Petrol Expense
  const formWork = document.getElementById("form-work-expense");
  if (formWork) {
    formWork.addEventListener("submit", async (e) => {
      e.preventDefault();
      const payload = {
        expense_date: document.getElementById("work-exp-date").value,
        category: document.getElementById("work-exp-cat").value,
        description: document.getElementById("work-exp-desc").value,
        amount: parseFloat(document.getElementById("work-exp-amt").value) || 0
      };

      try {
        const res = await fetch("/api/expense", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          showToast(`Logged ${payload.category}: Rs. ${payload.amount}`);
          document.getElementById("work-exp-desc").value = "";
          document.getElementById("work-exp-amt").value = "";
          loadUnifiedState();
        }
      } catch (err) {
        showToast("Error saving work expense", "error");
      }
    });
  }

  // 5. Submit Customer Parcel
  if (formAddOrder) {
    formAddOrder.addEventListener("submit", async (e) => {
      e.preventDefault();
      const payload = {
        customer_name: document.getElementById("ord-cust-name").value,
        customer_city: document.getElementById("ord-cust-city").value,
        tracking_number: document.getElementById("ord-cust-tracking").value,
        selling_price: parseFloat(document.getElementById("ord-cust-price").value) || 0
      };

      try {
        const res = await fetch("/api/order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          showToast(`Logged parcel: ${payload.customer_name}`);
          document.getElementById("ord-cust-name").value = "";
          document.getElementById("ord-cust-city").value = "";
          document.getElementById("ord-cust-tracking").value = "";
          document.getElementById("ord-cust-price").value = "";
          formAddOrder.classList.add("hidden");
          loadUnifiedState();
        }
      } catch (err) {
        showToast("Error saving order", "error");
      }
    });
  }

  // QR Modal Close
  const btnCloseQr = document.getElementById("btn-close-qr");
  const btnDoneQr = document.getElementById("btn-done-qr");
  if (btnCloseQr) btnCloseQr.addEventListener("click", closeQrModal);
  if (btnDoneQr) btnDoneQr.addEventListener("click", closeQrModal);

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
