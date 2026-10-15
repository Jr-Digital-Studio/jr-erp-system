/* =========================================
   JR Digital Studio - Advanced ERP Engine (Cloud + Backup Final)
   ========================================= */

let currentVoucherType = 'Sales';
let currentEditId = null;

// ==========================================
// 1. LOGIN SYSTEM & CLOUD SYNC
// ==========================================
async function checkLogin() {
    const u = document.getElementById('login-user').value;
    const p = document.getElementById('login-pass').value;
    const btn = document.querySelector('.login-box button');
    
    if (u === '8128075345' && p === 'Jiya@2026') {
        if(btn) { btn.innerText = "Syncing with Cloud... ⏳"; btn.disabled = true; }
        
        // Jadoo: Cloud se data load karega
        if(typeof pullFromCloud === 'function') {
            await pullFromCloud();
        }
        
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'flex';
        if(btn) { btn.innerText = "Secure Login"; btn.disabled = false; }
        loadDashboard();
    } else {
        document.getElementById('login-error').style.display = 'block';
    }
}

function logout() {
    document.getElementById('main-app').style.display = 'none';
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('login-pass').value = '';
}

// ==========================================
// 2. NAVIGATION & TABS
// ==========================================
function switchTab(tabId) {
    document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active-view'));
    document.getElementById(tabId + '-view').classList.add('active-view');
    document.querySelectorAll('.nav-menu a').forEach(l => {
        l.classList.remove('active');
        if (l.getAttribute('onclick').includes(tabId)) l.classList.add('active');
    });

    if (tabId === 'dashboard') loadDashboard();
    if (tabId === 'masters') showLedgerMode('create');
    if (tabId === 'settings') loadCompanySettings();
    if (tabId === 'reports') switchReport('daybook');
    if (tabId === 'quotation') {
        document.getElementById('q-date').valueAsDate = new Date();
        document.getElementById('q-entries').innerHTML = '';
        addQRow();
    }
    if (tabId === 'vouchers') {
        if (!document.getElementById('v-date').value) document.getElementById('v-date').valueAsDate = new Date();
        getNextVoucherNo();
        openVoucherType('Sales');
    }
}

// ==========================================
// 3. LEDGER MASTER (CREATE / ALTER / DISPLAY)
// ==========================================
async function showLedgerMode(mode, fromVoucher = false) {
    if (mode === 'create') {
        document.getElementById('ledger-list-box').style.display = 'none';
        document.getElementById('ledger-form-box').style.display = 'block';
        document.getElementById('lm-title').innerText = "Create New Ledger";
        document.getElementById('edit-ledger-id').value = "";
        document.getElementById('ledger-form').reset();
        await loadGroupsDropdown();
        if (fromVoucher) switchTab('masters');
    } else {
        document.getElementById('ledger-form-box').style.display = 'none';
        document.getElementById('ledger-list-box').style.display = 'block';
        await loadLedgerList();
    }
}

async function loadGroupsDropdown() {
    const groups = await db.groups.toArray();
    const sel = document.getElementById('ledger-group');
    sel.innerHTML = '<option value="">Select Group...</option>';
    groups.forEach(g => sel.innerHTML += `<option value="${g.id}">${g.name}</option>`);
}

document.getElementById('ledger-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const editId = document.getElementById('edit-ledger-id').value;
    const data = {
        name: document.getElementById('ledger-name').value,
        group_id: parseInt(document.getElementById('ledger-group').value),
        opening_balance: parseFloat(document.getElementById('ledger-op-bal').value) || 0,
        balance_type: document.getElementById('ledger-type').value,
        phone: document.getElementById('ledger-phone').value,
        address: document.getElementById('ledger-address').value,
        is_system: 0
    };

    if (editId) {
        await db.ledgers.update(parseInt(editId), data);
        alert(`Ledger Updated Successfully!`);
        showLedgerMode('alter');
    } else {
        await db.ledgers.add(data);
        alert(`Ledger Created Successfully!`);
        document.getElementById('ledger-form').reset();
    }
    
    // Cloud Par Save Karein
    if(typeof pushToCloud === 'function') await pushToCloud();
});

async function loadLedgerList() {
    const leds = await db.ledgers.toArray();
    const grps = await db.groups.toArray();
    const tb = document.getElementById('ledger-list-body');
    tb.innerHTML = '';

    leds.forEach(l => {
        let gName = grps.find(g => g.id === l.group_id)?.name || 'Unknown';
        tb.innerHTML += `<tr>
            <td><b>${l.name}</b></td><td>${gName}</td><td>₹${l.opening_balance} ${l.balance_type}</td>
            <td><button class="btn btn-secondary" style="padding:4px 8px; font-size:12px;" onclick="editLedger(${l.id})">Edit / View</button></td>
        </tr>`;
    });
}

async function editLedger(id) {
    const l = await db.ledgers.get(id);
    document.getElementById('ledger-list-box').style.display = 'none';
    document.getElementById('ledger-form-box').style.display = 'block';
    document.getElementById('lm-title').innerText = "Alter Ledger: " + l.name;

    await loadGroupsDropdown();
    document.getElementById('edit-ledger-id').value = l.id;
    document.getElementById('ledger-name').value = l.name;
    document.getElementById('ledger-group').value = l.group_id;
    document.getElementById('ledger-op-bal').value = l.opening_balance;
    document.getElementById('ledger-type').value = l.balance_type;
    document.getElementById('ledger-phone').value = l.phone || '';
    document.getElementById('ledger-address').value = l.address || '';
}

