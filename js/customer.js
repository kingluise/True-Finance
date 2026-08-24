// customer.js
document.addEventListener("DOMContentLoaded", () => {
    const addCustomerBtn = document.getElementById("addCustomerBtn");
    const customerFormContainer = document.getElementById("customerFormContainer");
    const customerForm = document.getElementById("customerForm");
    const editModal = document.getElementById("editModal");
    const editForm = document.getElementById("editForm");
    const customerListBody = document.getElementById("customer-list-body");
    const cancelButtons = document.querySelectorAll(".cancel-form, .cancel-button, #cancelEditBtn");
    const searchBar = document.getElementById("searchBar");
    const viewCustomerModal = document.getElementById("viewCustomerModal");
    const closeViewCustomerModalBtn = document.getElementById("closeViewCustomerModalBtn");
    const exportPdfBtn = document.getElementById("exportPdfBtn");

    let currentEditId = null;
    let customersCache = [];

    // Show Add Customer Modal
    addCustomerBtn?.addEventListener("click", () => {
        customerFormContainer.classList.remove("hidden");
        customerFormContainer.classList.add("visible");
    });

    // Close modals
    cancelButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            customerFormContainer.classList.remove("visible");
            customerFormContainer.classList.add("hidden");
            editModal.classList.remove("visible");
            editModal.classList.add("hidden");
        });
    });

    // Close View Customer Modal
    closeViewCustomerModalBtn?.addEventListener("click", () => {
        viewCustomerModal.classList.remove("visible");
        viewCustomerModal.classList.add("hidden");
    });

    // ---
    // FETCH CUSTOMERS
    // ---
    async function fetchCustomers() {
        const token = localStorage.getItem("token");
        if (!token) {
            customerListBody.innerHTML = `<tr><td colspan="4">Please log in to view customers.</td></tr>`;
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/Customer/list`, {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            });
            if (!response.ok) throw new Error("Failed to fetch customers");

            const data = await response.json();
            customersCache = data.customers || [];
            populateCustomerTable(customersCache);
        } catch (err) {
            console.error("Error fetching customers:", err);
            customerListBody.innerHTML = `<tr><td colspan="4">Error loading customers</td></tr>`;
        }
    }

    function populateCustomerTable(customers) {
        if (!customers.length) {
            customerListBody.innerHTML = `<tr><td colspan="4" class="text-center">No customers found</td></tr>`;
            return;
        }

        customerListBody.innerHTML = "";
        customers.forEach((c, idx) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${idx + 1}</td>
                <td>${c.fullName}</td>
                <td>${c.phoneNumber}</td>
                <td>
                    <button class="view-btn" data-id="${c.id}">View</button>
                    <button class="edit-btn" data-id="${c.id}">Edit</button>
                    <button class="delete-btn" data-id="${c.id}">Delete</button>
                </td>
            `;
            customerListBody.appendChild(tr);
        });

        document.querySelectorAll(".view-btn").forEach(btn => btn.addEventListener("click", e => viewCustomer(e.target.dataset.id)));
        document.querySelectorAll(".edit-btn").forEach(btn => btn.addEventListener("click", e => editCustomer(e.target.dataset.id)));
        document.querySelectorAll(".delete-btn").forEach(btn => btn.addEventListener("click", e => deleteCustomer(e.target.dataset.id)));
    }

    // ---
    // SEARCH
    // ---
    searchBar?.addEventListener("input", () => {
        const query = searchBar.value.toLowerCase();
        const filtered = customersCache.filter(c =>
            c.fullName.toLowerCase().includes(query) ||
            c.phoneNumber.toLowerCase().includes(query) ||
            c.email.toLowerCase().includes(query)
        );
        populateCustomerTable(filtered);
    });

    // ---
    // ADD CUSTOMER
    // ---
    customerForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const token = localStorage.getItem("token");
        if (!token) return alert("Please log in.");

        const formData = new FormData(customerForm);

        const idPhotoInput = document.getElementById('idPhoto');
        if (idPhotoInput.files.length > 0) {
            formData.append("identificationDocument", idPhotoInput.files[0]);
        }
        formData.delete("idPhoto");

        try {
            const response = await fetch(`${API_BASE_URL}/Customer/create`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`
                },
                body: formData
            });
            if (!response.ok) throw new Error("Failed to add customer");

            alert("Customer added successfully");
            customerForm.reset();
            customerFormContainer.classList.remove("visible");
            customerFormContainer.classList.add("hidden");
            fetchCustomers();
        } catch (err) {
            console.error(err);
            alert("Error adding customer");
        }
    });

    // ---
    // VIEW CUSTOMER
    // ---
    async function viewCustomer(id) {
        const token = localStorage.getItem("token");
        if (!token) return alert("Please log in.");

        try {
            const response = await fetch(`${API_BASE_URL}/Customer/${id}`, {
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
            });
            if (!response.ok) throw new Error("Failed to fetch customer");

            const customer = await response.json();
            
            // Populate the modal with the fresh data
            document.getElementById("viewCustomerId").textContent = customer.id;
            document.getElementById("viewFullName").textContent = customer.fullName;
            document.getElementById("viewDob").textContent = new Date(customer.dateOfBirth).toLocaleDateString();
            document.getElementById("viewGender").textContent = customer.gender;
            document.getElementById("viewMaritalStatus").textContent = customer.maritalStatus;
            document.getElementById("viewResidentialAddress").textContent = customer.residentialAddress;
            document.getElementById("viewEmail").textContent = customer.email;
            document.getElementById("viewPhone").textContent = customer.phoneNumber;
            document.getElementById("viewEmploymentStatus").textContent = customer.employmentStatus;
            document.getElementById("viewIncome").textContent = customer.monthlyIncome;
            document.getElementById("viewIdType").textContent = customer.idType;
            document.getElementById("viewIdNumber").textContent = customer.idNumber;
            document.getElementById("viewNin").textContent = customer.nin;
            document.getElementById("viewBvn").textContent = customer.bvn;
            document.getElementById("viewGuarantorFullName").textContent = customer.guarantorFullName;
            document.getElementById("viewRelationshipToBorrower").textContent = customer.guarantorRelationship;
            document.getElementById("viewGuarantorResidentialAddress").textContent = customer.guarantorAddress;
            document.getElementById("viewGuarantorPhone").textContent = customer.guarantorPhone;
            document.getElementById("viewGuarantorEmail").textContent = customer.guarantorEmail;
            document.getElementById("viewGuarantorIdType").textContent = customer.guarantorIdType;
            document.getElementById("viewGuarantorIdNumber").textContent = customer.guarantorIdNumber;
            
            document.getElementById("viewIdPhoto").src = customer.idPhotoUrl || 'https://placehold.co/400x300/e0e0e0/555?text=ID+Photo+Not+Found';
            document.getElementById("viewPassportPhoto").src = customer.passportPhotoUrl || 'https://placehold.co/400x300/e0e0e0/555?text=Passport+Photo+Not+Found';

            // Store the full customer object directly on the button for later use
            if (exportPdfBtn) exportPdfBtn.customerData = customer;

            viewCustomerModal.classList.remove("hidden");
            viewCustomerModal.classList.add("visible");
        } catch (err) {
            console.error(err);
            alert("Error fetching customer");
        }
    }

    // ---
    // EXPORT PDF
    // ---
    async function exportToPdf() {
        const customer = exportPdfBtn.customerData; 

        if (!customer) {
            return console.error('Customer data not found for PDF export.');
        }

        // The modal must be visible for html2canvas to capture it
        viewCustomerModal.classList.remove('hidden');
        viewCustomerModal.classList.add('visible');

        // Wait a short duration to ensure the modal content is fully rendered
        await new Promise(resolve => setTimeout(resolve, 500));

        const content = document.getElementById('customerDetailsContent');
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');

        await html2canvas(content, { scale: 2 }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const imgWidth = 210;
            const imgHeight = canvas.height * imgWidth / canvas.width;
            let heightLeft = imgHeight;
            let position = 0;
            doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= 297;
            while (heightLeft > 0) {
                position = heightLeft - imgHeight;
                doc.addPage();
                doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= 297;
            }
            doc.save(`${customer.fullName}_details.pdf`);
        });

        // Hide the modal again after export is complete
        viewCustomerModal.classList.add("hidden");
        viewCustomerModal.classList.remove("visible");
    }

    // ---
    // EDIT CUSTOMER
    // ---
    async function editCustomer(id) {
        currentEditId = id;
        const token = localStorage.getItem("token");
        if (!token) return alert("Please log in.");

        try {
            const response = await fetch(`${API_BASE_URL}/Customer/${id}`, {
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
            });
            if (!response.ok) throw new Error("Failed to fetch customer");

            const c = await response.json();

            // Populate form
            editForm.editFullName.value = c.fullName;
            editForm.editDateOfBirth.value = c.dateOfBirth.split("T")[0];
            editForm.editGender.value = c.gender;
            editForm.editMaritalStatus.value = c.maritalStatus;
            editForm.editResidentialAddress.value = c.residentialAddress;
            editForm.editEmail.value = c.email;
            editForm.editPhoneNumber.value = c.phoneNumber;
            editForm.editEmploymentStatus.value = c.employmentStatus;
            editForm.editMonthlyIncome.value = c.monthlyIncome;
            editForm.editIdType.value = c.idType;
            editForm.editIdNumber.value = c.idNumber;
            editForm.editNin.value = c.nin;
            editForm.editBvn.value = c.bvn;
            editForm.editGuarantorFullName.value = c.guarantorFullName;
            editForm.editGuarantorRelationship.value = c.guarantorRelationship;
            editForm.editGuarantorAddress.value = c.guarantorAddress;
            editForm.editGuarantorPhone.value = c.guarantorPhone;
            editForm.editGuarantorEmail.value = c.guarantorEmail;
            editForm.editGuarantorIdType.value = c.guarantorIdType;
            editForm.editGuarantorIdNumber.value = c.guarantorIdNumber;


            editModal.classList.remove("hidden");
            editModal.classList.add("visible");
        } catch (err) {
            console.error(err);
            alert("Error loading customer data");
        }
    }

    editForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!currentEditId) return;

        const token = localStorage.getItem("token");
        if (!token) return alert("Please log in.");

        const jsonData = {
            id: currentEditId,
            fullName: editForm.editFullName.value,
            dateOfBirth: editForm.editDateOfBirth.value,
            gender: editForm.editGender.value,
            maritalStatus: editForm.editMaritalStatus.value,
            residentialAddress: editForm.editResidentialAddress.value,
            email: editForm.editEmail.value,
            phoneNumber: editForm.editPhoneNumber.value,
            employmentStatus: editForm.editEmploymentStatus.value,
            monthlyIncome: parseFloat(editForm.editMonthlyIncome.value) || null,
            idType: editForm.editIdType.value,
            idNumber: editForm.editIdNumber.value,
            nin: editForm.editNin.value,
            bvn: editForm.editBvn.value,
            guarantor: {
                fullName: editForm.editGuarantorFullName.value,
                relationshipToBorrower: editForm.editGuarantorRelationship.value,
                residentialAddress: editForm.editGuarantorAddress.value,
                phoneNumber: editForm.editGuarantorPhone.value,
                email: editForm.editGuarantorEmail.value,
                idType: editForm.editGuarantorIdType.value,
                idNumber: editForm.editGuarantorIdNumber.value
            }
        };

        try {
            const response = await fetch(`${API_BASE_URL}/Customer/update/${currentEditId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(jsonData)
            });

            if (!response.ok) throw new Error("Failed to update customer");

            alert("Customer updated successfully");
            editModal.classList.remove("visible");
            editModal.classList.add("hidden");
            fetchCustomers();
        } catch (err) {
            console.error(err);
            alert("Error updating customer");
        }
    });

    // ---
    // DELETE CUSTOMER
    // ---
    async function deleteCustomer(id) {
        if (!confirm("Are you sure you want to delete this customer?")) return;

        const token = localStorage.getItem("token");
        if (!token) return alert("Please log in.");

        try {
            const response = await fetch(`${API_BASE_URL}/Customer/delete/${id}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            });
            if (!response.ok) throw new Error("Failed to delete customer");

            alert("Customer deleted successfully");
            fetchCustomers();
        } catch (err) {
            console.error(err);
            alert("Error deleting customer");
        }
    }

    // Export PDF button
    exportPdfBtn?.addEventListener("click", () => {
        exportToPdf();
    });

    // Initial load
    fetchCustomers();
});