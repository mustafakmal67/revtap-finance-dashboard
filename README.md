# PakCommerce™ Financial OS 🇵🇰
### Enterprise Financial Management, COD Tracking & Auto-Inventory for Pakistani E-Commerce Brands

A permanent, database-backed financial system tailored specifically for Pakistani dropshippers and e-commerce entrepreneurs.

---

## 🌟 Why This Replaces Temporary Calculators

1. **Permanent SQLite Database (`data/brand_finances.db`)**:
   - All your customer orders, product sourcing costs, inventory stock levels, ad spend, and courier payouts are saved permanently in a real database file on your disk.
   - 100% immune to clearing browser cache, browser crashes, or computer reboots.
2. **📱 Instant Mobile Phone Access (via QR Code & Local Wi-Fi)**:
   - When running on your computer, you can scan the on-screen **QR Code** with your smartphone.
   - View your live P&L and log new orders or expenses from your mobile browser anywhere on your home/office Wi-Fi.
3. **📦 Automatic Stock / Inventory Inflow & Count Down**:
   - When you buy 50 or 100 units from suppliers (Shah Alam Market Lahore, Bolton Market Karachi, Raja Bazar, China imports), log a **Stock Purchase Order**.
   - As orders are logged and dispatched, the system **automatically decrements your stock count** in real-time and warns you when stock is low!
4. **🇵🇰 Pakistan-Specific Economics**:
   - Cash on Delivery (COD) tracking with **PostEx, Trax, Leopards, Call Courier, TCS, and Rider**.
   - **Bank Ad Card Tax Engine**: Automatically calculates the 5-10% Withholding Tax (WHT) + 3-4% foreign exchange markup on Meta/TikTok ads.
   - **Real Blended Net Profit**: Factors in your Return to Origin (RTO) rate so return losses never surprise you.

---

## 🚀 How to Start

### Option 1: Desktop Shortcut
Go to your **Desktop** and double-click **`PakCommerce-Financial-OS.bat`** or **`PakCommerce OS`**.

### Option 2: Command Line
```powershell
cd C:\Users\DELL\.gemini\antigravity\scratch\pak-commerce-os
node server.js
```
Then open:
- 💻 **Desktop Browser**: `http://localhost:5000`
- 📱 **Mobile Phone Browser**: Scan the QR code or open `http://<YOUR-LOCAL-IP>:5000`

---

## 🛡️ Database Backups & Export
- **Automated Snapshots**: Backups are saved in `data/backups/`.
- **1-Click Backup**: Click the **Save** icon at the top of the dashboard anytime.
- **Export to Excel**: Click **Export CSV** on the Orders tab to download your complete bookkeeping spreadsheet.
