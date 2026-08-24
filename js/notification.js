document.addEventListener('DOMContentLoaded', () => {
    let currentRepayments = []; // store repayments for export

    // DOM Elements
    const queryDuePaymentsForm = document.getElementById('queryDuePaymentsForm');
    const fromDateInput = document.getElementById('fromDate');
    const toDateInput = document.getElementById('toDate');
    const loanNotificationsTableBody = document.getElementById('loanNotificationsTableBody');
    const clearQueryButton = document.getElementById('clearQueryButton');
    const notificationsPagination = document.getElementById('notificationsPagination');
    const logoutBtn = document.getElementById('logout');
    const exportPdfBtn = document.getElementById('exportPdfButton'); // PDF button

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
            loanNotificationsTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Select a date range and click Query Payments.</td></tr>';
            notificationsPagination.innerHTML = '';
            currentRepayments = [];
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
            currentRepayments = data; // store for export
            renderNotificationsTable(data);

        } catch (error) {
            console.error('Failed to fetch due repayments:', error);
            showCustomAlert('Failed to load due repayments. Please try again.', 'error');
            loanNotificationsTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Failed to load repayments.</td></tr>';
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

    // Function to render data in the table
    const renderNotificationsTable = (repayments) => {
        loanNotificationsTableBody.innerHTML = '';

        if (!repayments || !Array.isArray(repayments) || repayments.length === 0) {
            loanNotificationsTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No due repayments found for the selected date range.</td></tr>';
            return;
        }

        repayments.forEach(repayment => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${repayment.loanId}</td>
                <td>${repayment.customerName}</td>
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

        // Table data
        const rows = currentRepayments.map(r => [
            r.loanId,
            r.customerName,
            `₦${r.totalAmount.toLocaleString()}`,
            new Date(r.dueDate).toLocaleDateString(),
            getStatusText(r.status)
        ]);

        doc.autoTable({
            head: [["Loan ID", "Customer", "Amount", "Due Date", "Status"]],
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