// ==========================================
// 4. VOUCHERS (TALLY FILTERS & LOGIC)
// ==========================================
async function getNextVoucherNo() {
    const last = await db.vouchers.orderBy('id').last();
    document.getElementById('v-no').value = last ? String(parseInt(last.voucher_no) + 1).padStart(4, '0') : "0001";
}

async function openVoucherType(type) {
    currentVoucherType = type;
    document.getElementById('v-title').innerText = type + " Voucher";

    document.querySelectorAll('.voucher-menu button').forEach(b => {
        b.classList.remove('active-btn');
        b.style.background = '';
        b.style.color = '';
        if (b.innerText.includes(type)) {
            b.classList.add('active-btn');
            if (type === 'Sales') { b.style.background = 'var(--primary)'; b.style.color = 'white'; }
            if (type === 'Purchase') { b.style.background = 'var(--yellow)'; b.style.color = 'white'; }
        }
    });

    const isInvoice = (type === 'Sales' || type === 'Purchase');
    document.getElementById('mode-invoice').style.display = isInvoice ? 'block' : 'none';
    document.getElementById('mode-accounting').style.display = isInvoice ? 'none' : 'block';

    if (isInvoice) {
        let pGrp = type === 'Sales' ? ['Sundry Debtors', 'Cash-in-Hand', 'Bank Accounts'] : ['Sundry Creditors', 'Cash-in-Hand', 'Bank Accounts'];
        await fillVoucherDropdown('inv-party', pGrp);
        document.getElementById('inv-entries').innerHTML = '';
        await addInvRow();
    } else {
        document.getElementById('acc-entries').innerHTML = '';
        await addAccRow('Dr');
        await addAccRow('Cr');
    }
    calcTotal();
}

async function fillVoucherDropdown(elemId, allowedGroupNames) {
    const groups = await db.groups.toArray();
    const ledgers = await db.ledgers.toArray();
    
    let allowedGrps = allowedGroupNames.includes('ALL') ? groups : groups.filter(g => allowedGroupNames.includes(g.name));
    const sel = document.getElementById(elemId);
    sel.innerHTML = '<option value="">-- Select A/c --</option>';
    
    let sortedLedgers = [...ledgers].sort((a, b) => a.name.localeCompare(b.name));

    allowedGrps.forEach(grp => {
        let leds = sortedLedgers.filter(l => l.group_id === grp.id);
        let optgroup = document.createElement('optgroup');
        optgroup.label = `── ${grp.name.toUpperCase()} ──`;

        if (leds.length > 0) {
            leds.forEach(l => {
                let opt = document.createElement('option');
                opt.value = l.id;
                opt.innerText = l.name;
                optgroup.appendChild(opt);
            });
        } else {
            let opt = document.createElement('option');
            opt.disabled = true;
            opt.innerText = "(Khali hai - Naya Ledger Banayein)";
            optgroup.appendChild(opt);
        }
        sel.appendChild(optgroup);
    });
}

async function addInvRow(ledgerId = '', qty = 1, rate = 0, amt = 0) {
    const groups = await db.groups.toArray();
    const ledgers = await db.ledgers.toArray();
    
    let itemGrpNames = currentVoucherType === 'Sales' ? ['Indirect Income'] : ['Indirect Expenses'];
    let allowedGrps = groups.filter(g => itemGrpNames.includes(g.name));
    let sortedLedgers = [...ledgers].sort((a, b) => a.name.localeCompare(b.name));

    let optHTML = '<option value="">-- Select Item/Service --</option>';
    allowedGrps.forEach(grp => {
        optHTML += `<optgroup label="── ${grp.name.toUpperCase()} ──">`;
        let leds = sortedLedgers.filter(l => l.group_id === grp.id);
        if (leds.length > 0) {
            leds.forEach(l => {
                optHTML += `<option value="${l.id}" ${l.id == ledgerId ? 'selected' : ''}>${l.name}</option>`;
            });
        } else {
            optHTML += `<option disabled>(Khali hai - Naya Ledger Banayein)</option>`;
        }
        optHTML += `</optgroup>`;
    });

    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><select class="r-led" required>${optHTML}</select> <button type="button" class="btn-tiny" onclick="showLedgerMode('create', true)">+</button></td>
        <td><input type="number" class="r-qty" value="${qty}" oninput="calcInvRow(this)"></td>
        <td><input type="number" class="r-rate" value="${rate}" onchange="calcInvRow(this); checkInvAutoRow(this);"></td>
        <td><input type="number" class="r-amt" value="${amt}" readonly></td>
        <td><button type="button" class="btn-tiny" style="color:white; background:var(--red);" onclick="this.closest('tr').remove(); calcTotal();">X</button></td>
    `;
    document.getElementById('inv-entries').appendChild(tr);
}

function calcInvRow(el) {
    const tr = el.closest('tr');
    tr.querySelector('.r-amt').value = ((parseFloat(tr.querySelector('.r-qty').value) || 0) * (parseFloat(tr.querySelector('.r-rate').value) || 0)).toFixed(2);
    calcTotal();
}

function checkInvAutoRow(el) {
    const tr = el.closest('tr');
    if (tr === tr.parentElement.lastElementChild && parseFloat(tr.querySelector('.r-amt').value) > 0) addInvRow();
}

async function addAccRow(type = 'Dr', ledgerId = '', dr = '', cr = '') {
    const groups = await db.groups.toArray();
    const ledgers = await db.ledgers.toArray();
    
    let sortedLedgers = [...ledgers].sort((a, b) => a.name.localeCompare(b.name));
    let optHTML = '<option value="">-- Select Ledger --</option>';

    groups.forEach(grp => {
        let leds = sortedLedgers.filter(l => l.group_id === grp.id);
        if (leds.length > 0) {
            optHTML += `<optgroup label="── ${grp.name.toUpperCase()} ──">`;
            leds.forEach(l => { optHTML += `<option value="${l.id}" ${l.id == ledgerId ? 'selected' : ''}>${l.name}</option>`; });
            optHTML += `</optgroup>`;
        }
    });

    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><select class="r-drcr" onchange="tDrCr(this)"><option value="Dr" ${type === 'Dr' ? 'selected' : ''}>Dr</option><option value="Cr" ${type === 'Cr' ? 'selected' : ''}>Cr</option></select></td>
        <td><select class="r-led" required>${optHTML}</select> <button type="button" class="btn-tiny" onclick="showLedgerMode('create', true)">+</button></td>
        <td><input type="number" class="r-dr" value="${dr}" onchange="calcTotal(); chkAccAuto(this);" ${type === 'Cr' ? 'disabled' : ''}></td>
        <td><input type="number" class="r-cr" value="${cr}" onchange="calcTotal(); chkAccAuto(this);" ${type === 'Dr' ? 'disabled' : ''}></td>
        <td><button type="button" class="btn-tiny" style="color:white; background:var(--red);" onclick="this.closest('tr').remove(); calcTotal();">X</button></td>
    `;
    document.getElementById('acc-entries').appendChild(tr);
}

