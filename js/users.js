// js/admin_users.js

document.addEventListener("DOMContentLoaded", () => {
    const API_BASE = API_BASE_URL + "/auth"; // comes from config.js
    const token = localStorage.getItem("token");

    if (!token) {
        window.location.href = "/index.html"; // redirect if not logged in
        return;
    }

    const userTableBody = document.getElementById("userTableBody");
    const loadingIndicator = document.getElementById("loadingIndicator");

    // Modal elements
    const userModal = document.getElementById("userModal");
    const modalTitle = document.getElementById("modalTitle");
    const closeButton = document.querySelector(".close-button");
    const userForm = document.getElementById("userForm");
    const addUserBtn = document.getElementById("addUserBtn");

    let editingUserId = null;

    // ================== LOAD USERS ==================
    async function loadUsers() {
        showLoading();
        try {
            const res = await fetch(`${API_BASE}/all-users`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.status === 401) {
                localStorage.removeItem("token");
                return (window.location.href = "/index.html");
            }

            if (!res.ok) throw new Error("Failed to fetch users");

            const users = await res.json();
            renderUsers(users);
        } catch (err) {
            alert("Error loading users: " + err.message);
        } finally {
            hideLoading();
        }
    }

    function renderUsers(users) {
        userTableBody.innerHTML = "";
        users.forEach(user => {
            const row = document.createElement("tr");

            // Always show Edit, Reset, Delete (since only Admins can reach this page)
            let actions = `
                <button onclick="editUser(${user.id}, '${user.email}', '${user.role}', '${user.fullName || ""}')">✏️ Edit</button>
                <button onclick="resetPassword(${user.id})">🔑 Reset</button>
                <button onclick="deleteUser(${user.id})">🗑️ Delete</button>
            `;

            row.innerHTML = `
                <td>${user.fullName || "-"}</td>
                <td>${user.email}</td>
                <td>********</td>
                <td>${user.role}</td>
                <td>${actions}</td>
            `;

            userTableBody.appendChild(row);
        });
    }

    // ================== ADD USER ==================
    if (addUserBtn) {
        addUserBtn.addEventListener("click", () => {
            editingUserId = null;
            modalTitle.textContent = "Add User";
            userForm.reset();
            userModal.style.display = "flex";
        });
    }

    // ================== EDIT USER ==================
    window.editUser = (id, email, role, fullName) => {
        editingUserId = id;
        modalTitle.textContent = "Edit User";
        document.getElementById("email").value = email;
        document.getElementById("role").value = role.toLowerCase();
        document.getElementById("fullName").value = fullName;
        document.getElementById("password").value = "";
        userModal.style.display = "flex";
    };

    // ================== DELETE USER ==================
    window.deleteUser = async (id) => {
        if (!confirm("Are you sure you want to delete this user?")) return;

        try {
            const res = await fetch(`${API_BASE}/delete-user/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!res.ok) throw new Error("Delete failed");
            alert("User deleted successfully");
            loadUsers();
        } catch (err) {
            alert("Error: " + err.message);
        }
    };

    // ================== RESET PASSWORD ==================
    window.resetPassword = async (id) => {
        const newPass = prompt("Enter new password:");
        if (!newPass) return;

        try {
            const res = await fetch(`${API_BASE}/reset-password/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(newPass)
            });

            if (!res.ok) throw new Error("Reset failed");
            alert("Password reset successfully");
        } catch (err) {
            alert("Error: " + err.message);
        }
    };

    // ================== SUBMIT FORM ==================
    userForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const data = {
            fullName: document.getElementById("fullName").value,
            email: document.getElementById("email").value,
            password: document.getElementById("password").value,
            role: document.getElementById("role").value
        };

        try {
            let res;
            if (editingUserId) {
                res = await fetch(`${API_BASE}/update-user/${editingUserId}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify(data)
                });
            } else {
                res = await fetch(`${API_BASE}/create-user`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify(data)
                });
            }

            if (!res.ok) throw new Error("Save failed");
            alert("User saved successfully");
            userModal.style.display = "none";
            loadUsers();
        } catch (err) {
            alert("Error: " + err.message);
        }
    });

    // ================== MODAL CLOSE ==================
    closeButton.addEventListener("click", () => userModal.style.display = "none");
    window.onclick = (event) => {
        if (event.target === userModal) userModal.style.display = "none";
    };

    // ================== HELPERS ==================
    function showLoading() { loadingIndicator.style.display = "block"; }
    function hideLoading() { loadingIndicator.style.display = "none"; }

    // Init
    loadUsers();
});
