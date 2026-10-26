
document.addEventListener('DOMContentLoaded', () => {
    let currentRepayments = [];

    // DOM Elements
    const queryDuePaymentsForm = document.getElementById('queryDuePaymentsForm');
    const fromDateInput = document.getElementById('fromDate');
    const toDateInput = document.getElementById('toDate');
    const loanNotificationsTableBody = document.getElementById('loanNotificationsTableBody');
    const clearQueryButton = document.getElementById('clearQueryButton');
    const notificationsPagination = document.getElementById('notificationsPagination');
    const logoutBtn = document.getElementById('logout');
    const exportPdfBtn = document.getElementById('exportPdfButton');
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

    // Reset all summary figures to zero.
    const resetSummaryFigures = () => {
        if (weeklyTotalEl) weeklyTotalEl.textContent = '₦0';
        if (monthlyTotalEl) monthlyTotalEl.textContent = '₦0';
        if (grandTotalEl) grandTotalEl.textContent = '₦0';

        if (principalTotalEl) principalTotalEl.textContent = '₦0';
        if (interestTotalEl) interestTotalEl.textContent = '₦0';

        if (thisWeekActualTotalEl) thisWeekActualTotalEl.textContent = '₦0';
        if (thisWeekPaidTotalEl) thisWeekPaidTotalEl.textContent = '₦0';
    };

    // Keep summary cards visible.
    const showSummaryCards = () => {
        repaymentsSummary?.classList.remove('hidden');
        principalInterestSummary?.classList.remove('hidden');
        thisWeekSummary?.classList.remove('hidden');
    };

    // Utility function for showing custom alerts.
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

    // Handle logout.
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'index.html';
        });
    }

    // Handle Query Payments form submission.
    if (queryDuePaymentsForm) {
        queryDuePaymentsForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const fromDate = fromDateInput.value;
            const toDate = toDateInput.value;

            if (fromDate && toDate) {
                await fetchDueRepayments(fromDate, toDate);
            } else {
                showCustomAlert(
                    'Please select both a "From" and "To" date.',
                    'error'
                );
            }
        });
    }

    // Handle Clear Query.
    if (clearQueryButton) {
        clearQueryButton.addEventListener('click', () => {
            queryDuePaymentsForm?.reset();

            if (loanNotificationsTableBody) {
                loanNotificationsTableBody.innerHTML =
                    '<tr><td colspan="6" style="text-align: center;">Select a date range and click Query Payments.</td></tr>';
            }

            if (notificationsPagination) {
                notificationsPagination.innerHTML = '';
            }

            currentRepayments = [];

            if (termTypeFilter) {
                termTypeFilter.value = 'all';
            }

            resetSummaryFigures();
            showSummaryCards();
        });
    }

    // Change the table when the term type filter changes.
    // Summary figures remain based on the last queried date range.
    if (termTypeFilter) {
        termTypeFilter.addEventListener('change', () => {
            renderNotificationsTable(currentRepayments);
        });
    }

    // Fetch due repayments from the API.
    const fetchDueRepayments = async (fromDate, toDate) => {
        const token = localStorage.getItem('token');

        if (!token) {
            showCustomAlert('Authentication failed. Please log in.', 'error');
            return;
        }

        const formattedFromDate = `${fromDate}T00:00:00.000Z`;
        const formattedToDate = `${toDate}T23:59:59.999Z`;

        const endpoint =
            `${API_BASE_URL}/Loan/due-repayments?startDate=${formattedFromDate}&endDate=${formattedToDate}`;

        try {
            const response = await fetch(endpoint, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(
                    `Error: ${response.statusText}. Response: ${errorText}`
                );
            }

            const data = await response.json();

            currentRepayments = Array.isArray(data) ? data : [];
            renderNotificationsTable(currentRepayments);

        } catch (error) {
            console.error('Failed to fetch due repayments:', error);

            showCustomAlert(
                'Failed to load due repayments. Please try again.',
                'error'
            );

            currentRepayments = [];
            resetSummaryFigures();
            showSummaryCards();

            if (loanNotificationsTableBody) {
                loanNotificationsTableBody.innerHTML =
                    '<tr><td colspan="6" style="text-align: center;">Failed to load repayments.</td></tr>';
            }
        }
    };

    // Map numeric status codes to descriptive text.
    const getStatusText = (statusCode) => {
        switch (statusCode) {
            case 0:
                return 'Due';
            case 1:
                return 'Paid';
            default:
                return 'Unknown';
        }
    };

    // Format currency.
    const formatCurrency = (amount) =>
        `₦${Number(amount || 0).toLocaleString()}`;

    // Render Principal and Interest totals.
    const renderPrincipalInterestSummary = (repayments) => {
        let totalPrincipal = 0;
        let totalInterest = 0;

        repayments.forEach((r) => {
            totalPrincipal += Number(r.principalPortion || 0);
            totalInterest += Number(r.interestPortion || 0);
        });

        if (principalTotalEl) {
            principalTotalEl.textContent = formatCurrency(totalPrincipal);
        }

        if (interestTotalEl) {
            interestTotalEl.textContent = formatCurrency(totalInterest);
        }
    };

    // Get the current calendar week: Monday to Sunday.
    const getCurrentWeekRange = () => {
        const now = new Date();
        const day = now.getDay();
        const diffToMonday = (day === 0 ? -6 : 1) - day;

        const start = new Date(now);
        start.setDate(now.getDate() + diffToMonday);
        start.setHours(0, 0, 0, 0);

        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);

        return { start, end };
    };

    // Render this week's Actual (Due) and Paid totals.
    const renderThisWeekSummary = (repayments) => {
        const { start, end } = getCurrentWeekRange();

        const dueThisWeek = repayments.filter((r) => {
            const dueDate = new Date(r.dueDate);
            return dueDate >= start && dueDate <= end;
        });

        let actualTotal = 0;
        let paidTotal = 0;

        dueThisWeek.forEach((r) => {
            const amount = Number(r.totalAmount || 0);
            actualTotal += amount;

            if (r.status === 1) {
                paidTotal += amount;
            }
        });

        if (thisWeekActualTotalEl) {
            thisWeekActualTotalEl.textContent = formatCurrency(actualTotal);
        }

        if (thisWeekPaidTotalEl) {
            thisWeekPaidTotalEl.textContent = formatCurrency(paidTotal);
        }
    };

    // Render Weekly, Monthly and Grand totals.
    const renderSummary = (repayments) => {
        let weeklyTotal = 0;
        let monthlyTotal = 0;

        repayments.forEach((r) => {
            const termType = (r.termType || '').toLowerCase();
            const amount = Number(r.totalAmount || 0);

            if (termType === 'weekly') {
                weeklyTotal += amount;
            } else if (termType === 'monthly') {
                monthlyTotal += amount;
            }
        });

        if (weeklyTotalEl) {
            weeklyTotalEl.textContent = formatCurrency(weeklyTotal);
        }

        if (monthlyTotalEl) {
            monthlyTotalEl.textContent = formatCurrency(monthlyTotal);
        }

        if (grandTotalEl) {
            grandTotalEl.textContent =
                formatCurrency(weeklyTotal + monthlyTotal);
        }
    };

    // Render the table using the selected term type filter.
    const renderNotificationsTable = (repayments) => {
        if (!loanNotificationsTableBody) return;

        loanNotificationsTableBody.innerHTML = '';

        if (!Array.isArray(repayments) || repayments.length === 0) {
            loanNotificationsTableBody.innerHTML =
                '<tr><td colspan="6" style="text-align: center;">No due repayments found for the selected date range.</td></tr>';

            resetSummaryFigures();
            showSummaryCards();
            return;
        }

        // Summary totals use the full queried result, not the filtered rows.
        renderSummary(repayments);
        renderPrincipalInterestSummary(repayments);
        renderThisWeekSummary(repayments);
        showSummaryCards();

        const selectedType = termTypeFilter
            ? termTypeFilter.value
            : 'all';

        const filtered = selectedType === 'all'
            ? repayments
            : repayments.filter(
                (r) => (r.termType || '').toLowerCase() === selectedType
            );

        if (filtered.length === 0) {
            loanNotificationsTableBody.innerHTML =
                `<tr><td colspan="6" style="text-align: center;">No ${selectedType} repayments found for the selected date range.</td></tr>`;
            return;
        }

        filtered.forEach((repayment) => {
            const row = document.createElement('tr');

            row.innerHTML = `
                <td>${repayment.loanId}</td>
                <td>${repayment.customerName}</td>
                <td>${repayment.termType || '-'}</td>
                <td>${formatCurrency(repayment.totalAmount)}</td>
                <td>${new Date(repayment.dueDate).toLocaleDateString()}</td>
                <td>${getStatusText(repayment.status)}</td>
            `;

            loanNotificationsTableBody.appendChild(row);
        });
    };

    // Export the queried repayments to PDF.
    const exportToPDF = () => {
        if (!currentRepayments.length) {
            showCustomAlert('No data to export.', 'error');
            return;
        }

        if (!window.jspdf || !window.jspdf.jsPDF) {
            showCustomAlert('PDF export library is not loaded.', 'error');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setFontSize(16);
        doc.text('Due Repayments Report', 14, 15);

        const fromDate = fromDateInput.value;
        const toDate = toDateInput.value;

        if (fromDate && toDate) {
            doc.setFontSize(12);
            doc.text(
                `Period: ${new Date(fromDate).toLocaleDateString()} - ${new Date(toDate).toLocaleDateString()}`,
                14,
                25
            );
        }

        const selectedType = termTypeFilter
            ? termTypeFilter.value
            : 'all';

        const exportRows = selectedType === 'all'
            ? currentRepayments
            : currentRepayments.filter(
                (r) => (r.termType || '').toLowerCase() === selectedType
            );

        const rows = exportRows.map((r) => [
            r.loanId,
            r.customerName,
            r.termType || '-',
            formatCurrency(r.totalAmount),
            new Date(r.dueDate).toLocaleDateString(),
            getStatusText(r.status)
        ]);

        doc.autoTable({
            head: [['Loan ID', 'Customer', 'Type', 'Amount', 'Due Date', 'Status']],
            body: rows,
            startY: 35
        });

        doc.setFontSize(10);
        doc.text(
            `Generated on ${new Date().toLocaleString()}`,
            14,
            doc.internal.pageSize.height - 10
        );

        doc.save('due_repayments.pdf');
    };

    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', exportToPDF);
    }

    // Initialize the summary cards at zero and keep them visible.
    resetSummaryFigures();
    showSummaryCards();

    // Initial authentication check.
    const token = localStorage.getItem('token');

    if (!token) {
        showCustomAlert(
            'You are not logged in. Redirecting...',
            'error'
        );

        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
    }
});
