
document.addEventListener("DOMContentLoaded", () => {
    const API_URL = `${API_BASE_URL}/Expense`;
    const token = localStorage.getItem("token");

    // Form elements
    const expenseForm = document.getElementById("expenseForm");
    const expenseIdInput = document.getElementById("expenseId");
    const descriptionInput = document.getElementById("description");
    const categoryInput = document.getElementById("category");
    const amountInput = document.getElementById("amount");
    const expenseDateInput = document.getElementById("expenseDate");
    const paymentMethodInput = document.getElementById("paymentMethod");

    const saveExpenseBtn = document.getElementById("saveExpenseBtn");
    const cancelEditBtn = document.getElementById("cancelEditBtn");

    // Summary elements
    const totalExpensesElement = document.getElementById("totalExpenses");
    const totalExpenseRecordsElement = document.getElementById("totalExpenseRecords");

    // Filter elements
    const filterStartDate = document.getElementById("filterStartDate");
    const filterEndDate = document.getElementById("filterEndDate");
    const filterCategory = document.getElementById("filterCategory");
    const applyExpenseFilter = document.getElementById("applyExpenseFilter");
    const clearExpenseFilter = document.getElementById("clearExpenseFilter");

    // Table and loading elements
    const expenseTableBody = document.getElementById("expenseTableBody");
    const loadingIndicator = document.getElementById("loadingIndicator");

    // Alert elements
    const customAlertContainer = document.getElementById("customAlertContainer");

    // Delete modal elements
    const deleteExpenseModal = document.getElementById("deleteExpenseModal");
    const confirmDeleteExpense = document.getElementById("confirmDeleteExpense");
    const cancelDeleteExpense = document.getElementById("cancelDeleteExpense");

    let expenses = [];
    let selectedExpenseId = null;

    // Check authentication
    if (!token) {
        showAlert("Your session has expired. Please log in again.", "error");

        setTimeout(() => {
            window.location.href = "index.html";
        }, 1500);

        return;
    }

    // Escape user-provided text before displaying it in HTML
    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => {
            const entities = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            };

            return entities[character];
        });
    }

    // Format amount as Nigerian Naira
    function formatCurrency(amount) {
        return new Intl.NumberFormat("en-NG", {
            style: "currency",
            currency: "NGN",
            minimumFractionDigits: 2
        }).format(Number(amount) || 0);
    }

    // Format date without changing the calendar date due to timezone conversion
    function formatDate(dateValue) {
        if (!dateValue) return "-";

        const datePart = String(dateValue).substring(0, 10);
        const parts = datePart.split("-");

        if (parts.length !== 3) return datePart;

        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    // Show custom alert
    function showAlert(message, type = "info") {
        const alert = document.createElement("div");

        alert.className = `custom-alert custom-alert-${type}`;

        alert.innerHTML = `
            <span>${escapeHTML(message)}</span>
            <button type="button" class="close-btn" aria-label="Close">&times;</button>
        `;

        customAlertContainer.appendChild(alert);

        alert.querySelector(".close-btn").addEventListener("click", () => {
            alert.remove();
        });

        setTimeout(() => {
            alert.classList.add("fade-out");

            setTimeout(() => {
                alert.remove();
            }, 300);
        }, 4000);
    }

    // Loading indicator
    function showLoading(show) {
        loadingIndicator.style.display = show ? "block" : "none";
    }

    // API request helper
    async function apiRequest(url, options = {}) {
        const response = await fetch(url, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
                ...options.headers
            }
        });

        if (response.status === 401 || response.status === 403) {
            throw new Error(
                response.status === 401
                    ? "Your session has expired. Please log in again."
                    : "You do not have permission to perform this action."
            );
        }

        if (!response.ok) {
            let errorMessage = "Something went wrong. Please try again.";

            try {
                const errorData = await response.json();
                errorMessage =
                    errorData.message ||
                    errorData.title ||
                    errorData.detail ||
                    errorMessage;
            } catch {
                // Keep the default error message
            }

            throw new Error(errorMessage);
        }

        if (response.status === 204) {
            return null;
        }

        const contentType = response.headers.get("content-type");

        if (contentType && contentType.includes("application/json")) {
            return await response.json();
        }

        return null;
    }

    // Load expenses from the backend
    async function loadExpenses() {
        showLoading(true);

        try {
            const params = new URLSearchParams();

            if (filterStartDate.value) {
                params.append("startDate", filterStartDate.value);
            }

            if (filterEndDate.value) {
                params.append("endDate", filterEndDate.value);
            }

            if (filterCategory.value) {
                params.append("category", filterCategory.value);
            }

            const queryString = params.toString();
            const url = queryString
                ? `${API_URL}?${queryString}`
                : API_URL;

            const data = await apiRequest(url);

            expenses = Array.isArray(data) ? data : [];

            renderExpenses();
            updateSummary();

        } catch (error) {
            showAlert(error.message, "error");

            if (error.message.includes("session has expired")) {
                setTimeout(() => {
                    window.location.href = "index.html";
                }, 1500);
            }
        } finally {
            showLoading(false);
        }
    }

    // Display expenses in the table
    function renderExpenses() {
        if (expenses.length === 0) {
            expenseTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        No expenses found.
                    </td>
                </tr>
            `;
            return;
        }

        expenseTableBody.innerHTML = expenses.map((expense, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${escapeHTML(expense.description)}</td>
                <td>${escapeHTML(expense.category)}</td>
                <td>${formatCurrency(expense.amount)}</td>
                <td>${formatDate(expense.expenseDate)}</td>
                <td>${escapeHTML(expense.paymentMethod)}</td>
                <td class="action-buttons">
                    <button
                        type="button"
                        class="btn-edit"
                        data-action="edit"
                        data-id="${Number(expense.id)}">
                        Edit
                    </button>

                    <button
                        type="button"
                        class="btn-delete"
                        data-action="delete"
                        data-id="${Number(expense.id)}">
                        Delete
                    </button>
                </td>
            </tr>
        `).join("");
    }

    // Update expense summary
    function updateSummary() {
        const total = expenses.reduce((sum, expense) => {
            return sum + (Number(expense.amount) || 0);
        }, 0);

        totalExpensesElement.textContent = formatCurrency(total);
        totalExpenseRecordsElement.textContent = expenses.length;
    }

    // Reset form
    function resetForm() {
        expenseForm.reset();
        expenseIdInput.value = "";

        saveExpenseBtn.textContent = "Save Expense";
        cancelEditBtn.style.display = "none";
    }

    // Save or update expense
    expenseForm.addEventListener("submit", async event => {
        event.preventDefault();

        const expenseId = expenseIdInput.value;

        const expenseData = {
            description: descriptionInput.value.trim(),
            category: categoryInput.value.trim(),
            amount: Number(amountInput.value),
            expenseDate: expenseDateInput.value,
            paymentMethod: paymentMethodInput.value.trim()
        };

        if (
            !expenseData.description ||
            !expenseData.category ||
            !expenseData.expenseDate ||
            !expenseData.paymentMethod ||
            !Number.isFinite(expenseData.amount) ||
            expenseData.amount <= 0
        ) {
            showAlert("Please complete all fields with valid values.", "error");
            return;
        }

        saveExpenseBtn.disabled = true;
        saveExpenseBtn.textContent = expenseId ? "Updating..." : "Saving...";

        try {
            if (expenseId) {
                await apiRequest(`${API_URL}/${expenseId}`, {
                    method: "PUT",
                    body: JSON.stringify(expenseData)
                });

                showAlert("Expense updated successfully.", "success");
            } else {
                await apiRequest(API_URL, {
                    method: "POST",
                    body: JSON.stringify(expenseData)
                });

                showAlert("Expense recorded successfully.", "success");
            }

            resetForm();
            await loadExpenses();

        } catch (error) {
            showAlert(error.message, "error");

            if (error.message.includes("session has expired")) {
                setTimeout(() => {
                    window.location.href = "index.html";
                }, 1500);
            }
        } finally {
            saveExpenseBtn.disabled = false;
            saveExpenseBtn.textContent = expenseIdInput.value
                ? "Update Expense"
                : "Save Expense";
        }
    });

    // Edit or delete buttons
    expenseTableBody.addEventListener("click", event => {
        const button = event.target.closest("button[data-action]");

        if (!button) return;

        const expenseId = Number(button.dataset.id);
        const action = button.dataset.action;

        if (action === "edit") {
            editExpense(expenseId);
        } else if (action === "delete") {
            openDeleteModal(expenseId);
        }
    });

    // Load expense details into the form for editing
    function editExpense(expenseId) {
        const expense = expenses.find(item => item.id === expenseId);

        if (!expense) {
            showAlert("Expense record not found.", "error");
            return;
        }

        expenseIdInput.value = expense.id;
        descriptionInput.value = expense.description || "";
        categoryInput.value = expense.category || "";
        amountInput.value = expense.amount;
        expenseDateInput.value = String(expense.expenseDate).substring(0, 10);
        paymentMethodInput.value = expense.paymentMethod || "";

        saveExpenseBtn.textContent = "Update Expense";
        cancelEditBtn.style.display = "inline-block";

        expenseForm.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    // Cancel editing
    cancelEditBtn.addEventListener("click", resetForm);

    // Open delete confirmation modal
    function openDeleteModal(expenseId) {
        selectedExpenseId = expenseId;
        deleteExpenseModal.style.display = "flex";
    }

    // Close delete modal
    function closeDeleteModal() {
        selectedExpenseId = null;
        deleteExpenseModal.style.display = "none";
    }

    cancelDeleteExpense.addEventListener("click", closeDeleteModal);

    // Confirm and delete expense
    confirmDeleteExpense.addEventListener("click", async () => {
        if (!selectedExpenseId) return;

        confirmDeleteExpense.disabled = true;
        confirmDeleteExpense.textContent = "Deleting...";

        try {
            await apiRequest(`${API_URL}/${selectedExpenseId}`, {
                method: "DELETE"
            });

            showAlert("Expense deleted successfully.", "success");

            closeDeleteModal();
            await loadExpenses();

        } catch (error) {
            showAlert(error.message, "error");

            if (error.message.includes("session has expired")) {
                setTimeout(() => {
                    window.location.href = "index.html";
                }, 1500);
            }
        } finally {
            confirmDeleteExpense.disabled = false;
            confirmDeleteExpense.textContent = "Delete";
        }
    });

    // Apply filters
    applyExpenseFilter.addEventListener("click", () => {
        if (
            filterStartDate.value &&
            filterEndDate.value &&
            filterStartDate.value > filterEndDate.value
        ) {
            showAlert("Start date cannot be later than end date.", "error");
            return;
        }

        loadExpenses();
    });

    // Clear filters
    clearExpenseFilter.addEventListener("click", () => {
        filterStartDate.value = "";
        filterEndDate.value = "";
        filterCategory.value = "";

        loadExpenses();
    });

    // Initial page load
    cancelEditBtn.style.display = "none";
    loadExpenses();
});
