/* =========================================
   JR Digital Studio - Database Architecture V2 (Cloud & Storage Sync)
   ========================================= */

const db = new Dexie("JRAccountingDB");

// Database Schema
db.version(2).stores({
    settings: 'key, value',
    groups: '++id, name, parent_id, type', 
    ledgers: '++id, name, group_id, opening_balance, balance_type, address, phone, is_system', 
    vouchers: '++id, voucher_no, date, type, total_amount, narration, tax_mode, created_at', 
    voucher_entries: '++id, voucher_id, ledger_id, debit, credit, qty, rate'
});

// Firebase Cloud Connection
const firebaseConfig = {
    apiKey: "AIzaSyDCY5dysvmJpJLXjAwbCzOBIiP-dSKVt4U",
    authDomain: "jr-accounting-5bf92.firebaseapp.com",
    projectId: "jr-accounting-5bf92",
    storageBucket: "jr-accounting-5bf92.firebasestorage.app",
    messagingSenderId: "523295713925",
    appId: "1:523295713925:web:af01d4cf83277c7c02d7ec"
};

firebase.initializeApp(firebaseConfig);
const firestore = firebase.firestore();
const storage = firebase.storage(); // NEW: Storage for Attachments

// Cloud par data bhejna (Upload)
async function pushToCloud() {
    console.log("Syncing to Cloud...");
    try {
        const data = {
            settings: await db.settings.toArray(),
            groups: await db.groups.toArray(),
            ledgers: await db.ledgers.toArray(),
            vouchers: await db.vouchers.toArray(),
            voucher_entries: await db.voucher_entries.toArray()
        };
        await firestore.collection("jr_erp_data").doc("settings").set({ payload: JSON.stringify(data.settings) });
        await firestore.collection("jr_erp_data").doc("groups").set({ payload: JSON.stringify(data.groups) });
        await firestore.collection("jr_erp_data").doc("ledgers").set({ payload: JSON.stringify(data.ledgers) });
        await firestore.collection("jr_erp_data").doc("vouchers").set({ payload: JSON.stringify(data.vouchers) });
        await firestore.collection("jr_erp_data").doc("voucher_entries").set({ payload: JSON.stringify(data.voucher_entries) });
        console.log("Cloud Sync Success!");
    } catch (e) { 
        console.error("Sync Error: ", e); 
    }
}

// Cloud se data lana (Download)
async function pullFromCloud() {
    console.log("Downloading from Cloud...");
    try {
        const cols = ['settings', 'groups', 'ledgers', 'vouchers', 'voucher_entries'];
        let hasData = false;
        let cloudData = {};
        for(let col of cols) {
            const doc = await firestore.collection("jr_erp_data").doc(col).get();
            if(doc.exists) { 
                hasData = true; 
                cloudData[col] = JSON.parse(doc.data().payload); 
            }
        }
        if(hasData) {
            await db.settings.clear(); 
            await db.groups.clear(); 
            await db.ledgers.clear(); 
            await db.vouchers.clear(); 
            await db.voucher_entries.clear();
            
            if(cloudData.settings) await db.settings.bulkAdd(cloudData.settings);
            if(cloudData.groups) await db.groups.bulkAdd(cloudData.groups);
            if(cloudData.ledgers) await db.ledgers.bulkAdd(cloudData.ledgers);
            if(cloudData.vouchers) await db.vouchers.bulkAdd(cloudData.vouchers);
            if(cloudData.voucher_entries) await db.voucher_entries.bulkAdd(cloudData.voucher_entries);
            console.log("Cloud Restore Success!");
        } else {
            console.log("No cloud data found. Initializing defaults...");
            await initializeDefaultData();
        }
    } catch (e) { 
        console.error("Download Error: ", e); 
    }
}

// Default Data Setup
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
            
            await pushToCloud();
        }
    } catch (error) { 
        console.error("DB Init Error: ", error); 
    }
}

// Automatically call init on load
initializeDefaultData();