function tDrCr(s) {
    const tr = s.closest('tr');
    if (s.value === 'Dr') { tr.querySelector('.r-dr').disabled = false; tr.querySelector('.r-cr').disabled = true; tr.querySelector('.r-cr').value = ''; }
    else { tr.querySelector('.r-dr').disabled = true; tr.querySelector('.r-cr').disabled = false; tr.querySelector('.r-dr').value = ''; }
    calcTotal();
}

function chkAccAuto(el) {
    const tr = el.closest('tr');
    const d = parseFloat(document.getElementById('acc-dr-total').innerText);
    const c = parseFloat(document.getElementById('acc-cr-total').innerText);
    if (tr === tr.parentElement.lastElementChild && d !== c) {
        if (d > c) addAccRow('Cr', '', '', d - c);
        else addAccRow('Dr', '', c - d, '');
    }
}

function calcTotal() {
    if (['Sales', 'Purchase'].includes(currentVoucherType)) {
        let t = 0; document.querySelectorAll('.r-amt').forEach(i => t += parseFloat(i.value || 0));
        document.getElementById('inv-total').innerText = t.toFixed(2);
    } else {
        let d = 0, c = 0;
        document.querySelectorAll('.r-dr').forEach(i => d += parseFloat(i.value || 0));
        document.querySelectorAll('.r-cr').forEach(i => c += parseFloat(i.value || 0));
        document.getElementById('acc-dr-total').innerText = d.toFixed(2);
        document.getElementById('acc-cr-total').innerText = c.toFixed(2);
    }
}

async function saveVoucher() {
    let tAmt = 0; let isInv = ['Sales', 'Purchase'].includes(currentVoucherType);
    if (isInv) {
        tAmt = parseFloat(document.getElementById('inv-total').innerText);
        if (!document.getElementById('inv-party').value || tAmt <= 0) return alert("Select Party & Enter Amount");
    } else {
        let d = parseFloat(document.getElementById('acc-dr-total').innerText);
        let c = parseFloat(document.getElementById('acc-cr-total').innerText);
        if (d !== c || d === 0) return alert("Debit must equal Credit");
        tAmt = d;
    }

    let editId = document.getElementById('edit-voucher-id').value;
    if (editId) {
        await db.vouchers.delete(parseInt(editId));
        await db.voucher_entries.where('voucher_id').equals(parseInt(editId)).delete();
    }

    let vId = await db.vouchers.add({ voucher_no: document.getElementById('v-no').value, date: document.getElementById('v-date').value, type: currentVoucherType, total_amount: tAmt, narration: document.getElementById('v-narration').value, created_at: new Date() });

    if (isInv) {
        await db.voucher_entries.add({ voucher_id: vId, ledger_id: parseInt(document.getElementById('inv-party').value), debit: currentVoucherType === 'Sales' ? tAmt : 0, credit: currentVoucherType === 'Purchase' ? tAmt : 0, qty: 0, rate: 0 });
        let rows = document.querySelectorAll('#inv-entries tr');
        for (let r of rows) {
            let l = parseInt(r.querySelector('.r-led').value); let a = parseFloat(r.querySelector('.r-amt').value);
            if (l && a > 0) await db.voucher_entries.add({ voucher_id: vId, ledger_id: l, debit: currentVoucherType === 'Purchase' ? a : 0, credit: currentVoucherType === 'Sales' ? a : 0, qty: parseFloat(r.querySelector('.r-qty').value), rate: parseFloat(r.querySelector('.r-rate').value) });
        }
    } else {
        let rows = document.querySelectorAll('#acc-entries tr');
        for (let r of rows) {
            let l = parseInt(r.querySelector('.r-led').value); let d = parseFloat(r.querySelector('.r-dr').value || 0); let c = parseFloat(r.querySelector('.r-cr').value || 0);
            if (l && (d > 0 || c > 0)) await db.voucher_entries.add({ voucher_id: vId, ledger_id: l, debit: d, credit: c, qty: 0, rate: 0 });
        }
    }

    alert("Voucher Saved Successfully!");
    
    // Cloud Par Save Karein
    if(typeof pushToCloud === 'function') await pushToCloud();
    
    if (isInv) { 
        document.getElementById('edit-voucher-id').value = vId; 
        let printBtn = document.getElementById('btn-print-v');
        if(printBtn) printBtn.style.display = 'block'; 
        currentEditId = vId;
    } else { 
        document.getElementById('edit-voucher-id').value = ""; 
        document.getElementById('v-narration').value = ""; 
        getNextVoucherNo(); 
        openVoucherType(currentVoucherType); 
    }
}

