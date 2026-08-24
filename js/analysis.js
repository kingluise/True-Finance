document.addEventListener('DOMContentLoaded', () => {
    // API Configuration
   

    // DOM Elements
    const profitAnalysisSection = document.getElementById('profitAnalysis');
    const filterPeriodSelect = document.getElementById('filterPeriod');
    const monthYearSelector = document.getElementById('monthYearSelector');
    const quarterYearSelector = document.getElementById('quarterYearSelector');
    const yearOnlySelector = document.getElementById('yearOnlySelector');
    const customRangeSelector = document.getElementById('customRangeSelector');
    const profitAnalysisTableBody = document.querySelector('#profitAnalysisTable tbody');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const logoutBtn = document.getElementById('logout');

    const monthInput = document.getElementById('month');
    const yearInput = document.getElementById('year');
    const applyMonthYearBtn = document.getElementById('applyMonthYearFilter');

    const quarterInput = document.getElementById('quarter');
    const yearQuarterInput = document.getElementById('yearQuarter');
    const applyQuarterYearBtn = document.getElementById('applyQuarterYearFilter');

    const onlyYearInput = document.getElementById('onlyYear');
    const applyYearBtn = document.getElementById('applyYearFilter');

    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const applyCustomRangeBtn = document.getElementById('applyCustomRangeFilter');

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

    // Show/Hide filter controls based on selection
    const showFilterControls = (selectedPeriod) => {
        monthYearSelector.style.display = 'none';
        quarterYearSelector.style.display = 'none';
        yearOnlySelector.style.display = 'none';
        customRangeSelector.style.display = 'none';

        switch (selectedPeriod) {
            case 'monthly':
                monthYearSelector.style.display = 'block';
                break;
            case 'quarterly':
                quarterYearSelector.style.display = 'block';
                break;
            case 'yearly':
                yearOnlySelector.style.display = 'block';
                break;
            case 'custom':
                customRangeSelector.style.display = 'block';
                break;
        }
    };
    showFilterControls('monthly'); // Set default view

    filterPeriodSelect.addEventListener('change', (e) => {
        showFilterControls(e.target.value);
    });

    // Handle button clicks to fetch data
    applyMonthYearBtn.addEventListener('click', () => {
        const month = monthInput.value;
        const year = yearInput.value;
        if (month && year) {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0);
            fetchAnalyticsData(startDate.toISOString(), endDate.toISOString(), 'monthly', { year, month });
        } else {
            showCustomAlert('Please select a month and year.', 'error');
        }
    });

    applyQuarterYearBtn.addEventListener('click', () => {
        const quarter = quarterInput.value;
        const year = yearQuarterInput.value;
        if (quarter && year) {
            const startMonth = (quarter - 1) * 3;
            const endMonth = startMonth + 2;
            const startDate = new Date(year, startMonth, 1);
            const endDate = new Date(year, endMonth + 1, 0);
            fetchAnalyticsData(startDate.toISOString(), endDate.toISOString(), 'quarterly', { year, quarter });
        } else {
            showCustomAlert('Please select a quarter and year.', 'error');
        }
    });

    applyYearBtn.addEventListener('click', () => {
        const year = onlyYearInput.value;
        if (year) {
            const startDate = new Date(year, 0, 1);
            const endDate = new Date(year, 11, 31);
            fetchAnalyticsData(startDate.toISOString(), endDate.toISOString(), 'yearly', { year });
        } else {
            showCustomAlert('Please enter a year.', 'error');
        }
    });

    applyCustomRangeBtn.addEventListener('click', () => {
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;
        if (startDate && endDate) {
            const startISO = `${startDate}T00:00:00.000Z`;
            const endISO = `${endDate}T23:59:59.999Z`;
            fetchAnalyticsData(startISO, endISO, 'custom', {});
        } else {
            showCustomAlert('Please select both a start and end date.', 'error');
        }
    });

    // Function to fetch analytics data from the API
    const fetchAnalyticsData = async (startDate, endDate, period, additionalParams) => {
        const token = localStorage.getItem('token');
        if (!token) {
            showCustomAlert('Authentication failed. Please log in.', 'error');
            return;
        }
        
        loadingIndicator.style.display = 'block';

        let endpoint = `${API_BASE_URL}/Loan/profit-analytics?startDate=${startDate}&endDate=${endDate}&filterType=${period}`;
        
        if (additionalParams.year) { endpoint += `&year=${additionalParams.year}`; }
        if (additionalParams.month) { endpoint += `&month=${additionalParams.month}`; }
        if (additionalParams.quarter) { endpoint += `&quarter=${additionalParams.quarter}`; }

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
            renderAnalyticsTable(data);

        } catch (error) {
            console.error('Failed to fetch analytics data:', error);
            showCustomAlert('Failed to load analytics data. Please try again.', 'error');

        } finally {
            loadingIndicator.style.display = 'none';
        }
    };

    // Function to render data in the table
    const renderAnalyticsTable = (data) => {
        profitAnalysisTableBody.innerHTML = '';
        if (!data || data.totalDisbursement === undefined) {
            profitAnalysisTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center;">No profit data found for this period.</td></tr>`;
            return;
        }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${data.period}</td>
            <td>₦${data.totalDisbursement.toLocaleString()}</td>
            <td>₦${data.totalRepayment.toLocaleString()}</td>
            <td>₦${data.totalExpectedInterest.toLocaleString()}</td>
            <td>${data.defaultedLoans}</td>
            <td>₦${data.totalDefaultedAmount.toLocaleString()}</td>
            <td>₦${data.profitEarned.toLocaleString()}</td>
        `;
        profitAnalysisTableBody.appendChild(row);
    };

    // Export functionality (placeholders)
    exportPdfBtn.addEventListener('click', () => {
        // You'll need to use a library like jsPDF for full functionality
        showCustomAlert('PDF export functionality not yet implemented.', 'info');
    });

    exportXmlBtn.addEventListener('click', () => {
        // You'll need a library or custom logic for this
        showCustomAlert('XML export functionality not yet implemented.', 'info');
    });

    // Handle logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'index.html';
        });
    }

    // Initial check for a user and token
    const token = localStorage.getItem('token');
    if (!token) {
        showCustomAlert('You are not logged in. Redirecting...', 'error');
        setTimeout(() => window.location.href = 'index.html', 2000);
    }
});
