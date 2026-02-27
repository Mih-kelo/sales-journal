/* ═══════════════════════════════════════════════════════════
   Tori's Skin Secret — Sales Journal
   Complete vanilla JS: CRUD, localStorage, filters, export,
   summaries, theme toggle, and old-data migration.
   ═══════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    // ── Constants ──────────────────────────────────────────
    const STORAGE_KEY = 'toriSalesJournal';
    const THEME_KEY = 'toriSalesTheme';

    // Old localStorage keys used by the previous version of the app.
    // The migration function converts data from these keys into the new format.
    const OLD_STORAGE_KEY = 'forextodo';
    const OLD_KEYS_TO_CLEAN = ['forextodo', 'forexwins', 'forexloss', 'trimmed'];

    // ── State ──────────────────────────────────────────────
    let sales = [];

    // ── Helpers ────────────────────────────────────────────

    /** Generate a unique ID (good enough for localStorage). */
    function uid() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
    }

    /** Get today's date as ISO string (YYYY-MM-DD). */
    function todayISO() {
        const d = new Date();
        return d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0');
    }

    /** Format a number as Naira currency string. */
    function naira(n) {
        return '₦' + Number(n).toLocaleString('en-NG', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        });
    }

    /** Compute line revenue: quantity * unitPrice - discount */
    function lineRevenue(sale) {
        const qty = Number(sale.quantity) || 0;
        const price = Number(sale.unitPrice) || 0;
        const disc = Number(sale.discount) || 0;
        return qty * price - disc;
    }

    /** Compute line profit: if costPerUnit exists, use it; otherwise profit = revenue */
    function lineProfit(sale) {
        const qty = Number(sale.quantity) || 0;
        const price = Number(sale.unitPrice) || 0;
        const cost = Number(sale.costPerUnit);
        const disc = Number(sale.discount) || 0;
        if (!isNaN(cost) && sale.costPerUnit !== '' && sale.costPerUnit !== null && sale.costPerUnit !== undefined) {
            return qty * (price - cost) - disc;
        }
        return lineRevenue(sale);
    }

    /** Capitalise first letter. */
    function ucfirst(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // ── LocalStorage ───────────────────────────────────────

    function saveToLocalStorage() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sales));
    }

    function loadFromLocalStorage() {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            try { sales = JSON.parse(raw); } catch { sales = []; }
        }
    }

    // ══════════════════════════════════════════════════════════
    // MIGRATION FROM OLD APP
    // The old app stored data under the key 'forextodo' as an array of:
    //   { launchdate: string, result: 'newcustomers'|'returningcustomers'|null, pnl: number|string }
    // We convert each record to the new schema with sensible defaults.
    // Once migration is done, old keys are removed.
    // You can safely delete this block when no old data remains.
    // ══════════════════════════════════════════════════════════
    function migrateOldData() {
        const oldRaw = localStorage.getItem(OLD_STORAGE_KEY);
        if (!oldRaw) return; // nothing to migrate

        let oldData;
        try { oldData = JSON.parse(oldRaw); } catch { return; }
        if (!Array.isArray(oldData) || oldData.length === 0) return;

        const migrated = oldData.map(function (item) {
            const pnl = parseFloat(item.pnl);
            const revenue = isNaN(pnl) ? 0 : Math.abs(pnl);
            let customerType = 'new';
            if (item.result === 'returningcustomers') customerType = 'returning';

            return {
                id: uid(),
                date: item.launchdate || todayISO(),
                customerType: customerType,
                itemName: 'Sale',
                quantity: 1,
                unitPrice: revenue,
                costPerUnit: '',
                discount: 0,
                paymentMethod: 'cash',
                notes: 'Migrated from old journal'
            };
        });

        // Merge with any existing new-format data (unlikely but safe)
        sales = sales.concat(migrated);
        saveToLocalStorage();

        // Clean up old keys
        OLD_KEYS_TO_CLEAN.forEach(function (key) {
            localStorage.removeItem(key);
        });

        console.log('[Migration] Converted ' + migrated.length + ' old records to new format.');
    }

    // ── Theme ──────────────────────────────────────────────

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(THEME_KEY, theme);
        var icon = document.getElementById('themeIcon');
        if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }

    function loadTheme() {
        var saved = localStorage.getItem(THEME_KEY) || 'light';
        applyTheme(saved);
    }

    function toggleTheme() {
        var current = document.documentElement.getAttribute('data-theme') || 'light';
        applyTheme(current === 'dark' ? 'light' : 'dark');
    }

    // ── Filters ────────────────────────────────────────────

    function getFilters() {
        return {
            dateFrom: document.getElementById('filterDateFrom').value,
            dateTo: document.getElementById('filterDateTo').value,
            customerType: document.getElementById('filterCustomerType').value,
            payment: document.getElementById('filterPayment').value,
            search: document.getElementById('filterSearch').value.toLowerCase().trim()
        };
    }

    function applyFilters(data) {
        var f = getFilters();
        return data.filter(function (sale) {
            // Date range
            if (f.dateFrom && sale.date < f.dateFrom) return false;
            if (f.dateTo && sale.date > f.dateTo) return false;
            // Customer type
            if (f.customerType !== 'all' && sale.customerType !== f.customerType) return false;
            // Payment method
            if (f.payment !== 'all' && sale.paymentMethod !== f.payment) return false;
            // Text search on itemName or notes
            if (f.search) {
                var haystack = ((sale.itemName || '') + ' ' + (sale.notes || '')).toLowerCase();
                if (haystack.indexOf(f.search) === -1) return false;
            }
            return true;
        });
    }

    function clearFilters() {
        document.getElementById('filterDateFrom').value = '';
        document.getElementById('filterDateTo').value = '';
        document.getElementById('filterCustomerType').value = 'all';
        document.getElementById('filterPayment').value = 'all';
        document.getElementById('filterSearch').value = '';
        renderAll();
    }

    // ── Summary ────────────────────────────────────────────

    function calculateSummary(filtered) {
        var totalRev = 0, totalProf = 0, newCount = 0, retCount = 0;
        filtered.forEach(function (s) {
            totalRev += lineRevenue(s);
            totalProf += lineProfit(s);
            if (s.customerType === 'new') newCount++;
            else retCount++;
        });
        return { totalRev: totalRev, totalProf: totalProf, newCount: newCount, retCount: retCount };
    }

    function calculateTodaySummary() {
        var today = todayISO();
        var todaySales = sales.filter(function (s) { return s.date === today; });
        return calculateSummary(todaySales);
    }

    function renderSummary(filtered) {
        var s = calculateSummary(filtered);
        document.getElementById('totalRevenue').textContent = naira(s.totalRev);
        document.getElementById('totalProfit').textContent = naira(s.totalProf);
        document.getElementById('totalNew').textContent = s.newCount;
        document.getElementById('totalReturning').textContent = s.retCount;

        var t = calculateTodaySummary();
        document.getElementById('todayRevenue').textContent = naira(t.totalRev);
        document.getElementById('todayProfit').textContent = naira(t.totalProf);
        document.getElementById('todayNew').textContent = t.newCount;
        document.getElementById('todayReturning').textContent = t.retCount;
    }

    // ── Render sales list ──────────────────────────────────

    function renderSalesList(filtered) {
        // Sort by date descending, then by id descending for same date
        filtered.sort(function (a, b) {
            if (b.date !== a.date) return b.date > a.date ? 1 : -1;
            return String(b.id) > String(a.id) ? 1 : -1;
        });

        var emptyState = document.getElementById('emptyState');
        var countEl = document.getElementById('salesCount');
        countEl.textContent = '(' + filtered.length + ')';

        if (filtered.length === 0) {
            emptyState.hidden = false;
            document.getElementById('salesTableBody').innerHTML = '';
            document.getElementById('salesCards').innerHTML = '';
            return;
        }
        emptyState.hidden = true;

        // ── Desktop table rows ──
        var tbodyHTML = '';
        filtered.forEach(function (sale) {
            var rev = lineRevenue(sale);
            var prof = lineProfit(sale);
            tbodyHTML += '<tr>' +
                '<td>' + sale.date + '</td>' +
                '<td>' + escapeHTML(sale.itemName) + '</td>' +
                '<td><span class="badge badge--' + sale.customerType + '">' + ucfirst(sale.customerType) + '</span></td>' +
                '<td>' + sale.quantity + '</td>' +
                '<td>' + naira(sale.unitPrice) + '</td>' +
                '<td>' + naira(rev) + '</td>' +
                '<td>' + naira(prof) + '</td>' +
                '<td><span class="badge badge--' + sale.paymentMethod + '">' + ucfirst(sale.paymentMethod) + '</span></td>' +
                '<td class="actions-cell">' +
                '<button class="btn btn-sm btn-outline" data-edit="' + sale.id + '">Edit</button>' +
                '<button class="btn btn-sm btn-danger-outline" data-delete="' + sale.id + '">Del</button>' +
                '</td>' +
                '</tr>';
        });
        document.getElementById('salesTableBody').innerHTML = tbodyHTML;

        // ── Mobile cards ──
        var cardsHTML = '';
        filtered.forEach(function (sale) {
            var rev = lineRevenue(sale);
            var prof = lineProfit(sale);

            cardsHTML += '<div class="sale-card" data-id="' + sale.id + '">' +
                '<div class="sale-card-header">' +
                '<div class="sale-card-main">' +
                '<div class="sale-card-item">' + escapeHTML(sale.itemName) + '</div>' +
                '<div class="sale-card-meta">' +
                '<span>' + sale.date + '</span>' +
                '<span class="badge badge--' + sale.customerType + '">' + ucfirst(sale.customerType) + '</span>' +
                '<span class="badge badge--' + sale.paymentMethod + '">' + ucfirst(sale.paymentMethod) + '</span>' +
                '</div>' +
                '</div>' +
                '</div>' +
                '<div class="sale-card-amounts">' +
                '<div><span class="amount-label">Revenue</span><span class="amount-value amount-revenue">' + naira(rev) + '</span></div>' +
                '<div><span class="amount-label">Profit</span><span class="amount-value amount-profit">' + naira(prof) + '</span></div>' +
                '<div><span class="amount-label">Qty</span><span class="amount-value">' + sale.quantity + '</span></div>' +
                '</div>' +
                '<div class="sale-card-details" id="details-' + sale.id + '">' +
                '<p><strong>Unit Price:</strong> ' + naira(sale.unitPrice) + '</p>' +
                (sale.costPerUnit !== '' && sale.costPerUnit !== null && sale.costPerUnit !== undefined ? '<p><strong>Cost/Unit:</strong> ' + naira(sale.costPerUnit) + '</p>' : '') +
                (sale.discount ? '<p><strong>Discount:</strong> ' + naira(sale.discount) + '</p>' : '') +
                (sale.notes ? '<p><strong>Notes:</strong> ' + escapeHTML(sale.notes) + '</p>' : '') +
                '</div>' +
                '<div class="sale-card-actions">' +
                '<button class="sale-card-toggle" data-toggle="' + sale.id + '">Details ▾</button>' +
                '<button class="btn btn-sm btn-outline" data-edit="' + sale.id + '">Edit</button>' +
                '<button class="btn btn-sm btn-danger-outline" data-delete="' + sale.id + '">Delete</button>' +
                '</div>' +
                '</div>';
        });
        document.getElementById('salesCards').innerHTML = cardsHTML;
    }

    /** Escape HTML entities to prevent XSS. */
    function escapeHTML(str) {
        if (!str) return '';
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ── Master render ──────────────────────────────────────

    function renderAll() {
        var filtered = applyFilters(sales);
        renderSummary(filtered);
        renderSalesList(filtered);
    }

    // ── Form validation ────────────────────────────────────

    /**
     * Validate a form and return an object { valid, data }.
     * @param {string} prefix – '' for add form, 'edit' for edit form
     */
    function validateForm(prefix) {
        var isEdit = prefix === 'edit';
        var getId = function (name) { return isEdit ? 'edit' + name.charAt(0).toUpperCase() + name.slice(1) : name; };

        var fields = {
            date: { el: document.getElementById(isEdit ? 'editDate' : 'saleDate'), errEl: document.getElementById(isEdit ? 'editDateError' : 'saleDateError'), msg: 'Date is required' },
            itemName: { el: document.getElementById(isEdit ? 'editItemName' : 'itemName'), errEl: document.getElementById(isEdit ? 'editItemNameError' : 'itemNameError'), msg: 'Item name is required' },
            quantity: { el: document.getElementById(isEdit ? 'editQuantity' : 'quantity'), errEl: document.getElementById(isEdit ? 'editQuantityError' : 'quantityError'), msg: 'Quantity must be at least 1' },
            unitPrice: { el: document.getElementById(isEdit ? 'editUnitPrice' : 'unitPrice'), errEl: document.getElementById(isEdit ? 'editUnitPriceError' : 'unitPriceError'), msg: 'Unit price is required' },
            paymentMethod: { el: document.getElementById(isEdit ? 'editPaymentMethod' : 'paymentMethod'), errEl: document.getElementById(isEdit ? 'editPaymentMethodError' : 'paymentMethodError'), msg: 'Select a payment method' }
        };

        // Customer type (radio)
        var ctName = isEdit ? 'editCustomerType' : 'customerType';
        var ctChecked = document.querySelector('input[name="' + ctName + '"]:checked');
        var ctErrEl = document.getElementById(isEdit ? 'editCustomerTypeError' : 'customerTypeError');

        var valid = true;

        // Clear all errors first
        Object.keys(fields).forEach(function (key) {
            fields[key].errEl.textContent = '';
        });
        ctErrEl.textContent = '';

        // Validate required text/select/number inputs
        if (!fields.date.el.value) { fields.date.errEl.textContent = fields.date.msg; valid = false; }
        if (!fields.itemName.el.value.trim()) { fields.itemName.errEl.textContent = fields.itemName.msg; valid = false; }
        if (!fields.quantity.el.value || Number(fields.quantity.el.value) < 1) { fields.quantity.errEl.textContent = fields.quantity.msg; valid = false; }
        if (!fields.unitPrice.el.value || Number(fields.unitPrice.el.value) < 0) { fields.unitPrice.errEl.textContent = fields.unitPrice.msg; valid = false; }
        if (!fields.paymentMethod.el.value) { fields.paymentMethod.errEl.textContent = fields.paymentMethod.msg; valid = false; }
        if (!ctChecked) { ctErrEl.textContent = 'Select customer type'; valid = false; }

        if (!valid) return { valid: false, data: null };

        return {
            valid: true,
            data: {
                date: fields.date.el.value,
                customerType: ctChecked.value,
                itemName: fields.itemName.el.value.trim(),
                quantity: Number(fields.quantity.el.value),
                unitPrice: Number(fields.unitPrice.el.value),
                costPerUnit: document.getElementById(isEdit ? 'editCostPerUnit' : 'costPerUnit').value !== '' ? Number(document.getElementById(isEdit ? 'editCostPerUnit' : 'costPerUnit').value) : '',
                discount: Number(document.getElementById(isEdit ? 'editDiscount' : 'discount').value) || 0,
                paymentMethod: fields.paymentMethod.el.value,
                notes: document.getElementById(isEdit ? 'editNotes' : 'notes').value.trim()
            }
        };
    }

    // ── CRUD operations ────────────────────────────────────

    function addSale(data) {
        data.id = uid();
        sales.push(data);
        saveToLocalStorage();
        renderAll();
    }

    function updateSale(id, data) {
        var idx = sales.findIndex(function (s) { return s.id === id; });
        if (idx === -1) return;
        data.id = id;
        sales[idx] = data;
        saveToLocalStorage();
        renderAll();
    }

    function deleteSale(id) {
        sales = sales.filter(function (s) { return s.id !== id; });
        saveToLocalStorage();
        renderAll();
    }

    function findSale(id) {
        return sales.find(function (s) { return s.id === id; });
    }

    // ── Export CSV ──────────────────────────────────────────

    function exportCSV() {
        var filtered = applyFilters(sales);
        if (filtered.length === 0) {
            alert('No sales to export with current filters.');
            return;
        }

        var headers = ['Date', 'CustomerType', 'ItemName', 'Quantity', 'UnitPrice', 'CostPerUnit', 'Discount', 'PaymentMethod', 'Notes', 'LineRevenue', 'LineProfit'];
        var rows = [headers.join(',')];

        filtered.forEach(function (s) {
            var row = [
                s.date,
                s.customerType,
                '"' + (s.itemName || '').replace(/"/g, '""') + '"',
                s.quantity,
                s.unitPrice,
                s.costPerUnit !== '' && s.costPerUnit !== null && s.costPerUnit !== undefined ? s.costPerUnit : '',
                s.discount || 0,
                s.paymentMethod,
                '"' + (s.notes || '').replace(/"/g, '""') + '"',
                lineRevenue(s),
                lineProfit(s)
            ];
            rows.push(row.join(','));
        });

        var csv = rows.join('\n');
        var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'tori-sales-' + todayISO() + '.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // ── Edit modal ─────────────────────────────────────────

    function openEditModal(id) {
        var sale = findSale(id);
        if (!sale) return;

        document.getElementById('editId').value = sale.id;
        document.getElementById('editDate').value = sale.date;
        document.getElementById('editItemName').value = sale.itemName;
        document.getElementById('editQuantity').value = sale.quantity;
        document.getElementById('editUnitPrice').value = sale.unitPrice;
        document.getElementById('editCostPerUnit').value = sale.costPerUnit !== '' && sale.costPerUnit !== null && sale.costPerUnit !== undefined ? sale.costPerUnit : '';
        document.getElementById('editDiscount').value = sale.discount || '';
        document.getElementById('editPaymentMethod').value = sale.paymentMethod;
        document.getElementById('editNotes').value = sale.notes || '';

        // Set customer type radio
        var ctNew = document.getElementById('editCtNew');
        var ctRet = document.getElementById('editCtReturning');
        ctNew.checked = sale.customerType === 'new';
        ctRet.checked = sale.customerType === 'returning';

        // Clear errors
        document.querySelectorAll('#editForm .error-msg').forEach(function (el) { el.textContent = ''; });

        document.getElementById('editModal').hidden = false;
    }

    function closeEditModal() {
        document.getElementById('editModal').hidden = true;
    }

    // ── Reset all data ─────────────────────────────────────

    function resetAllData() {
        if (!confirm('⚠️ Are you sure you want to delete ALL sales data?\n\nThis action cannot be undone!')) return;
        if (!confirm('This is your last chance. Really delete everything?')) return;
        sales = [];
        localStorage.removeItem(STORAGE_KEY);
        renderAll();
    }

    // ── Event bindings ─────────────────────────────────────

    function bindEvents() {
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', toggleTheme);

        // Add sale form
        document.getElementById('saleForm').addEventListener('submit', function (e) {
            e.preventDefault();
            var result = validateForm('');
            if (!result.valid) return;
            addSale(result.data);

            // Reset form but keep date as today
            this.reset();
            document.getElementById('saleDate').value = todayISO();
        });

        // Edit form
        document.getElementById('editForm').addEventListener('submit', function (e) {
            e.preventDefault();
            var result = validateForm('edit');
            if (!result.valid) return;
            var id = document.getElementById('editId').value;
            updateSale(id, result.data);
            closeEditModal();
        });

        document.getElementById('editCancelBtn').addEventListener('click', closeEditModal);

        // Close modal on overlay click
        document.getElementById('editModal').addEventListener('click', function (e) {
            if (e.target === this) closeEditModal();
        });

        // Close modal on Escape
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && !document.getElementById('editModal').hidden) {
                closeEditModal();
            }
        });

        // Delegated events for edit/delete/toggle buttons
        document.addEventListener('click', function (e) {
            var editBtn = e.target.closest('[data-edit]');
            if (editBtn) {
                openEditModal(editBtn.getAttribute('data-edit'));
                return;
            }

            var deleteBtn = e.target.closest('[data-delete]');
            if (deleteBtn) {
                var id = deleteBtn.getAttribute('data-delete');
                if (confirm('Delete this sale?')) {
                    deleteSale(id);
                }
                return;
            }

            var toggleBtn = e.target.closest('[data-toggle]');
            if (toggleBtn) {
                var detailsEl = document.getElementById('details-' + toggleBtn.getAttribute('data-toggle'));
                if (detailsEl) {
                    detailsEl.classList.toggle('open');
                    toggleBtn.textContent = detailsEl.classList.contains('open') ? 'Details ▴' : 'Details ▾';
                }
            }
        });

        // Filters – re-render on change
        var filterIds = ['filterDateFrom', 'filterDateTo', 'filterCustomerType', 'filterPayment', 'filterSearch'];
        filterIds.forEach(function (id) {
            var el = document.getElementById(id);
            el.addEventListener('input', renderAll);
            el.addEventListener('change', renderAll);
        });

        document.getElementById('clearFiltersBtn').addEventListener('click', clearFilters);

        // Export CSV
        document.getElementById('exportCsvBtn').addEventListener('click', exportCSV);

        // Reset all data
        document.getElementById('resetAllBtn').addEventListener('click', resetAllData);
    }

    // ── Initialisation ─────────────────────────────────────

    function init() {
        loadTheme();
        loadFromLocalStorage();
        migrateOldData();          // convert old records if any exist
        document.getElementById('saleDate').value = todayISO();
        bindEvents();
        renderAll();
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
