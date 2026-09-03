document.addEventListener('DOMContentLoaded', () => {
    let currentRepayments = []; // store all fetched repayments (unfiltered) for export/summary

    // DOM Elements
    const queryDuePaymentsForm = document.getElementById('queryDuePaymentsForm');
    const fromDateInput = document.getElementById('fromDate');
    const toDateInput = document.getElementById('toDate');
    const loanNotificationsTableBody = document.getElementById('loanNotificationsTableBody');
    const clearQueryButton = document.getElementById('clearQueryButton');
    const notificationsPagination = document.getElementById('notificationsPagination');
    const logoutBtn = document.getElementById('logout');
    const exportPdfBtn = document.getElementById('exportPdfButton'); // PDF button
    const termTypeFilter = document.getElementById('termTypeFilter');
    const repaymentsSummary = document.getElementById('repaymentsSummary');
    const weeklyTotalEl = document.getElementById('weeklyTotal');
    const monthlyTotalEl = document.getElementById('monthlyTotal');
    const grandTotalEl = document.getElementById('grandTotal');
    const principalInterestSummary = document.getElementById('principalInterestSummary');
    const principalTotalEl = document.getElementById('principalTotal');
    const interestTotalEl = document.getElementById('interestTotal');
    const thisWeekSummary = document.getElementById('thisWeekSummary');
    const thisWeekActualTotalEl = document.getElementById('thisWeekActualTotal');
    const thisWeekPaidTotalEl = document.getElementById('thisWeekPaidTotal');

    // Utility function for showing custom alerts
    const showCustomAlert = (message, type) => {
        const container = document.getElementById('customAlertContainer');
        if (!container) return;
        const alert = document.createElement('div');
        alert.className = `custom-alert custom-alert-${type}`;
        alert.innerHTML = `
            <span class="alert-message">${message}</span>
            <span class="close-btn">&times;</span>
        `;
        container.appendChild(alert);

        setTimeout(() => alert.classList.add('fade-out'), 4500);
        setTimeout(() => alert.remove(), 5000);

        alert.querySelector('.close-btn').onclick = () => alert.remove();
    };

    // Handle logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'index.html';
        });
    }

    // Handle Query Payments form submission
    if (queryDuePaymentsForm) {
        queryDuePaymentsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fromDate = fromDateInput.value;
            const toDate = toDateInput.value;
            if (fromDate && toDate) {
                await fetchDueRepayments(fromDate, toDate);
            } else {
                showCustomAlert('Please select both a "From" and "To" date.', 'error');
            }
        });
    }

    // Handle Clear Query button click
    if (clearQueryButton) {
        clearQueryButton.addEventListener('click', () => {
            queryDuePaymentsForm.reset();
            loanNotificationsTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Select a date range and click Query Payments.</td></tr>';
            notificationsPagination.innerHTML = '';
            currentRepayments = [];
            if (termTypeFilter) termTypeFilter.value = 'all';
            repaymentsSummary?.classList.add('hidden');
            principalInterestSummary?.classList.add('hidden');
            thisWeekSummary?.classList.add('hidden');
        });
    }

    // Re-render (filtered table + summary) whenever the filter changes
    if (termTypeFilter) {
        termTypeFilter.addEventListener('change', () => {
            renderNotificationsTable(currentRepayments);
        });
    }

    // Function to fetch due repayments from the API
    const fetchDueRepayments = async (fromDate, toDate) => {
        const token = localStorage.getItem('token');
        if (!token) {
            showCustomAlert('Authentication failed. Please log in.', 'error');
            return;
        }
        
        // Construct full ISO 8601 date-time strings
        const formattedFromDate = `${fromDate}T00:00:00.000Z`;
        const formattedToDate = `${toDate}T23:59:59.999Z`;

        // ✅ corrected query parameter names
        const endpoint = `${API_BASE_URL}/Loan/due-repayments?startDate=${formattedFromDate}&endDate=${formattedToDate}`;

        try {
            const response = await fetch(endpoint, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error: ${response.statusText}. Response: ${errorText}`);
            }

            const data = await response.json();
            currentRepayments = data; // store full unfiltered set for export/summary
            renderNotificationsTable(currentRepayments);

        } catch (error) {
            console.error('Failed to fetch due repayments:', error);
            showCustomAlert('Failed to load due repayments. Please try again.', 'error');
            loanNotificationsTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Failed to load repayments.</td></tr>';
            repaymentsSummary?.classList.add('hidden');
            principalInterestSummary?.classList.add('hidden');
            thisWeekSummary?.classList.add('hidden');
        }
    };

    // Function to map numeric status code to a descriptive string
    const getStatusText = (statusCode) => {
        switch (statusCode) {
            case 0:
                return "Due";
            case 1:
                return "Paid";
            default:
                return "Unknown";
        }
    };

    // Formats a currency total consistently
    const formatCurrency = (amount) => `₦${amount.toLocaleString()}`;

    // Computes and renders the Principal vs Interest breakdown for the FULL
    // queried result set (the date range from the form), not affected by the type filter.
    const renderPrincipalInterestSummary = (repayments) => {
        if (!repayments || !repayments.length) {
            principalInterestSummary?.classList.add('hidden');
            return;
        }

        let totalPrincipal = 0;
        let totalInterest = 0;

        repayments.forEach(r => {
            totalPrincipal += r.principalPortion || 0;
            totalInterest += r.interestPortion || 0;
        });

        principalTotalEl.textContent = formatCurrency(totalPrincipal);
        interestTotalEl.textContent = formatCurrency(totalInterest);
        principalInterestSummary?.classList.remove('hidden');
    };

    // Returns { start, end } for the current calendar week (Monday 00:00:00
    // through Sunday 23:59:59.999), based on today's actual date.
    const getCurrentWeekRange = () => {
        const now = new Date();
        const day = now.getDay(); // 0 = Sun, 1 = Mon, ... 6 = Sat
        const diffToMonday = (day === 0 ? -6 : 1) - day;

        const start = new Date(now);
        start.setDate(now.getDate() + diffToMonday);
        start.setHours(0, 0, 0, 0);

        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);

        return { start, end };
    };

    // Computes and renders the "This Week" card: Actual (Due) vs Paid, for
    // repayments whose dueDate falls within the current Mon-Sun week, drawn
    // from the FULL currentRepayments set regardless of the queried date
    // range or the type filter.
    const renderThisWeekSummary = (repayments) => {
        if (!repayments || !repayments.length) {
            thisWeekSummary?.classList.add('hidden');
            return;
        }

        const { start, end } = getCurrentWeekRange();

        const dueThisWeek = repayments.filter(r => {
            const dueDate = new Date(r.dueDate);
            return dueDate >= start && dueDate <= end;
        });

        if (!dueThisWeek.length) {
            thisWeekSummary?.classList.add('hidden');
            return;
        }

        let actualTotal = 0;
        let paidTotal = 0;

        dueThisWeek.forEach(r => {
            actualTotal += r.totalAmount;
            if (r.status === 1) { // 1 = Paid
                paidTotal += r.totalAmount;
            }
        });

        thisWeekActualTotalEl.textContent = formatCurrency(actualTotal);
        thisWeekPaidTotalEl.textContent = formatCurrency(paidTotal);
        thisWeekSummary?.classList.remove('hidden');
    };

    // Computes and renders the Weekly / Monthly / Grand totals from the FULL
    // queried result set (not affected by the type filter), so the breakdown
    // is always visible regardless of which rows are currently listed.
    const renderSummary = (repayments) => {
        if (!repayments || !repayments.length) {
            repaymentsSummary?.classList.add('hidden');
            return;
        }

        let weeklyTotal = 0;
        let monthlyTotal = 0;

        repayments.forEach(r => {
            const termType = (r.termType || '').toLowerCase();
            if (termType === 'weekly') {
                weeklyTotal += r.totalAmount;
            } else if (termType === 'monthly') {
                monthlyTotal += r.totalAmount;
            }
        });

        weeklyTotalEl.textContent = formatCurrency(weeklyTotal);
        monthlyTotalEl.textContent = formatCurrency(monthlyTotal);
        grandTotalEl.textContent = formatCurrency(weeklyTotal + monthlyTotal);
        repaymentsSummary?.classList.remove('hidden');
    };

    // Function to render data in the table, applying the current type filter
    const renderNotificationsTable = (repayments) => {
        loanNotificationsTableBody.innerHTML = '';

        if (!repayments || !Array.isArray(repayments) || repayments.length === 0) {
            loanNotificationsTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No due repayments found for the selected date range.</td></tr>';
            repaymentsSummary?.classList.add('hidden');
            principalInterestSummary?.classList.add('hidden');
            thisWeekSummary?.classList.add('hidden');
            return;
        }

        // Summary always reflects the full queried range, regardless of the filter
        renderSummary(repayments);
        renderPrincipalInterestSummary(repayments);
        renderThisWeekSummary(repayments);

        const selectedType = termTypeFilter ? termTypeFilter.value : 'all';
        const filtered = selectedType === 'all'
            ? repayments
            : repayments.filter(r => (r.termType || '').toLowerCase() === selectedType);

        if (!filtered.length) {
            loanNotificationsTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center;">No ${selectedType} repayments found for the selected date range.</td></tr>`;
            return;
        }

        filtered.forEach(repayment => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${repayment.loanId}</td>
                <td>${repayment.customerName}</td>
                <td>${repayment.termType || '-'}</td>
                <td>₦${repayment.totalAmount.toLocaleString()}</td>
                <td>${new Date(repayment.dueDate).toLocaleDateString()}</td>
                <td>${getStatusText(repayment.status)}</td>
            `;
            loanNotificationsTableBody.appendChild(row);
        });
    };

    // ✅ Export to PDF
    const exportToPDF = () => {
        if (!currentRepayments.length) {
            showCustomAlert("No data to export.", "error");
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Title
        doc.setFontSize(16);
        doc.text("Due Repayments Report", 14, 15);

        // Date range info
        const fromDate = fromDateInput.value;
        const toDate = toDateInput.value;
        if (fromDate && toDate) {
            doc.setFontSize(12);
            doc.text(`Period: ${new Date(fromDate).toLocaleDateString()} - ${new Date(toDate).toLocaleDateString()}`, 14, 25);
        }

        // Respect the current filter in the export too
        const selectedType = termTypeFilter ? termTypeFilter.value : 'all';
        const exportRows = selectedType === 'all'
            ? currentRepayments
            : currentRepayments.filter(r => (r.termType || '').toLowerCase() === selectedType);

        // Table data
        const rows = exportRows.map(r => [
            r.loanId,
            r.customerName,
            r.termType || '-',
            `₦${r.totalAmount.toLocaleString()}`,
            new Date(r.dueDate).toLocaleDateString(),
            getStatusText(r.status)
        ]);

        doc.autoTable({
            head: [["Loan ID", "Customer", "Type", "Amount", "Due Date", "Status"]],
            body: rows,
            startY: 35,
        });

        // Footer with generation date
        doc.setFontSize(10);
        doc.text(`Generated on ${new Date().toLocaleString()}`, 14, doc.internal.pageSize.height - 10);

        doc.save("due_repayments.pdf");
    };

    if (exportPdfBtn) {
        exportPdfBtn.addEventListener("click", exportToPDF);
    }

    // Initial check for a user and token
    const token = localStorage.getItem('token');
    if (!token) {
        showCustomAlert('You are not logged in. Redirecting...', 'error');
        setTimeout(() => window.location.href = 'index.html', 2000);
    }
});