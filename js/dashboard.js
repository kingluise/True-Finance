
document.addEventListener('DOMContentLoaded', () => {
    // API Configuration - This is where you'll add your actual API base URL.

    // DOM Elements
    const greetingText = document.getElementById('greetingText');
    const dateTimeDisplay = document.getElementById('dateTimeDisplay');
    const totalLoansEl = document.getElementById('total-loans');
    const pendingLoansEl = document.getElementById('pending-loans');
    const activeLoansEl = document.getElementById('active-loans');
    const completedLoansEl = document.getElementById('completed-loans-count');
    const completedLoansAmountEl = document.getElementById('completed-loans-amount');
    const overdueLoansEl = document.getElementById('overdue-loans');
    const totalCustomersEl = document.getElementById('total-customers');
    const duePaymentsEl = document.getElementById('due-payments');
    const totalPrincipalEl = document.getElementById('total-principal');
    const totalInterestEl = document.getElementById('total-interest');
    const dueMonthActualEl = document.getElementById('due-month-actual');
    const dueMonthPaidEl = document.getElementById('due-month-paid');
    const totalLoanBookValueEl = document.getElementById('total-loan-book-value');
    const totalActiveLoanValueEl = document.getElementById('total-active-loan-value');
    const transactionsTable = document.querySelector('.transactions table');
    const logoutBtn = document.getElementById('logout');
    const loanChartCanvas = document.getElementById('loanChart');

    // Keep track of the chart so it can be refreshed safely.
    let loanChart = null;

    // Utility function for showing custom alerts without using window.alert
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

    // Function to set greeting and date/time
    const setDateTimeAndGreeting = () => {
        const now = new Date();
        const hours = now.getHours();
        let greeting = '';

        if (hours >= 5 && hours < 12) {
            greeting = 'Good morning';
        } else if (hours >= 12 && hours < 17) {
            greeting = 'Good afternoon';
        } else {
            greeting = 'Good evening';
        }

        if (greetingText) {
            greetingText.textContent = `${greeting}, Admin`;
        }

        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };

        const date = now.toLocaleDateString('en-US', options);
        const time = now.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });

        if (dateTimeDisplay) {
            dateTimeDisplay.textContent = `${date} | ${time}`;
        }

        // Log the detected time for debugging
        console.log(`Current PC time is: ${hours} hours. Greeting set to: ${greeting}`);
    };

    // Function to fetch all dashboard data from a single endpoint
    const fetchDashboardData = async () => {
        const token = localStorage.getItem('token');

        if (!token) {
            showCustomAlert('Authentication failed. Please log in.', 'error');
            setTimeout(() => window.location.href = 'index.html', 2000);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/Dashboard/overview`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error: ${response.statusText}. Response: ${errorText}`);
            }

            const data = await response.json();

            // Update all sections of the dashboard from the single response
            updateDashboardCards(data);
            renderLoanChart(data);
            updateTransactionsTable(data.recentTransactions);

        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
            showCustomAlert('Failed to load dashboard data. Please try again.', 'error');
        }
    };

    // Function to update the dashboard cards
    const updateDashboardCards = (data) => {
        if (!data) return;

        totalLoansEl.textContent =
            data.totalLoans !== undefined ? data.totalLoans : 0;

        pendingLoansEl.textContent =
            data.pendingApprovals !== undefined ? data.pendingApprovals : 0;

        activeLoansEl.textContent =
            data.activeLoans !== undefined ? data.activeLoans : 0;

        // Completed Loans
        if (completedLoansEl) {
            completedLoansEl.textContent =
                data.completedLoans !== undefined ? data.completedLoans : 0;
        }

        if (completedLoansAmountEl) {
            completedLoansAmountEl.textContent =
                data.completedLoansAmount !== undefined
                    ? `₦${Number(data.completedLoansAmount).toLocaleString()}`
                    : '₦0';
        }

        overdueLoansEl.textContent =
            data.overdueLoans !== undefined ? data.overdueLoans : 0;

        totalCustomersEl.textContent =
            data.totalCustomers !== undefined ? data.totalCustomers : 0;

        duePaymentsEl.textContent =
            data.duePaymentsToday !== undefined
                ? `₦${data.duePaymentsToday.toLocaleString()}`
                : '₦0';

        totalPrincipalEl.textContent =
            data.totalPrincipal !== undefined
                ? `₦${data.totalPrincipal.toLocaleString()}`
                : '₦0';

        totalInterestEl.textContent =
            data.totalInterest !== undefined
                ? `₦${data.totalInterest.toLocaleString()}`
                : '₦0';

        // Due Payments (This Month): Actual vs Paid
        if (dueMonthActualEl) {
            dueMonthActualEl.textContent =
                data.duePaymentsThisMonthActual !== undefined
                    ? `₦${data.duePaymentsThisMonthActual.toLocaleString()}`
                    : '₦0';
        }

        if (dueMonthPaidEl) {
            dueMonthPaidEl.textContent =
                data.duePaymentsThisMonthPaid !== undefined
                    ? `₦${data.duePaymentsThisMonthPaid.toLocaleString()}`
                    : '₦0';
        }

        // Total Loan Book Value
        if (totalLoanBookValueEl) {
            totalLoanBookValueEl.textContent =
                data.totalLoanBookValue !== undefined
                    ? `₦${data.totalLoanBookValue.toLocaleString()}`
                    : '₦0';
        }

        // Total Active Loan Value
        if (totalActiveLoanValueEl) {
            totalActiveLoanValueEl.textContent =
                data.totalActiveLoanValue !== undefined
                    ? `₦${data.totalActiveLoanValue.toLocaleString()}`
                    : '₦0';
        }
    };

    // Function to update the transactions table
    const updateTransactionsTable = (transactions) => {
        if (!transactionsTable) return;

        let tbody = transactionsTable.querySelector('tbody');

        if (!tbody) {
            tbody = document.createElement('tbody');
            transactionsTable.appendChild(tbody);
        }

        tbody.innerHTML = '';

        if (!transactions || transactions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="3" class="text-center text-gray-500 py-4">
                        No recent transactions found.
                    </td>
                </tr>
            `;
            return;
        }

        transactions.forEach(tx => {
            const statusClass = tx.status.toLowerCase();
            const row = document.createElement('tr');

            row.innerHTML = `
                <td>${tx.customerName}</td>
                <td>₦${tx.amount.toLocaleString()}</td>
                <td><span class="status ${statusClass}">${tx.status}</span></td>
            `;

            tbody.appendChild(row);
        });
    };

    // Function to render the loan chart
    const renderLoanChart = (data) => {
        if (!data || !loanChartCanvas) return;

        // Destroy the previous chart before creating a new one.
        if (loanChart) {
            loanChart.destroy();
        }

        const ctx = loanChartCanvas.getContext('2d');

        loanChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Active Loans', 'Overdue Loans'],
                datasets: [{
                    label: '# of Loans',
                    data: [data.activeLoans, data.overdueLoans],
                    backgroundColor: [
                        'rgba(75, 192, 192, 0.6)',
                        'rgba(255, 99, 132, 0.6)'
                    ],
                    borderColor: [
                        'rgba(75, 192, 192, 1)',
                        'rgba(255, 99, 132, 1)'
                    ],
                    borderWidth: 1,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Loans'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Active vs. Overdue Loans'
                    }
                }
            }
        });
    };

    // Handle logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'index.html';
        });
    }

    // Initial checks and data fetching
    setDateTimeAndGreeting();
    fetchDashboardData();

    // Refresh dashboard data every 30 seconds
    setInterval(() => {
        fetchDashboardData();
    }, 30000);

    // Update time every minute
    setInterval(() => {
        setDateTimeAndGreeting();
    }, 60000);
});
