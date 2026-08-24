document.addEventListener('DOMContentLoaded', () => {
    // API Configuration - This is where you'll add your actual API base URL.
    

    // DOM Elements
    const greetingText = document.getElementById('greetingText');
    const dateTimeDisplay = document.getElementById('dateTimeDisplay');
    const totalLoansEl = document.getElementById('total-loans');
    const pendingLoansEl = document.getElementById('pending-loans');
    const activeLoansEl = document.getElementById('active-loans');
    const overdueLoansEl = document.getElementById('overdue-loans');
    const totalCustomersEl = document.getElementById('total-customers');
    const duePaymentsEl = document.getElementById('due-payments');
    const totalPrincipalEl = document.getElementById('total-principal');
    const totalInterestEl = document.getElementById('total-interest');
    const transactionsTable = document.querySelector('.transactions table');
    const logoutBtn = document.getElementById('logout');
    const loanChartCanvas = document.getElementById('loanChart');

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
        
        greetingText.textContent = `${greeting}, Admin`;

        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const date = now.toLocaleDateString('en-US', options);
        const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        dateTimeDisplay.textContent = `${date} | ${time}`;
        
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
        totalLoansEl.textContent = data.totalLoans !== undefined ? data.totalLoans : 0;
        pendingLoansEl.textContent = data.pendingApprovals !== undefined ? data.pendingApprovals : 0;
        activeLoansEl.textContent = data.activeLoans !== undefined ? data.activeLoans : 0;
        overdueLoansEl.textContent = data.overdueLoans !== undefined ? data.overdueLoans : 0;
        totalCustomersEl.textContent = data.totalCustomers !== undefined ? data.totalCustomers : 0;
        duePaymentsEl.textContent = data.duePaymentsToday !== undefined ? `₦${data.duePaymentsToday.toLocaleString()}` : '₦0';
        totalPrincipalEl.textContent = data.totalPrincipal !== undefined ? `₦${data.totalPrincipal.toLocaleString()}` : '₦0';
        totalInterestEl.textContent = data.totalInterest !== undefined ? `₦${data.totalInterest.toLocaleString()}` : '₦0';
    };

    // Function to update the transactions table
    const updateTransactionsTable = (transactions) => {
        let tbody = transactionsTable.querySelector('tbody');
        if (!tbody) {
            tbody = document.createElement('tbody');
            transactionsTable.appendChild(tbody);
        }
        tbody.innerHTML = '';
        
        if (!transactions || transactions.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" class="text-center text-gray-500 py-4">No recent transactions found.</td></tr>`;
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
        if (!data) return;
        const ctx = loanChartCanvas.getContext('2d');
        new Chart(ctx, {
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

    // Update time every minute
    setInterval(() => {
        setDateTimeAndGreeting();
    }, 60000);
});