async function deleteCurrentVoucher() {
    let editId = document.getElementById('edit-voucher-id').value;
    if(!editId) return;
    if(confirm("Are you sure you want to delete this voucher permanently?")) {
        await db.vouchers.delete(parseInt(editId));
        await db.voucher_entries.where('voucher_id').equals(parseInt(editId)).delete();
        
        if(typeof pushToCloud === 'function') await pushToCloud(); // Cloud Se Bhi Delete
        
        alert("Voucher Deleted");
        document.getElementById('edit-voucher-id').value = "";
        document.getElementById('v-narration').value = "";
        getNextVoucherNo(); 
        openVoucherType(currentVoucherType);
    }
}

async function loadNavVoucher(dir) {
    let currentEditIdVal = document.getElementById('edit-voucher-id').value ? parseInt(document.getElementById('edit-voucher-id').value) : null;
    let v;
    if (dir === 'prev') v = currentEditIdVal ? await db.vouchers.where('id').below(currentEditIdVal).last() : await db.vouchers.orderBy('id').last();
    if (dir === 'next') v = currentEditIdVal ? await db.vouchers.where('id').above(currentEditIdVal).first() : null;
    if (!v) return;

    let badge = document.getElementById('v-edit-badge'); if(badge) badge.style.display = 'inline-block';
    let delBtn = document.getElementById('btn-delete-v'); if(delBtn) delBtn.style.display = 'block';
    document.getElementById('edit-voucher-id').value = v.id;
    currentEditId = v.id;
    document.getElementById('v-no').value = v.voucher_no; 
    document.getElementById('v-date').value = v.date; 
    document.getElementById('v-narration').value = v.narration;

    currentVoucherType = v.type;
    let title = document.getElementById('v-title'); if(title) title.innerText = v.type + " Voucher";
    
    document.querySelectorAll('.voucher-menu button').forEach(b => { 
        b.classList.remove('active-btn'); b.style.background = ''; b.style.color = ''; 
        if (b.innerText.includes(v.type)) { 
            b.classList.add('active-btn'); 
            if (v.type === 'Sales') { b.style.background = 'var(--primary)'; b.style.color = 'white'; } 
            if (v.type === 'Purchase') { b.style.background = 'var(--yellow)'; b.style.color = 'white'; } 
        } 
    });

    let isInv = ['Sales', 'Purchase'].includes(v.type);
    let invMode = document.getElementById('mode-invoice'); if(invMode) invMode.style.display = isInv ? 'block' : 'none';
    let accMode = document.getElementById('mode-accounting'); if(accMode) accMode.style.display = isInv ? 'none' : 'block';
    let printBtn = document.getElementById('btn-print-v'); if(printBtn) printBtn.style.display = isInv ? 'block' : 'none';

    let ents = await db.voucher_entries.where('voucher_id').equals(v.id).toArray();
    if (isInv) {
        let pLine = ents.find(e => v.type === 'Sales' ? e.debit > 0 : e.credit > 0);
        await fillVoucherDropdown('inv-party', ['ALL']); 
        document.getElementById('inv-party').value = pLine.ledger_id;
        document.getElementById('inv-entries').innerHTML = '';
        for (let e of ents.filter(x => x.id !== pLine.id)) await addInvRow(e.ledger_id, e.qty, e.rate, (e.debit || e.credit));
    } else {
        document.getElementById('acc-entries').innerHTML = '';
        for (let e of ents) await addAccRow(e.debit > 0 ? 'Dr' : 'Cr', e.ledger_id, e.debit, e.credit);
    }
    calcTotal();
}

