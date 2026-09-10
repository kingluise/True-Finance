document.addEventListener('DOMContentLoaded', () => {
    const repaymentsTableBody = document.getElementById('repaymentsTableBody');
    const termTypeFilter = document.getElementById('termTypeFilter');
    const totalDueValue = document.getElementById('totalDueValue');
    const totalDuePeriod = document.getElementById('totalDuePeriod');
    const principalDueValue = document.getElementById('principalDueValue');
    const interestDueValue = document.getElementById('interestDueValue');

    const getAuthToken = () => localStorage.getItem('token');

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
        alert.querySelector('.close-btn')?.addEventListener('click', () => alert.remove());
    };

    const formatCurrency = (amount) => `₦${Number(amount || 0).toLocaleString()}`;
    const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString() : '-';

    const renderSummary = (summary) => {
        if (!summary) return;
        totalDueValue.textContent = formatCurrency(summary.totalDue);
        principalDueValue.textContent = formatCurrency(summary.principalDue);
        interestDueValue.textContent = formatCurrency(summary.interestDue);
        totalDuePeriod.textContent = summary.period || '-';
    };

    const renderTable = (loans) => {
        repaymentsTableBody.innerHTML = '';

        if (!loans || !loans.length) {
            repaymentsTableBody.innerHTML = '<tr><td colspan="13" style="text-align:center;">No loans found for this filter.</td></tr>';
            return;
        }

        loans.forEach(loan => {
            const statusClass = `status-${(loan.status || '').toLowerCase()}`;
            const balanceClass = (loan.balance || 0) <= 0 ? 'balance-zero' : 'balance-positive';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${loan.customerName || '-'}</td>
                <td>${formatCurrency(loan.principal)}</td>
                <td>${loan.termType || '-'}</td>
                <td>${loan.interestRate != null ? loan.interestRate + '%' : '-'}</td>
                <td>${formatCurrency(loan.expectedInterest)}</td>
                <td>${formatCurrency(loan.total)}</td>
                <td>${loan.durationValue ?? '-'}</td>
                <td>${formatCurrency(loan.installmentAmount)}</td>
                <td>${formatCurrency(loan.amountPaid)}</td>
                <td class="${balanceClass}">${formatCurrency(loan.balance)}</td>
                <td><span class="status-badge ${statusClass}">${loan.status || '-'}</span></td>
                <td>${formatDate(loan.startDate)}</td>
                <td>${formatDate(loan.endDate)}</td>
            `;
            repaymentsTableBody.appendChild(row);
        });
    };

    const fetchRepaymentOverview = async (termType) => {
        repaymentsTableBody.innerHTML = '<tr><td colspan="13" style="text-align:center;">Loading loan repayments...</td></tr>';

        const token = getAuthToken();
        if (!token) {
            repaymentsTableBody.innerHTML = '<tr><td colspan="13" style="text-align:center;">Please log in to view loan repayments.</td></tr>';
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/Loan/repayment-overview?termType=${encodeURIComponent(termType)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Failed to fetch loan repayments');

            const data = await response.json();
            renderTable(data.loans);
            renderSummary(data.monthlySummary);
        } catch (error) {
            console.error('Error fetching loan repayments:', error);
            showCustomAlert('Failed to load loan repayments. Please try again.', 'error');
            repaymentsTableBody.innerHTML = '<tr><td colspan="13" style="text-align:center;">Failed to load loan repayments.</td></tr>';
        }
    };

    termTypeFilter?.addEventListener('change', () => {
        fetchRepaymentOverview(termTypeFilter.value);
    });

    // Initial load
    fetchRepaymentOverview(termTypeFilter ? termTypeFilter.value : 'all');
});