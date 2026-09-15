document.addEventListener('DOMContentLoaded', () => {
    const loanManagementSection = document.getElementById('loanManagement');
    const addLoanBtn = document.getElementById('addLoanBtn');
    const manageLoansBtn = document.getElementById('manageLoansBtn');
    const approveLoansBtn = document.getElementById('approveLoansBtn');
    const addLoanFormSection = document.getElementById('addLoanForm');
    const manageLoansTableContainer = document.getElementById('manageLoansTableContainer');
    const approveLoansTableContainer = document.getElementById('approveLoansTableContainer');
    const loanApplicationForm = document.getElementById('loanApplicationForm');
    const manageLoansTableBody = document.getElementById('manageLoansTableBody');
    const approveLoansTableBody = document.getElementById('approveLoansTableBody');
    const manageLoanFilter = document.getElementById('manageLoanFilter');
    const manageLoansGoBackBtn = document.getElementById('manageLoansGoBackBtn');
    const approveLoansGoBackBtn = document.getElementById('approveLoansGoBackBtn');
    const loanDetailsModal = document.getElementById('loanDetailsModal');
    const modalCloseBtn = document.querySelector('.close-button');
    const successMessageModal = document.getElementById('successMessageModal');
    const successCloseBtn = document.querySelector('#successMessageModal .close-button');

    // Approve Loan modal elements
    const approveLoanModal = document.getElementById('approveLoanModal');
    const approveModalCloseBtn = document.getElementById('approveModalCloseBtn');
    const approveCancelBtn = document.getElementById('approveCancelBtn');
    const approveConfirmBtn = document.getElementById('approveConfirmBtn');
    const approveAmountInput = document.getElementById('approveAmountInput');
    const approveInterestRateInput = document.getElementById('approveInterestRateInput');
    const approveDurationInput = document.getElementById('approveDurationInput');
    const approveDurationHint = document.getElementById('approveDurationHint');
    const approveNote = document.getElementById('approveNote');
    let currentApproveLoanId = null;

    // Same duration limits used on the Add Loan form, applied per the loan's own term type
    const getDurationLimits = (termType) => {
        const type = (termType || '').toLowerCase();
        if (type === 'weekly') return { min: 1, max: 23, label: 'weeks' };
        if (type === 'monthly') return { min: 1, max: 6, label: 'months' };
        return { min: 1, max: 60, label: 'installments' };
    };

    const customerIdInput = document.getElementById('customerId');
    const fullNameInput = document.getElementById('fullName');
    const loanTermSelect = document.getElementById('loanTerm');
    const durationInput = document.getElementById('duration');

    const getAuthToken = () => {
        return localStorage.getItem('token'); 
    };

    const sections = [addLoanFormSection, manageLoansTableContainer, approveLoansTableContainer];

    const showSection = (sectionToShow) => {
        sections.forEach(section => {
            section.classList.add('hidden');
        });
        if (sectionToShow) {
            sectionToShow.classList.remove('hidden');
        }
    };

    const showModal = (modal) => modal.classList.remove('hidden');
    const hideModal = (modal) => modal.classList.add('hidden');

    const formatCurrency = (amount, currencyCode) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: currencyCode,
        }).format(amount);
    };

    addLoanBtn.addEventListener('click', () => showSection(addLoanFormSection));
    manageLoansBtn.addEventListener('click', () => {
        showSection(manageLoansTableContainer);
        fetchLoans('all', manageLoansTableBody, 'manage');
    });
    approveLoansBtn.addEventListener('click', () => {
        showSection(approveLoansTableContainer);
        fetchLoans('pending', approveLoansTableBody, 'approve');
    });

    manageLoansGoBackBtn.addEventListener('click', () => showSection(null));
    approveLoansGoBackBtn.addEventListener('click', () => showSection(null));

    loanApplicationForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const token = getAuthToken();
        if (!token) {
            alert('Authentication token is missing. Please log in again.');
            return;
        }

        // Manually create the data object and convert numeric fields to numbers
        const data = {
            customerId: formData.get("customerId"),
            fullName: formData.get("fullName"),
            // Convert loanAmount string to a number and use the 'principal' key
            principal: parseFloat(formData.get("loanAmount")),
            // Convert interestRate string to a number
            interestRate: parseFloat(formData.get("interestRate")),
            loanPurpose: formData.get("loanPurpose"),
            // Change the key to match the backend's TermType and ensure correct capitalization
            TermType: loanTermSelect.value.charAt(0).toUpperCase() + loanTermSelect.value.slice(1),
            // Convert duration string to an integer
            durationValue: parseInt(formData.get("duration")),
        };
        
        console.log("Submitting with data:", data); // Log the data being sent
        
        // --- ADDED VALIDATION LOGIC ---
        // Check for non-numeric values
        if (isNaN(data.principal) || isNaN(data.durationValue)) {
            alert("Please ensure Loan Amount and Duration are valid numbers.");
            return;
        }

        // Check for specific term-based duration limits
        if (data.TermType === 'Weekly' && (data.durationValue < 1 || data.durationValue > 23)) {
            alert("Weekly loans must have a duration between 1 and 23 weeks.");
            return;
        } else if (data.TermType === 'Monthly' && (data.durationValue < 1 || data.durationValue > 6)) {
            alert("Monthly loans must have a duration between 1 and 6 months.");
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/Loan/apply`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data),
            });
            
            const result = await response.json();
            if (response.ok) {
                // Populate the modal with a success message before showing it
                const modalContent = successMessageModal.querySelector('.modal-content');
                modalContent.innerHTML = `
                    <span class="close-button" id="successCloseBtn">&times;</span>
                    <h3>Loan Application Successful!</h3>
                    <p>Your loan has been successfully submitted for review.</p>
                    <button id="successOkBtn">OK</button>
                `;
                
                // Add event listeners to the new buttons
                document.getElementById('successCloseBtn').addEventListener('click', () => hideModal(successMessageModal));
                document.getElementById('successOkBtn').addEventListener('click', () => hideModal(successMessageModal));

                // Add styling to make the modal look better
                modalContent.style.maxWidth = '400px';
                modalContent.style.margin = '20% auto';
                modalContent.style.padding = '20px';
                modalContent.style.backgroundColor = '#fff';
                modalContent.style.borderRadius = '8px';
                modalContent.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';

                showModal(successMessageModal);
                loanApplicationForm.reset();
            } else {
                // Check for specific validation errors from the backend
                if (response.status === 400 && result.errors) {
                    const errorMessages = Object.values(result.errors).flat().join('\n');
                    alert(`Validation Errors:\n${errorMessages}`);
                } else {
                    alert(`Error: ${result.message || 'Could not apply for loan.'}`);
                }
            }
        } catch (error) {
            console.error('Error applying for loan:', error);
            alert('An error occurred. Please try again.');
        }
    });

    customerIdInput.addEventListener('input', async () => {
        const customerId = customerIdInput.value;
        const token = getAuthToken();

        if (customerId.length > 0 && token) {
            try {
                const response = await fetch(`${API_BASE_URL}/Customer/${customerId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (response.ok) {
                    const customer = await response.json();
                    fullNameInput.value = customer.fullName || '';
                } else {
                    fullNameInput.value = 'Customer not found';
                }
            } catch (error) {
                console.error('Error fetching customer details:', error);
                fullNameInput.value = 'Error fetching name';
            }
        } else {
            fullNameInput.value = '';
        }
    });

    loanTermSelect.addEventListener('change', () => {
        const term = loanTermSelect.value;
        durationInput.value = '';
        if (term === 'weekly') {
            durationInput.placeholder = '1-23 weeks';
            durationInput.min = 1;
            durationInput.max = 23;
        } else if (term === 'monthly') {
            durationInput.placeholder = '1-6 months';
            durationInput.min = 1;
            durationInput.max = 6;
        } else {
            durationInput.placeholder = '';
            durationInput.min = '';
            durationInput.max = '';
        }
    });

    const fetchLoans = async (status, tableBody, tableType) => {
        tableBody.innerHTML = '<tr><td colspan="6">Loading...</td></tr>';
        const token = getAuthToken();

        if (!token) {
            tableBody.innerHTML = '<tr><td colspan="6">Authentication failed. Please log in again.</td></tr>';
            return;
        }

        // Backend's LoanStatus enum names (must match exactly - the API parses this case-sensitively)
        const statusMap = {
            pending: 'Pending',
            approved: 'Approved',
            rejected: 'Rejected',
            declined: 'Rejected', // the filter dropdown option is labelled "Declined" but the real status is "Rejected"
            completed: 'Completed',
            defaulted: 'Defaulted'
        };

        const params = new URLSearchParams();
        // Fetch effectively "all" loans in one page rather than the default 10, so pending/approved/etc.
        // loans that aren't in the first 10 by ID still show up.
        params.set('pageSize', '1000');
        params.set('pageNumber', '1');
        if (status && status !== 'all') {
            params.set('status', statusMap[status.toLowerCase()] || status);
        }

        try {
            const response = await fetch(`${API_BASE_URL}/Loan/list?${params.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const result = await response.json();
            
            if (response.ok) {
                const loans = result.loans || [];
                renderTable(loans, tableBody, tableType);
            } else {
                tableBody.innerHTML = `<tr><td colspan="6">Error fetching loans: ${result.message || response.statusText}</td></tr>`;
            }
        } catch (error) {
            console.error('Error fetching loans:', error);
            tableBody.innerHTML = '<tr><td colspan="6">Error loading loans.</td></tr>';
        }
    };

    const renderTable = (loans, tableBody, tableType) => {
        tableBody.innerHTML = '';
        if (loans.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6">No loans found.</td></tr>';
            return;
        }

        loans.forEach(loan => {
            const loanId = loan.id || 'N/A';
            const principal = loan.principal || 0;
            const type = loan.type || 'N/A';
            const status = loan.status || 'N/A';
            const customerName = loan.customerName || 'N/A';
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${loanId}</td>
                <td>${customerName}</td>
                <td>${formatCurrency(principal, 'NGN')}</td>
                <td>${type}</td>
                <td><span class="status status-${status.toLowerCase()}">${status}</span></td>
                <td>
                    <button class="action-button view-details-btn" data-loan-id="${loanId}">View</button>
                    ${tableType === 'approve' ? `
                        <button class="action-button approve-btn" data-loan-id="${loanId}">Approve</button>
                        <button class="action-button decline-btn" data-loan-id="${loanId}">Decline</button>
                    ` : ''}
                    ${tableType === 'manage' && (status.toLowerCase() === 'approved' || status.toLowerCase() === 'defaulted') ? `
                        <button class="action-button complete-btn" data-loan-id="${loanId}">Complete</button>
                    ` : ''}
                    ${tableType === 'manage' && (status.toLowerCase() === 'approved') ? `
                        <button class="action-button default-btn" data-loan-id="${loanId}">Default</button>
                    ` : ''}
                </td>
            `;
            tableBody.appendChild(row);
        });

        tableBody.querySelectorAll('.view-details-btn').forEach(btn => btn.addEventListener('click', (e) => showLoanDetails(e.target.dataset.loanId)));
        tableBody.querySelectorAll('.approve-btn').forEach(btn => btn.addEventListener('click', (e) => openApproveModal(e.target.dataset.loanId)));
        tableBody.querySelectorAll('.decline-btn').forEach(btn => btn.addEventListener('click', (e) => updateLoanStatus(e.target.dataset.loanId, 'reject')));
        tableBody.querySelectorAll('.complete-btn').forEach(btn => btn.addEventListener('click', (e) => updateLoanStatus(e.target.dataset.loanId, 'complete')));
        tableBody.querySelectorAll('.default-btn').forEach(btn => btn.addEventListener('click', (e) => updateLoanStatus(e.target.dataset.loanId, 'default')));
    };

    const updateLoanStatus = async (loanId, action) => {
        if (!confirm(`Are you sure you want to ${action} this loan?`)) {
            return;
        }
        const token = getAuthToken();
        if (!token) {
            alert('Authentication token is missing. Please log in again.');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/Loan/${action}/${loanId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                alert(`Loan ${loanId} has been ${action}d.`);
                if (action === 'approve' || action === 'reject') {
                    fetchLoans('pending', approveLoansTableBody, 'approve');
                } else {
                    fetchLoans(manageLoanFilter.value, manageLoansTableBody, 'manage');
                }
            } else {
                const error = await response.json();
                alert(`Error: ${error.message || `Could not ${action} loan.`}`);
            }
        } catch (error) {
            console.error(`Error ${action}ing loan:`, error);
            alert('An error occurred. Please try again.');
        }
    };

    // ---
    // APPROVE LOAN (with editable amount, interest rate, and duration)
    // ---
    const openApproveModal = async (loanId) => {
        currentApproveLoanId = loanId;

        // Reset to a loading state while we fetch the real current values
        approveNote.textContent = 'Loading current loan details…';
        approveAmountInput.value = '';
        approveInterestRateInput.value = '';
        approveDurationInput.value = '';
        approveConfirmBtn.disabled = true;

        showModal(approveLoanModal);

        const token = getAuthToken();
        if (!token) {
            alert('Authentication token is missing. Please log in again.');
            hideModal(approveLoanModal);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/Loan/details/${loanId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const loan = await response.json();

            if (!response.ok) {
                throw new Error(loan.message || 'Could not load loan details.');
            }

            const termType = loan.termType || loan.TermType || '';
            const limits = getDurationLimits(termType);

            approveNote.innerHTML = `Applied for <strong>${formatCurrency(loan.principal, 'NGN')}</strong> at <strong>${loan.interestRate}%</strong> over <strong>${loan.durationValue} ${limits.label}</strong> (${termType}). Adjust any field below if needed.`;

            approveAmountInput.value = loan.principal;
            approveInterestRateInput.value = loan.interestRate;

            approveDurationInput.value = loan.durationValue;
            approveDurationInput.min = limits.min;
            approveDurationInput.max = limits.max;
            approveDurationHint.textContent = `Number of ${limits.label} (${limits.min}\u2013${limits.max}). Term type (${termType}) stays fixed.`;

            approveConfirmBtn.disabled = false;
            approveAmountInput.focus();
        } catch (error) {
            console.error('Error loading loan details for approval:', error);
            approveNote.textContent = 'Could not load this loan\'s current details. Please close and try again.';
        }
    };

    const confirmApproveLoan = async () => {
        if (!currentApproveLoanId) return;

        const amount = parseFloat(approveAmountInput.value);
        const rate = parseFloat(approveInterestRateInput.value);
        const duration = parseInt(approveDurationInput.value, 10);

        if (isNaN(amount) || amount <= 0) {
            alert('Please enter a valid approved amount greater than zero.');
            return;
        }
        if (isNaN(rate) || rate < 0) {
            alert('Please enter a valid interest rate.');
            return;
        }
        if (isNaN(duration) || duration <= 0) {
            alert('Please enter a valid duration.');
            return;
        }

        const token = getAuthToken();
        if (!token) {
            alert('Authentication token is missing. Please log in again.');
            return;
        }

        approveConfirmBtn.disabled = true;
        approveConfirmBtn.textContent = 'Approving...';

        try {
            const response = await fetch(`${API_BASE_URL}/Loan/approve/${currentApproveLoanId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    newPrincipal: amount,
                    newInterestRate: rate,
                    newDurationValue: duration
                })
            });

            const result = await response.json();

            if (response.ok) {
                hideModal(approveLoanModal);
                alert(`Loan ${currentApproveLoanId} has been approved.`);
                fetchLoans('pending', approveLoansTableBody, 'approve');
            } else {
                alert(`Error: ${result.message || 'Could not approve loan.'}`);
            }
        } catch (error) {
            console.error('Error approving loan:', error);
            alert('An error occurred. Please try again.');
        } finally {
            approveConfirmBtn.disabled = false;
            approveConfirmBtn.textContent = 'Confirm Approval';
        }
    };

    approveConfirmBtn?.addEventListener('click', confirmApproveLoan);
    approveCancelBtn?.addEventListener('click', () => hideModal(approveLoanModal));
    approveModalCloseBtn?.addEventListener('click', () => hideModal(approveLoanModal));

    const showLoanDetails = async (loanId) => {
        const token = getAuthToken();
        if (!token) {
            alert('Authentication token is missing. Please log in again.');
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/Loan/details/${loanId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const loan = await response.json();
            if (response.ok) {
                const modalContent = loanDetailsModal.querySelector('.modal-content');
                
                modalContent.innerHTML = `
                    <span class="close-button" onclick="hideModal(document.getElementById('loanDetailsModal'))">&times;</span>
                    <h3>Loan Details</h3>
                    <p><strong>Customer ID:</strong> ${loan.customerId || 'N/A'}</p>
                    <p><strong>Principal:</strong> ${formatCurrency(loan.principal, 'NGN')}</p>
                    <p><strong>Interest Rate:</strong> ${loan.interestRate || 'N/A'}%</p>
                    <p><strong>Term Type:</strong> ${loan.TermType || 'N/A'}</p>
                    <p><strong>Duration:</strong> ${loan.durationValue || 'N/A'}</p>
                    <p><strong>Start Date:</strong> ${loan.startDate ? new Date(loan.startDate).toLocaleDateString() : 'N/A'}</p>
                    <p><strong>End Date:</strong> ${loan.endDate ? new Date(loan.endDate).toLocaleDateString() : 'N/A'}</p>
                    <p><strong>First Installment Date:</strong> ${loan.firstInstallmentDate ? new Date(loan.firstInstallmentDate).toLocaleDateString() : 'N/A'}</p>
                    <p><strong>Created At:</strong> ${loan.createdAt ? new Date(loan.createdAt).toLocaleString() : 'N/A'}</p>
                    <p><strong>Reviewed At:</strong> ${loan.reviewedAt ? new Date(loan.reviewedAt).toLocaleString() : 'N/A'}</p>
                    <p><strong>Total Interest:</strong> ${formatCurrency(loan.totalInterest, 'NGN') || 'N/A'}</p>
                    <p><strong>Total Repayment:</strong> ${formatCurrency(loan.totalRepayment, 'NGN') || 'N/A'}</p>
                    <p><strong>Installment Amount:</strong> ${formatCurrency(loan.installmentAmount, 'NGN') || 'N/A'}</p>
                `;
                showModal(loanDetailsModal);
            } else {
                alert('Loan not found.');
            }
        } catch (error) {
            console.error('Error fetching loan details:', error);
            alert('An error occurred. Please try again.');
        }
    };

    if (modalCloseBtn) modalCloseBtn.addEventListener('click', () => hideModal(loanDetailsModal));
    if (successCloseBtn) successCloseBtn.addEventListener('click', () => hideModal(successMessageModal));
    window.addEventListener('click', (e) => {
        if (e.target === loanDetailsModal) hideModal(loanDetailsModal);
        if (e.target === successMessageModal) hideModal(successMessageModal);
        if (e.target === approveLoanModal) hideModal(approveLoanModal);
    });

    showSection(null);
});