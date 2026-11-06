
document.addEventListener('DOMContentLoaded', () => {

    // DOM Elements
    const openingCapitalForm = document.getElementById('openingCapitalForm');
    const contributionForm = document.getElementById('contributionForm');

    const loadingIndicator = document.getElementById('loadingIndicator');
    const logoutBtn = document.getElementById('logout');

    // Local date helper
    const getToday = () => {
        const today = new Date();

        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
    };

    // Set default dates for capital forms
    const today = getToday();

    document.getElementById('openingEffectiveDate').value = today;
    document.getElementById('contributionDate').value = today;

    // Authentication
    const getToken = () => localStorage.getItem('token');

    const token = getToken();

    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    // Money formatting
    const formatMoney = (value) => {
        return `₦${Number(value || 0).toLocaleString('en-NG', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    };

    // Custom alerts
    const showCustomAlert = (message, type) => {

        const container = document.getElementById('customAlertContainer');

        if (!container) return;

        const alert = document.createElement('div');
        alert.className = `custom-alert custom-alert-${type}`;

        const messageElement = document.createElement('span');
        messageElement.className = 'alert-message';
        messageElement.textContent = message;

        const closeButton = document.createElement('span');
        closeButton.className = 'close-btn';
        closeButton.textContent = '×';

        closeButton.addEventListener('click', () => alert.remove());

        alert.appendChild(messageElement);
        alert.appendChild(closeButton);

        container.appendChild(alert);

        setTimeout(() => alert.classList.add('fade-out'), 4500);
        setTimeout(() => alert.remove(), 5000);
    };

    // API request helper
    const apiRequest = async (url, options = {}) => {

        const currentToken = getToken();

        if (!currentToken) {
            window.location.href = 'index.html';
            throw new Error('Your session has expired. Please log in again.');
        }

        const response = await fetch(url, {
            ...options,
            headers: {
                'Authorization': `Bearer ${currentToken}`,
                'Accept': 'application/json',
                ...(options.body ? { 'Content-Type': 'application/json' } : {}),
                ...options.headers
            }
        });

        if (response.status === 401) {

            localStorage.removeItem('token');
            localStorage.removeItem('user');

            window.location.href = 'index.html';

            throw new Error('Your session has expired. Please log in again.');
        }

        if (!response.ok) {

            const errorText = await response.text();

            let errorMessage = errorText || response.statusText;

            try {

                const errorData = JSON.parse(errorText);

                errorMessage =
                    errorData.message ||
                    errorData.title ||
                    errorData.error ||
                    errorMessage;

            } catch {
                // Keep original response text
            }

            throw new Error(errorMessage);
        }

        if (response.status === 204) {
            return null;
        }

        const responseText = await response.text();

        return responseText ? JSON.parse(responseText) : null;
    };

    // Render capital position
    const renderCapitalPosition = (data) => {

        document.getElementById('outstandingPrincipal').textContent =
            formatMoney(data.outstandingPrincipal);

        document.getElementById('availableCash').textContent =
            formatMoney(data.availableCash);

        document.getElementById('currentCapitalPosition').textContent =
            formatMoney(data.currentCapitalPosition);

        document.getElementById('totalCapitalIntroduced').textContent =
            formatMoney(data.totalCapitalIntroduced);

        document.getElementById('totalDisbursements').textContent =
            formatMoney(data.totalDisbursed);

        document.getElementById('principalRecovered').textContent =
            formatMoney(data.principalRecovered);

        document.getElementById('interestReceived').textContent =
            formatMoney(data.interestReceived);

        document.getElementById('totalExpenses').textContent =
            formatMoney(data.totalExpenses);

        // Expense details
        const expenseContainer =
            document.getElementById('expenseDetails');

        expenseContainer.innerHTML = '';

        if (
            Array.isArray(data.expenseDetails) &&
            data.expenseDetails.length > 0
        ) {

            data.expenseDetails.forEach(expense => {

                const item = document.createElement('div');
                item.className = 'detail-item';

                const date = document.createElement('span');

                date.textContent = expense.expenseDate
                    ? new Date(expense.expenseDate).toLocaleDateString('en-NG')
                    : 'Expense date unavailable';

                const amount = document.createElement('strong');
                amount.textContent = formatMoney(expense.amount);

                item.appendChild(date);
                item.appendChild(amount);

                expenseContainer.appendChild(item);
            });

        } else {

            expenseContainer.textContent = 'No expenses recorded.';
        }
    };

    // Fetch current capital position
    const fetchCapitalPosition = async () => {

        loadingIndicator.style.display = 'block';

        try {

            const endpoint = `${API_BASE_URL}/Loan/capital-position`;

            const data = await apiRequest(endpoint);

            if (!data) {
                throw new Error('No capital position data was returned.');
            }

            renderCapitalPosition(data);

        } catch (error) {

            console.error('Failed to load capital position:', error);

            showCustomAlert(
                error.message || 'Failed to load capital position.',
                'error'
            );

        } finally {

            loadingIndicator.style.display = 'none';
        }
    };

    // Set opening capital
    openingCapitalForm.addEventListener('submit', async (event) => {

        event.preventDefault();

        const amount = Number(
            document.getElementById('openingAmount').value
        );

        const description =
            document.getElementById('openingDescription').value.trim();

        const effectiveDate =
            document.getElementById('openingEffectiveDate').value;

        if (amount <= 0 || !description || !effectiveDate) {

            showCustomAlert(
                'Please provide a valid amount, description and effective date.',
                'error'
            );

            return;
        }

        const submitButton =
            document.getElementById('saveOpeningCapital');

        submitButton.disabled = true;
        submitButton.textContent = 'Saving...';

        try {

            await apiRequest(`${API_BASE_URL}/Loan/opening-capital`, {
                method: 'POST',
                body: JSON.stringify({
                    amount,
                    description,
                    effectiveDate
                })
            });

            showCustomAlert(
                'Opening capital saved successfully.',
                'success'
            );

            openingCapitalForm.reset();

            document.getElementById('openingEffectiveDate').value = getToday();

            await fetchCapitalPosition();

        } catch (error) {

            console.error('Failed to save opening capital:', error);

            showCustomAlert(
                error.message || 'Failed to save opening capital.',
                'error'
            );

        } finally {

            submitButton.disabled = false;
            submitButton.textContent = 'Save Opening Capital';
        }
    });

    // Add fresh capital contribution
    contributionForm.addEventListener('submit', async (event) => {

        event.preventDefault();

        const amount = Number(
            document.getElementById('contributionAmount').value
        );

        const description =
            document.getElementById('contributionDescription').value.trim();

        const contributionDate =
            document.getElementById('contributionDate').value;

        if (amount <= 0 || !description || !contributionDate) {

            showCustomAlert(
                'Please provide a valid amount, description and contribution date.',
                'error'
            );

            return;
        }

        const submitButton =
            document.getElementById('saveContribution');

        submitButton.disabled = true;
        submitButton.textContent = 'Adding...';

        try {

            await apiRequest(`${API_BASE_URL}/Loan/capital-contributions`, {
                method: 'POST',
                body: JSON.stringify({
                    amount,
                    description,
                    contributionDate
                })
            });

            showCustomAlert(
                'Capital contribution added successfully.',
                'success'
            );

            contributionForm.reset();

            document.getElementById('contributionDate').value = getToday();

            await fetchCapitalPosition();

        } catch (error) {

            console.error('Failed to add capital contribution:', error);

            showCustomAlert(
                error.message || 'Failed to add capital contribution.',
                'error'
            );

        } finally {

            submitButton.disabled = false;
            submitButton.textContent = 'Add Capital';
        }
    });

    // Logout
    if (logoutBtn) {

        logoutBtn.addEventListener('click', (event) => {

            event.preventDefault();

            localStorage.removeItem('token');
            localStorage.removeItem('user');

            window.location.href = 'index.html';
        });
    }

    // Initial page load
    fetchCapitalPosition();

});