async function printLastVoucher() {
    let editId = document.getElementById('edit-voucher-id').value;
    if (!editId) return;
    const v = await db.vouchers.get(parseInt(editId));
    const entries = await db.voucher_entries.where('voucher_id').equals(parseInt(editId)).toArray();

    let partyEntry = entries.find(e => v.type === 'Sales' ? e.debit > 0 : e.credit > 0);
    const party = partyEntry ? await db.ledgers.get(partyEntry.ledger_id) : { name: 'Cash', address: '', phone: '' };

    const sets = await db.settings.toArray();
    const getS = k => { let s = sets.find(x => x.key === k); return s ? s.value : ''; };

    let itemsHTML = '';
    for (let e of entries) {
        if (!partyEntry || e.id !== partyEntry.id) {
            let l = await db.ledgers.get(e.ledger_id); let a = e.debit || e.credit;
            itemsHTML += `<tr><td style="border: 1px solid #cbd5e1; padding: 10px;">${l.name}</td><td style="border: 1px solid #cbd5e1; padding: 10px; text-align: center;">${e.qty || 1}</td><td style="border: 1px solid #cbd5e1; padding: 10px; text-align: right;">${e.rate || a}</td><td style="border: 1px solid #cbd5e1; padding: 10px; text-align: right;">${a.toFixed(2)}</td></tr>`;
        }
    }

    const html = `
        <table cellpadding="0" cellspacing="0" style="width: 100%; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px;">
            <tr><td style="width: 60%; vertical-align: top;"><h2 style="margin:0; font-size: 26px; color: #2563eb;">${getS('company_name')}</h2><div style="font-size: 14px; margin-top: 5px; color: #444;">${getS('company_address')}</div><div style="font-size: 14px; color: #444;">${getS('company_phone')} | ${getS('company_email')}</div></td><td style="width: 40%; text-align: right; vertical-align: top;"><h1 style="margin:0; font-size: 28px; color: #222;">${v.type === 'Sales' ? 'TAX INVOICE' : v.type.toUpperCase() + ' BILL'}</h1><div style="margin-top: 10px; font-size: 14px;"><b>Bill No:</b> ${v.voucher_no}<br><b>Date:</b> ${new Date(v.date).toLocaleDateString('en-IN')}</div></td></tr>
        </table>
        <table cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 20px;">
            <tr><td style="background: #f8fafc; padding: 15px; border: 1px solid #ddd; border-radius: 4px;"><b style="font-size: 16px; color: #222;">Billed To:</b><br><strong style="font-size: 18px; color: #2563eb; display: inline-block; margin-top: 5px;">${party.name}</strong><br><span style="font-size: 14px; color: #444;">${party.address || ''}</span><br><span style="font-size: 14px; color: #444;">Phone: ${party.phone || ''}</span></td></tr>
        </table>
        <table cellpadding="0" cellspacing="0" class="print-table" style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead><tr style="background: #e2e8f0;"><th style="border: 1px solid #cbd5e1; padding: 10px; text-align: left;">Description of Service / Item</th><th style="border: 1px solid #cbd5e1; padding: 10px; text-align: center; width: 12%;">Qty</th><th style="border: 1px solid #cbd5e1; padding: 10px; text-align: right; width: 18%;">Rate (₹)</th><th style="border: 1px solid #cbd5e1; padding: 10px; text-align: right; width: 22%;">Amount (₹)</th></tr></thead>
            <tbody>${itemsHTML}</tbody>
            <tfoot><tr><td colspan="3" style="border: 1px solid #cbd5e1; padding: 10px; text-align: right; font-weight: bold; font-size: 16px;">Grand Total:</td><td style="border: 1px solid #cbd5e1; padding: 10px; text-align: right; font-weight: bold; font-size: 18px; color: #2563eb;">₹${parseFloat(v.total_amount).toFixed(2)}</td></tr></tfoot>
        </table>
        <table style="width: 100%; margin-top: 30px;">
            <tr><td style="width: 60%; vertical-align: top; padding-right: 20px;"><div style="background: #f8fafc; padding: 15px; border: 1px solid #ddd; border-radius: 4px;"><b style="color: #222;">Narration:</b><br><span style="font-size: 14px; color: #555;">${v.narration || '-'}</span></div><div style="margin-top: 15px; background: #f8fafc; padding: 15px; border: 1px solid #ddd; border-radius: 4px;"><b style="color: #222;">Bank Details:</b><br><table style="width: 100%; font-size: 13px; margin-top: 5px; color: #444;"><tr><td style="width: 30%;"><b>Bank Name:</b></td><td>${getS('bank_name')}</td></tr><tr><td><b>Account No:</b></td><td>${getS('bank_ac')}</td></tr><tr><td><b>IFSC Code:</b></td><td>${getS('bank_ifsc')}</td></tr><tr><td><b>UPI ID:</b></td><td>${getS('upi_id')}</td></tr></table></div></td><td style="width: 40%; vertical-align: bottom; text-align: center; padding-top: 50px;"><hr style="width: 80%; border-top: 1px solid #000; margin-bottom: 10px;"><b style="color: #222;">Authorized Signatory</b><br><span style="font-size: 12px; color: #666;">For ${getS('company_name')}</span></td></tr>
        </table>
    `;
    let canvas = document.getElementById('print-canvas');
    if(canvas) { canvas.innerHTML = html; window.print(); }
}

// Keyboard shortcuts for Voucher Navigation
document.addEventListener('keydown', function(event) {
    if (document.getElementById('vouchers-view') && document.getElementById('vouchers-view').classList.contains('active-view')) {
        if (event.key === "PageUp") { event.preventDefault(); loadNavVoucher('prev'); }
        if (event.key === "PageDown") { event.preventDefault(); loadNavVoucher('next'); }
    }
});

