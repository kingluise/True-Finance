document.addEventListener('DOMContentLoaded', () => {

    // ================= DOM ELEMENTS =================
    // Main Section Buttons
    const logPaymentBtn = document.getElementById('logPaymentBtn');
    const paymentConfirmationBtn = document.getElementById('paymentConfirmationBtn');
    const paymentTrackerBtn = document.getElementById('paymentTrackerBtn');
    const goBackBtns = document.querySelectorAll('.go-back-button, #cancelLogPayment');

    // Main Sections
    const logPaymentFormSection = document.getElementById('logPaymentForm');
    const confirmationTableContainer = document.getElementById('confirmationTableContainer');
    const paymentTrackerContainer = document.getElementById('paymentTrackerContainer');
    const paymentButtons = document.getElementById('paymentButtons');

    // Log Payment Form elements
    const fetchLoanBtn = document.getElementById('fetchLoanBtn');
    const paymentForm = document.getElementById('paymentForm');
    const loanIdInput = document.getElementById('loanIdInput');
    const borrowerInfoSection = document.getElementById('borrowerInfo');
    const paymentDetailsSection = document.getElementById('paymentDetails');
    const paymentPlanContainer = document = document.getElementById('paymentPlanContainer');
    const paymentPlanTableBody = document.getElementById('paymentPlanTableBody');
    const selectedPaymentPlanItemIdInput = document.getElementById('selectedPaymentPlanItemId');
    const amountPaidInput = document.getElementById('amountPaid');

    // Payment Confirmation elements
    const confirmationTableBody = document.getElementById('confirmationTableBody');
    
    // Payment Tracker elements
    const trackerLoanIdInput = document.getElementById('trackerLoanIdInput');
    const trackerFetchBtn = document.getElementById('trackerFetchBtn');
    const paymentTrackerTableBody = document.getElementById('paymentTrackerTableBody');

    const logoutBtn = document.getElementById('logout');

    // ================= UTILITIES =================
    const showSection = (el) => el.classList.remove('hidden');
    const hideSection = (el) => el.classList.add('hidden');

    const showCustomAlert = (message, type) => {
        const container = document.getElementById('customAlertContainer');
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

    // ================= BUTTON LOGIC =================
    logPaymentBtn.addEventListener('click', () => {
        hideSection(paymentButtons);
        hideSection(confirmationTableContainer);
        hideSection(paymentTrackerContainer);
        showSection(logPaymentFormSection);
    });

    paymentConfirmationBtn.addEventListener('click', () => {
        hideSection(paymentButtons);
        hideSection(logPaymentFormSection);
        hideSection(paymentTrackerContainer);
        showSection(confirmationTableContainer);
        fetchPaymentsForConfirmation();
    });

    paymentTrackerBtn.addEventListener('click', () => {
        hideSection(paymentButtons);
        hideSection(logPaymentFormSection);
        hideSection(confirmationTableContainer);
        showSection(paymentTrackerContainer);
    });

    goBackBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            showSection(paymentButtons);
            hideSection(logPaymentFormSection);
            hideSection(confirmationTableContainer);
            hideSection(paymentTrackerContainer);
        });
    });
    
    // ================= LOGOUT =================
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'index.html';
        });
    }

    // ================= LOAN DETAILS =================
    fetchLoanBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const loanId = loanIdInput.value.trim();
        if (loanId) {
            await fetchLoanDetails(loanId);
        } else {
            showCustomAlert('Please enter a Loan ID.', 'error');
            hideSection(borrowerInfoSection);
            hideSection(paymentPlanContainer);
            hideSection(paymentDetailsSection);
        }
    });

    const fetchLoanDetails = async (loanId) => {
        const token = localStorage.getItem('token');
        if (!token) {
            showCustomAlert('Authentication failed. Please log in.', 'error');
            return;
        }

        // NOTE: This assumes API_BASE_URL is defined in config.js
        const loanDetailsEndpoint = `${API_BASE_URL}/Loan/${loanId}`;
        try {
            const response = await fetch(loanDetailsEndpoint, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error(`Error ${response.status}`);
            }

            const loanData = await response.json();
            renderLoanDetails(loanData);
        } catch (error) {
            console.error('Failed to fetch loan details:', error);
            showCustomAlert('Failed to load loan details. Please check the Loan ID.', 'error');
            hideSection(borrowerInfoSection);
            hideSection(paymentPlanContainer);
            hideSection(paymentDetailsSection);
        }
    };

    const renderLoanDetails = (loanData) => {
        // Log the full data for debugging
        console.log("API Response Data:", loanData);

        if (!loanData || !loanData.repaymentSchedules) {
            showCustomAlert("No loan data returned or repayment schedule is missing.", "error");
            return;
        }

        document.getElementById('fullName').value = loanData.customerFullName || '';
        document.getElementById('loanType').value = loanData.loanType || '';
        document.getElementById('loanAmount').value = loanData.loanAmount || 0;

        showSection(borrowerInfoSection);
        showSection(paymentPlanContainer);
        showSection(paymentDetailsSection);

        paymentPlanTableBody.innerHTML = '';
        if (Array.isArray(loanData.repaymentSchedules) && loanData.repaymentSchedules.length > 0) {
            // Filter to find the first pending installment (status = 0)
            const firstPendingInstallment = loanData.repaymentSchedules.find(item => item.status === 0);

            if (!firstPendingInstallment) {
                paymentPlanTableBody.innerHTML =
                    '<tr><td colspan="4" class="text-center">No pending payments found for this loan.</td></tr>';
            } else {
                const item = firstPendingInstallment;
                const statusText = item.status === 0 ? 'Pending' : 'Paid';
                const row = document.createElement('tr');
                const amountDueCleaned = item.totalAmount?.toString().replace(/,/g, '') || '0';
                const amountDueFormatted = parseFloat(amountDueCleaned).toLocaleString();
                row.innerHTML = `
                    <td>${item.dueDate ? new Date(item.dueDate).toLocaleDateString() : ''}</td>
                    <td>₦${amountDueFormatted}</td>
                    <td>${statusText}</td>
                    <td>
                        <input type="radio" name="paymentPlanItem" value="${item.id}"
                                data-amount="${amountDueCleaned}" checked>
                    </td>
                `;
                paymentPlanTableBody.appendChild(row);

                // Pre-select the radio button and set the amount paid input
                selectedPaymentPlanItemIdInput.value = item.id;
                amountPaidInput.value = amountDueCleaned;
            }
        } else {
            paymentPlanTableBody.innerHTML =
                '<tr><td colspan="4" class="text-center">No repayment schedule found for this loan.</td></tr>';
        }

        document.querySelectorAll('input[name="paymentPlanItem"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                amountPaidInput.value = e.target.dataset.amount;
                selectedPaymentPlanItemIdInput.value = e.target.value;
            });
        });
    };

    // ================= LOG PAYMENT =================
    if (paymentForm) {
        paymentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const token = localStorage.getItem('token');
            if (!token) {
                showCustomAlert('Authentication failed. Please log in.', 'error');
                return;
            }

            const paymentPlanItemId = selectedPaymentPlanItemIdInput.value;
            const amountPaid = parseFloat(amountPaidInput.value);

            if (!paymentPlanItemId) {
                showCustomAlert('Please select a payment installment to log.', 'error');
                return;
            }

            if (isNaN(amountPaid) || amountPaid <= 0) {
                showCustomAlert('Please enter a valid amount paid.', 'error');
                return;
            }
            
            // ✅ Send the ID in a collection and use the correct backend property name
            const formData = {
                loanId: loanIdInput.value.trim(),
                installmentIds: [parseInt(paymentPlanItemId, 10)], // Send as an array of integers
                amountPaid: amountPaid,
                modeOfPayment: document.getElementById('modeOfPayment').value,
                paymentDate: document.getElementById('paymentDate').value,
            };

            try {
                const response = await fetch(`${API_BASE_URL}/Payment/initiate`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(formData),
                });

                if (response.ok) {
                    showCustomAlert('Payment logged successfully!', 'success');
                    paymentForm.reset();
                    hideSection(borrowerInfoSection);
                    hideSection(paymentPlanContainer);
                    hideSection(paymentDetailsSection);
                } else {
                    const error = await response.json();
                    throw new Error(error.message || 'Failed to log payment.');
                }
            } catch (error) {
                console.error('Error logging payment:', error);
                showCustomAlert(error.message, 'error');
            }
        });
    }

    // ================= FETCH PAYMENTS FOR CONFIRMATION =================
    const fetchPaymentsForConfirmation = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            showCustomAlert('Authentication failed. Please log in.', 'error');
            return;
        }

        const confirmationEndpoint = `${API_BASE_URL}/Payment/all`;
        try {
            const response = await fetch(confirmationEndpoint, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error(`Error ${response.status}`);
            }

            const payments = await response.json();
            renderConfirmationTable(payments);
        } catch (error) {
            console.error('Failed to fetch payments for confirmation:', error);
            showCustomAlert('Failed to load payments.', 'error');
            confirmationTableBody.innerHTML = '<tr><td colspan="7">Failed to load payments.</td></tr>';
        }
    };

    const renderConfirmationTable = (payments) => {
        const pendingPayments = (Array.isArray(payments) ? payments : payments.data || [])
            .filter(p => typeof p.status === 'string' && p.status.toLowerCase() === 'pending');

        console.log("Filtered Pending Payments:", pendingPayments);

        confirmationTableBody.innerHTML = '';
        if (pendingPayments.length === 0) {
            confirmationTableBody.innerHTML = '<tr><td colspan="9" class="text-center">No pending payments to confirm.</td></tr>';
            return;
        }

        pendingPayments.forEach(payment => {
            console.log("Processing payment:", payment);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${payment.id || ''}</td>
                <td>${payment.loanId || ''}</td>
                <td>${payment.repaymentScheduleId || ''}</td>
                <td>₦${(payment.amount || 0).toLocaleString()}</td>
                <td>${payment.fullName || ''}</td>
                <td>${payment.status || ''}</td>
                <td>N/A</td>
                <td>N/A</td>
                <td>
                    <button class="approve-btn action-button" data-id="${payment.id}">Approve</button>
                    <button class="reject-btn cancel-button" data-id="${payment.id}">Reject</button>
                </td>
            `;
            confirmationTableBody.appendChild(row);
        });

        confirmationTableBody.querySelectorAll('.approve-btn').forEach(button => {
            button.addEventListener('click', () => approveOrRejectPayment(button.dataset.id, 'approve'));
        });

        confirmationTableBody.querySelectorAll('.reject-btn').forEach(button => {
            button.addEventListener('click', () => approveOrRejectPayment(button.dataset.id, 'reject'));
        });
    };

    const approveOrRejectPayment = async (paymentId, action) => {
        const token = localStorage.getItem('token');
        if (!token) {
            showCustomAlert('Authentication failed. Please log in.', 'error');
            return;
        }

        const endpoint = `${API_BASE_URL}/Payment/${action}/${paymentId}`;
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                showCustomAlert(`Payment ${paymentId} ${action}d successfully.`, 'success');
                fetchPaymentsForConfirmation(); // Refresh the table
            } else {
                const error = await response.json();
                throw new Error(error.message || `Failed to ${action} payment.`);
            }
        } catch (error) {
            console.error(`Error ${action}ing payment:`, error);
            showCustomAlert(error.message, 'error');
        }
    };

    // ================= PAYMENT TRACKER LOGIC =================
    trackerFetchBtn.addEventListener('click', async () => {
        const loanId = trackerLoanIdInput.value.trim();
        if (loanId) {
            await fetchRepaymentSchedule(loanId);
        } else {
            showCustomAlert('Please enter a Loan ID to track payments.', 'error');
            paymentTrackerTableBody.innerHTML = '<tr><td colspan="6" class="text-center">Enter a Loan ID to view repayment schedule.</td></tr>';
        }
    });

    const fetchRepaymentSchedule = async (loanId) => {
        const token = localStorage.getItem('token');
        if (!token) {
            showCustomAlert('Authentication failed. Please log in.', 'error');
            return;
        }
        
        const loanDetailsEndpoint = `${API_BASE_URL}/Loan/${loanId}`;

        try {
            const response = await fetch(loanDetailsEndpoint, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const loanData = await response.json();
            renderRepaymentScheduleTable(loanData);

        } catch (error) {
            console.error('Failed to fetch repayment schedule:', error);
            showCustomAlert('Failed to load repayment schedule. Please check the Loan ID.', 'error');
            paymentTrackerTableBody.innerHTML = '<tr><td colspan="6" class="text-center">Failed to load repayment schedule.</td></tr>';
        }
    };

    const renderRepaymentScheduleTable = (loanData) => {
        const installments = loanData.repaymentSchedules || [];
        paymentTrackerTableBody.innerHTML = '';
        if (installments.length === 0) {
            paymentTrackerTableBody.innerHTML = `<tr><td colspan="6" class="text-center">No repayment schedule found for Loan ID ${loanData.id}.</td></tr>`;
            return;
        }

        installments.forEach(installment => {
            const row = document.createElement('tr');
            const statusText = installment.status === 0 ? 'Pending' : 'Paid';
            const amountDueCleaned = installment.totalAmount?.toString().replace(/,/g, '') || '0';
            const amountDueFormatted = parseFloat(amountDueCleaned).toLocaleString();
            const loanAmountFormatted = (loanData.loanAmount || 0).toLocaleString();
            row.innerHTML = `
                <td>${loanData.customerFullName || 'N/A'}</td>
                <td>₦${loanAmountFormatted}</td>
                <td>${installment.id || ''}</td>
                <td>${installment.dueDate ? new Date(installment.dueDate).toLocaleDateString() : 'N/A'}</td>
                <td>₦${amountDueFormatted}</td>
                <td>${statusText}</td>
            `;
            paymentTrackerTableBody.appendChild(row);
        });
    };

    // ================= AUTH CHECK =================
    const token = localStorage.getItem('token');
    if (!token) {
        showCustomAlert('You are not logged in. Redirecting...', 'error');
        setTimeout(() => window.location.href = 'index.html', 2000);
    }
});
