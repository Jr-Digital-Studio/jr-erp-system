/* =========================================
   JR Digital Studio - Database Architecture V2 (With Invoicing)
   ========================================= */

const db = new Dexie("JRAccountingDB");

// Database Schema (Updated with Invoicing, Party Details, and Qty/Rate)
db.version(2).stores({
    settings: 'key, value',
    groups: '++id, name, parent_id, type', 
    ledgers: '++id, name, group_id, opening_balance, balance_type, address, phone, is_system', 
    vouchers: '++id, voucher_no, date, type, total_amount, narration, tax_mode, created_at', 
    voucher_entries: '++id, voucher_id, ledger_id, debit, credit, qty, rate' // Qty & Rate added
});

async function initializeDefaultData() {
    try {
        const groupCount = await db.groups.count();
        if (groupCount === 0) {
            console.log("Setting up database for JR Digital Studio...");
            
            const defaultGroups = [
                { name: "Indirect Income", parent_id: 0, type: "Income" },
                { name: "Indirect Expenses", parent_id: 0, type: "Expense" },
                { name: "Sundry Debtors", parent_id: 0, type: "Asset" },       
                { name: "Sundry Creditors", parent_id: 0, type: "Liability" }, 
                { name: "Cash-in-Hand", parent_id: 0, type: "Asset" },
                { name: "Bank Accounts", parent_id: 0, type: "Asset" },
                { name: "Capital Account", parent_id: 0, type: "Liability" },
                { name: "Client Ad Budgets", parent_id: 0, type: "Liability" } 
            ];
            
            const groupIds = [];
            for (let g of defaultGroups) {
                const id = await db.groups.add(g);
                groupIds.push({ name: g.name, id: id });
            }
            const getGroupId = (name) => groupIds.find(g => g.name === name).id;

            const defaultLedgers = [
                { name: "Cash Account", group_id: getGroupId("Cash-in-Hand"), opening_balance: 0, balance_type: "Dr", address: "", phone: "", is_system: 1 },
                { name: "Digital Marketing Income", group_id: getGroupId("Indirect Income"), opening_balance: 0, balance_type: "Cr", address: "", phone: "", is_system: 0 },
                { name: "Graphic Design Income", group_id: getGroupId("Indirect Income"), opening_balance: 0, balance_type: "Cr", address: "", phone: "", is_system: 0 },
                { name: "Printing Income", group_id: getGroupId("Indirect Income"), opening_balance: 0, balance_type: "Cr", address: "", phone: "", is_system: 0 },
                { name: "Software Expenses", group_id: getGroupId("Indirect Expenses"), opening_balance: 0, balance_type: "Dr", address: "", phone: "", is_system: 0 },
                { name: "Office Expenses", group_id: getGroupId("Indirect Expenses"), opening_balance: 0, balance_type: "Dr", address: "", phone: "", is_system: 0 },
                { name: "Meta Ads Spend", group_id: getGroupId("Indirect Expenses"), opening_balance: 0, balance_type: "Dr", address: "", phone: "", is_system: 0 }
            ];
            await db.ledgers.bulkAdd(defaultLedgers);
            
            // Added Company Billing Settings
            await db.settings.bulkAdd([
                { key: "tax_mode", value: "NON-GST" },
                { key: "company_name", value: "JR Digital Studio" },
                { key: "company_address", value: "Mehsana, Gujarat, India" },
                { key: "company_phone", value: "8320146648, 8799170861" },
                { key: "company_email", value: "jrdigitalstudio8@gmail.com" },
                { key: "bank_name", value: "Your Bank Name" },
                { key: "bank_ac", value: "000000000000" },
                { key: "bank_ifsc", value: "IFSC00000" },
                { key: "upi_id", value: "jrdigital@upi" }
            ]);
        }
    } catch (error) { console.error("DB Init Error: ", error); }
}
initializeDefaultData();