// ==========================================
// 5. QUOTATION MAKER
// ==========================================
function addQRow() {
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="text" class="q-desc" placeholder="Service Name" style="width:100%; border:none; padding:8px;"></td>
        <td><input type="number" class="q-qty" value="1" oninput="calcQRow(this)" style="width:100%; border:none; padding:8px;"></td>
        <td><input type="number" class="q-rate" value="0" onchange="calcQRow(this); checkQAuto(this);" style="width:100%; border:none; padding:8px;"></td>
        <td><input type="number" class="q-amt" value="0" readonly style="width:100%; border:none; padding:8px; font-weight:bold;"></td>
        <td><button type="button" class="btn-tiny" style="color:white; background:var(--red);" onclick="this.closest('tr').remove(); calcQRow(this);">X</button></td>
    `;
    let qEntries = document.getElementById('q-entries');
    if(qEntries) qEntries.appendChild(tr);
}

function calcQRow(el) {
    const tr = el.closest('tr');
    if (tr) tr.querySelector('.q-amt').value = ((tr.querySelector('.q-qty').value || 0) * (tr.querySelector('.q-rate').value || 0)).toFixed(2);
    let t = 0; document.querySelectorAll('.q-amt').forEach(i => t += parseFloat(i.value || 0)); 
    let qTotal = document.getElementById('q-total');
    if(qTotal) qTotal.innerText = t.toFixed(2);
}

function checkQAuto(el) { const tr = el.closest('tr'); if (tr === tr.parentElement.lastElementChild) addQRow(); }

async function printQuotation() {
    const sets = await db.settings.toArray(); const getS = k => { let s = sets.find(x => x.key === k); return s ? s.value : ''; };

    let itemsHTML = '';
    document.querySelectorAll('#q-entries tr').forEach(r => {
        let desc = r.querySelector('.q-desc').value; let a = parseFloat(r.querySelector('.q-amt').value);
        if (desc && a > 0) {
            itemsHTML += `<tr><td style="border:1px solid #ccc; padding:10px;">${desc}</td><td style="border:1px solid #ccc; padding:10px; text-align:center;">${r.querySelector('.q-qty').value}</td><td style="border:1px solid #ccc; padding:10px; text-align:right;">${r.querySelector('.q-rate').value}</td><td style="border:1px solid #ccc; padding:10px; text-align:right;">${a.toFixed(2)}</td></tr>`;
        }
    });

    const html = `
        <table width="100%" style="border-bottom:2px solid #222; padding-bottom:15px; margin-bottom:20px;">
            <tr>
                <td width="60%">
                    <h2 style="margin:0; font-size:26px; color:#2563eb;">${getS('company_name') || 'COMPANY NAME'}</h2>
                    <div style="color:#444; margin-top:5px;">${getS('company_address')}</div><div>${getS('company_phone')}</div>
                </td>
                <td width="40%" align="right">
                    <h1 style="margin:0; font-size:28px;">QUOTATION</h1>
                    <div style="margin-top:10px;"><b>Quote No:</b> ${document.getElementById('q-no').value}<br><b>Date:</b> ${new Date(document.getElementById('q-date').value).toLocaleDateString('en-IN')}</div>
                </td>
            </tr>
        </table>
        <div style="background:#f8fafc; padding:15px; border:1px solid #ddd; margin-bottom:20px;">
            <b>Prepared For:</b><br><strong style="font-size:18px; color:#2563eb;">${document.getElementById('q-party').value}</strong>
        </div>
        <table width="100%" style="border-collapse:collapse; margin-bottom:20px;">
            <thead><tr style="background:#e2e8f0; font-weight:bold;"><td style="border:1px solid #ccc; padding:10px;">Description</td><td style="border:1px solid #ccc; padding:10px; text-align:center;">Qty</td><td style="border:1px solid #ccc; padding:10px; text-align:right;">Rate</td><td style="border:1px solid #ccc; padding:10px; text-align:right;">Amount</td></tr></thead>
            <tbody>${itemsHTML}</tbody>
            <tfoot><tr><td colspan="3" align="right" style="border:1px solid #ccc; padding:10px;"><b>Grand Total:</b></td><td align="right" style="border:1px solid #ccc; padding:10px; font-size:18px; color:#2563eb;"><b>₹${document.getElementById('q-total').innerText}</b></td></tr></tfoot>
        </table>
        <div style="margin-top:30px;"><b>Terms & Conditions:</b><br><pre style="font-family:inherit; color:#555; white-space: pre-wrap;">${document.getElementById('q-terms').value}</pre></div>
    `;
    let canvas = document.getElementById('print-canvas');
    if(canvas) { canvas.innerHTML = html; window.print(); }
}

// ==========================================
// 6. ADVANCED REPORTS & DASHBOARD
// ==========================================
function switchReport(id) {
    document.querySelectorAll('.report-panel').forEach(p => p.style.display = 'none');
    document.getElementById('rep-' + id).style.display = 'block';
    ['daybook', 'pnl', 'bs', 'partystmt', 'outstanding'].forEach(btn => document.getElementById('btn-' + btn).className = 'btn btn-secondary');
    document.getElementById('btn-' + id).className = 'btn btn-primary';

    if (id === 'daybook') { document.getElementById('db-from').valueAsDate = new Date(); document.getElementById('db-to').valueAsDate = new Date(); generateDayBook(); }
    if (id === 'pnl') generatePnL();
    if (id === 'bs') generateBalanceSheet();
    if (id === 'partystmt') { fillVoucherDropdown('rep-party-select', ['Sundry Debtors', 'Sundry Creditors']); }
    if (id === 'outstanding') generateOutstanding();
}

async function loadDashboard() {
    const tbody = document.getElementById('recent-transactions');
    if(!tbody) return;
    tbody.innerHTML = '';
    const recentV = await db.vouchers.orderBy('id').reverse().limit(5).toArray();

    if (recentV.length === 0) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No data</td></tr>';
    recentV.forEach(v => {
        tbody.innerHTML += `<tr><td>${new Date(v.date).toLocaleDateString('en-IN')}</td><td><b>${v.voucher_no}</b></td><td><span class="badge-non-gst" style="margin:0; background:var(--dark); color:white; padding:3px 8px; border-radius:10px; font-size:11px;">${v.type}</span></td><td>${v.narration || '-'}</td><td><b>₹${v.total_amount.toFixed(2)}</b></td></tr>`;
    });

    let tInc = 0, tExp = 0, rec = 0;
    const groups = await db.groups.toArray();
    const incGrp = groups.find(g => g.name === "Indirect Income")?.id;
    const expGrp = groups.find(g => g.name === "Indirect Expenses")?.id;
    const debtGrp = groups.find(g => g.name === "Sundry Debtors")?.id;

    const leds = await db.ledgers.toArray();
    const entries = await db.voucher_entries.toArray();

    // Process Opening balances for Debtors
    leds.filter(l => l.group_id === debtGrp).forEach(l => {
        let bal = l.opening_balance || 0;
        if (l.balance_type === 'Cr') bal = -bal;
        rec += bal;
    });

    // Process transactions
    entries.forEach(e => {
        let l = leds.find(x => x.id === e.ledger_id);
        if (!l) return;
        if (l.group_id === incGrp) tInc += (e.credit - e.debit);
        if (l.group_id === expGrp) tExp += (e.debit - e.credit);
        if (l.group_id === debtGrp) rec += (e.debit - e.credit);
    });

    document.getElementById('dash-income').innerText = `₹${tInc.toFixed(2)}`;
    document.getElementById('dash-expense').innerText = `₹${tExp.toFixed(2)}`;
    document.getElementById('dash-profit').innerText = `₹${(tInc - tExp).toFixed(2)}`;
    document.getElementById('dash-receivable').innerText = `₹${rec.toFixed(2)}`;
}

async function generateDayBook() {
    const f = document.getElementById('db-from').value; const t = document.getElementById('db-to').value;
    const vs = await db.vouchers.where('date').between(f, t, true, true).toArray();
    const tb = document.getElementById('daybook-body'); tb.innerHTML = '';
    vs.forEach(v => { tb.innerHTML += `<tr><td>${new Date(v.date).toLocaleDateString('en-IN')}</td><td><b>${v.voucher_no}</b></td><td>${v.type}</td><td>${v.narration || '-'}</td><td style="font-weight:bold; color:var(--primary);">₹${v.total_amount.toFixed(2)}</td></tr>`; });
}

async function generatePnL() {
    const groups = await db.groups.toArray(); const incGrp = groups.find(g => g.name === "Indirect Income")?.id; const expGrp = groups.find(g => g.name === "Indirect Expenses")?.id;
    const ledgers = await db.ledgers.toArray(); const entries = await db.voucher_entries.toArray();
    let tInc = 0, tExp = 0; const iB = document.getElementById('pnl-income'); const eB = document.getElementById('pnl-expenses'); iB.innerHTML = ''; eB.innerHTML = '';
    ledgers.forEach(l => {
        let lTot = 0; entries.filter(e => e.ledger_id === l.id).forEach(e => { if (l.group_id === incGrp) lTot += (e.credit - e.debit); if (l.group_id === expGrp) lTot += (e.debit - e.credit); });
        if (lTot > 0) { if (l.group_id === incGrp) { iB.innerHTML += `<tr><td>${l.name}</td><td style="text-align:right;">₹${lTot.toFixed(2)}</td></tr>`; tInc += lTot; } if (l.group_id === expGrp) { eB.innerHTML += `<tr><td>${l.name}</td><td style="text-align:right;">₹${lTot.toFixed(2)}</td></tr>`; tExp += lTot; } }
    });
    document.getElementById('pnl-net').innerText = `₹${Math.abs(tInc - tExp).toFixed(2)}`;
}

async function generateBalanceSheet() {
    const grps = await db.groups.toArray(); const leds = await db.ledgers.toArray(); const ents = await db.voucher_entries.toArray();
    let capGrp = grps.find(g => g.name === 'Capital Account')?.id; let crGrp = grps.find(g => g.name === 'Sundry Creditors')?.id;
    let cashGrp = grps.find(g => g.name === 'Cash-in-Hand')?.id; let bankGrp = grps.find(g => g.name === 'Bank Accounts')?.id; let drGrp = grps.find(g => g.name === 'Sundry Debtors')?.id;

    let liabHtml = '', astHtml = ''; let totLiab = 0, totAst = 0;

    let incGrp = grps.find(g => g.name === 'Indirect Income')?.id; let expGrp = grps.find(g => g.name === 'Indirect Expenses')?.id;
    let tInc = 0, tExp = 0;
    leds.forEach(l => {
        let bal = l.opening_balance || 0; if (l.balance_type === 'Cr') bal = -bal;
        ents.filter(e => e.ledger_id === l.id).forEach(e => { bal += (e.debit - e.credit) });
        if (l.group_id === incGrp) tInc -= bal;
        if (l.group_id === expGrp) tExp += bal;
    });
    let netProfit = tInc - tExp;

    leds.forEach(l => {
        let bal = l.opening_balance || 0; if (l.balance_type === 'Cr') bal = -bal;
        ents.filter(e => e.ledger_id === l.id).forEach(e => { bal += (e.debit - e.credit) });

        if ([capGrp, crGrp].includes(l.group_id) && bal < 0) { liabHtml += `<tr><td>${l.name}</td><td align="right">₹${Math.abs(bal).toFixed(2)}</td></tr>`; totLiab += Math.abs(bal); }
        if ([cashGrp, bankGrp, drGrp].includes(l.group_id) && bal > 0) { astHtml += `<tr><td>${l.name}</td><td align="right">₹${bal.toFixed(2)}</td></tr>`; totAst += bal; }
    });

    if (netProfit > 0) { liabHtml += `<tr><td><b>Profit & Loss A/c</b></td><td align="right">₹${netProfit.toFixed(2)}</td></tr>`; totLiab += netProfit; }
    if (netProfit < 0) { astHtml += `<tr><td><b>Profit & Loss A/c (Loss)</b></td><td align="right">₹${Math.abs(netProfit).toFixed(2)}</td></tr>`; totAst += Math.abs(netProfit); }

    liabHtml += `<tr><td><b>Total</b></td><td align="right" style="color:var(--primary); font-weight:bold;">₹${totLiab.toFixed(2)}</td></tr>`;
    astHtml += `<tr><td><b>Total</b></td><td align="right" style="color:var(--primary); font-weight:bold;">₹${totAst.toFixed(2)}</td></tr>`;

    document.getElementById('bs-liab').innerHTML = liabHtml; document.getElementById('bs-assets').innerHTML = astHtml;
}

async function generatePartyStatement() {
    let id = parseInt(document.getElementById('rep-party-select').value); if (!id) return;
    const l = await db.ledgers.get(id); const ents = await db.voucher_entries.where('ledger_id').equals(id).toArray();
    let tb = document.getElementById('party-stmt-body'); tb.innerHTML = '';

    let bal = l.opening_balance || 0; if (l.balance_type === 'Cr') bal = -bal;
    if (bal !== 0) tb.innerHTML += `<tr><td>-</td><td>-</td><td><b>Opening Balance</b></td><td>${bal > 0 ? bal : ''}</td><td>${bal < 0 ? Math.abs(bal) : ''}</td></tr>`;

    for (let e of ents) {
        let v = await db.vouchers.get(e.voucher_id);
        bal += (e.debit - e.credit);
        tb.innerHTML += `<tr><td>${new Date(v.date).toLocaleDateString('en-IN')}</td><td>${v.voucher_no}</td><td>${v.type}</td><td style="color:red;">${e.debit > 0 ? e.debit : ''}</td><td style="color:green;">${e.credit > 0 ? e.credit : ''}</td></tr>`;
    }
    document.getElementById('party-closing-bal').innerText = bal > 0 ? `₹${bal.toFixed(2)} (Dr - Lena Hai)` : (bal < 0 ? `₹${Math.abs(bal).toFixed(2)} (Cr - Dena Hai)` : "0.00");
}

async function generateOutstanding() {
    const grps = await db.groups.toArray(); const drGrp = grps.find(g => g.name === "Sundry Debtors")?.id; const crGrp = grps.find(g => g.name === "Sundry Creditors")?.id;
    const leds = await db.ledgers.toArray(); const ents = await db.voucher_entries.toArray();

    const rB = document.getElementById('out-receivables'); const pB = document.getElementById('out-payables'); rB.innerHTML = ''; pB.innerHTML = '';

    leds.forEach(l => {
        let bal = l.opening_balance || 0; if (l.balance_type === 'Cr') bal = -bal;
        ents.filter(e => e.ledger_id === l.id).forEach(e => { bal += (e.debit - e.credit); });

        if (l.group_id === drGrp && bal > 0) rB.innerHTML += `<tr><td><b>${l.name}</b><br><small>${l.phone || '-'}</small></td><td style="color:var(--green); font-weight:bold; text-align:right; font-size:16px;">₹${bal.toFixed(2)}</td></tr>`;
        if (l.group_id === crGrp && bal < 0) pB.innerHTML += `<tr><td><b>${l.name}</b><br><small>${l.phone || '-'}</small></td><td style="color:var(--red); font-weight:bold; text-align:right; font-size:16px;">₹${Math.abs(bal).toFixed(2)}</td></tr>`;
    });
}

// ==========================================
// 7. COMPANY SETTINGS & EXPORT / IMPORT
// ==========================================
async function loadCompanySettings() { 
    const settings = await db.settings.toArray(); 
    const getS = (key) => { const s = settings.find(s => s.key === key); return s ? s.value : ''; }; 
    ['name', 'phone', 'email', 'address', 'bank', 'ac', 'ifsc', 'upi'].forEach(k => { 
        let el = document.getElementById('set-' + k);
        if (el) el.value = getS(k === 'name' ? 'company_name' : k === 'phone' ? 'company_phone' : k === 'email' ? 'company_email' : k === 'address' ? 'company_address' : k === 'bank' ? 'bank_name' : k === 'ac' ? 'bank_ac' : k === 'ifsc' ? 'bank_ifsc' : 'upi_id'); 
    }); 
}

async function saveCompanySettings() { 
    const keys = ['company_name', 'company_phone', 'company_email', 'company_address', 'bank_name', 'bank_ac', 'bank_ifsc', 'upi_id']; 
    const ids = ['set-name', 'set-phone', 'set-email', 'set-address', 'set-bank', 'set-ac', 'set-ifsc', 'set-upi']; 
    for (let i = 0; i < keys.length; i++) await db.settings.put({ key: keys[i], value: document.getElementById(ids[i]).value }); 
    
    // Cloud Par Save Karein
    if(typeof pushToCloud === 'function') await pushToCloud();
    
    alert("Company Profile Updated successfully!"); 
}

async function exportData() { 
    const data = { settings: await db.settings.toArray(), groups: await db.groups.toArray(), ledgers: await db.ledgers.toArray(), vouchers: await db.vouchers.toArray(), voucher_entries: await db.voucher_entries.toArray() }; 
    const a = document.createElement('a'); 
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })); 
    a.download = `jr_erp_backup_${new Date().toISOString().split('T')[0]}.json`; 
    document.body.appendChild(a); a.click(); document.body.removeChild(a); 
}

async function importData(event) { 
    const file = event.target.files[0]; if (!file) return; 
    const reader = new FileReader(); 
    reader.onload = async function (e) { 
        try { 
            const data = JSON.parse(e.target.result); 
            if (!confirm("WARNING: Current data will be replaced. Continue?")) return; 
            await db.settings.clear(); await db.groups.clear(); await db.ledgers.clear(); await db.vouchers.clear(); await db.voucher_entries.clear(); 
            await db.settings.bulkAdd(data.settings || []); await db.groups.bulkAdd(data.groups || []); await db.ledgers.bulkAdd(data.ledgers || []); await db.vouchers.bulkAdd(data.vouchers || []); await db.voucher_entries.bulkAdd(data.voucher_entries || []); 
            
            // Import hone ke baad cloud par bhi bhej dega
            if(typeof pushToCloud === 'function') await pushToCloud();
            
            alert("Restored Successfully! Reloading..."); window.location.reload(); 
        } catch (err) { alert("Invalid file format."); } 
    }; 
    reader.readAsText(file); 
}

// Login Enter Key Support
document.addEventListener('keydown', function(event) {
    if (event.key === "Enter") {
        if(document.activeElement.id === 'login-pass' || document.activeElement.id === 'login-user') checkLogin();
    }
});
