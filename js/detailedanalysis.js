// This script contains the logic for the Profit Analytics dashboard.
// It handles user interactions, fetches data from the API, and populates the tables.

document.addEventListener('DOMContentLoaded', function() {

    // --- DOM Elements ---
    const filterPeriodSelect = document.getElementById('filterPeriod');
    const monthYearSelector = document.getElementById('monthYearSelector');
    const quarterYearSelector = document.getElementById('quarterYearSelector');
    const yearOnlySelector = document.getElementById('yearOnlySelector');
    const customRangeSelector = document.getElementById('customRangeSelector');
    const profitAnalysisTableBody = document.querySelector('#profitAnalysisTable tbody');
    const detailedAnalysisTableBody = document.querySelector('#detailedAnalysisTable tbody');
    const detailedAnalysisSection = document.getElementById('detailedAnalysis');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const customMessageModal = document.getElementById('customMessageModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    const logoutBtn = document.getElementById('logout');

    // Get the export buttons
    const exportPdfBtn = document.getElementById('exportDetailedPdfBtn');
    const exportXmlBtn = document.getElementById('exportDetailedXmlBtn');

    // --- API Configuration ---
    const API_ENDPOINT = `${API_BASE_URL}/Loan/profit-analytics/detailed`;

    // --- Event Listeners ---
    filterPeriodSelect.addEventListener('change', function() {
        monthYearSelector.style.display = 'none';
        quarterYearSelector.style.display = 'none';
        yearOnlySelector.style.display = 'none';
        customRangeSelector.style.display = 'none';
        
        switch(this.value) {
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
    });

    document.getElementById('applyMonthYearFilter').addEventListener('click', () => {
        const month = document.getElementById('month').value;
        const year = document.getElementById('year').value;
        if (month && year) {
            fetchAndRenderAnalytics({ filterType: 'monthly', month, year });
        } else {
            showCustomMessageModal("Input Required", "Please select both a month and a year.");
        }
    });
    
    document.getElementById('applyQuarterYearFilter').addEventListener('click', () => {
        const quarter = document.getElementById('quarter').value;
        const year = document.getElementById('yearQuarter').value;
        if (quarter && year) {
            fetchAndRenderAnalytics({ filterType: 'quarterly', quarter, year });
        } else {
            showCustomMessageModal("Input Required", "Please select both a quarter and a year.");
        }
    });
    
    document.getElementById('applyYearFilter').addEventListener('click', () => {
        const year = document.getElementById('onlyYear').value;
        if (year) {
            fetchAndRenderAnalytics({ filterType: 'yearly', year });
        } else {
            showCustomMessageModal("Input Required", "Please enter a year.");
        }
    });

    document.getElementById('applyCustomRangeFilter').addEventListener('click', () => {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        if (startDate && endDate) {
            fetchAndRenderAnalytics({ filterType: 'custom', startDate, endDate });
        } else {
            showCustomMessageModal("Input Required", "Please select both a start and end date.");
        }
    });
    
    document.getElementById('exportDetailedPdfBtn').addEventListener('click', () => exportData('pdf'));
    document.getElementById('exportDetailedXmlBtn').addEventListener('click', () => exportData('xml'));

    logoutBtn.addEventListener('click', function(event) {
        event.preventDefault();
        localStorage.removeItem('token');
        window.location.href = 'index.html';
    });

    modalCloseBtn.addEventListener('click', hideCustomMessageModal);
    
    // --- Core Functions ---
    async function fetchAndRenderAnalytics(periodValues) {
        showLoadingIndicator();
        
        // Hide the export buttons while data is loading
        exportPdfBtn.style.display = 'none';
        exportXmlBtn.style.display = 'none';

        const authToken = localStorage.getItem('token');
        if (!authToken) {
            showCustomMessageModal("Authentication Error", "You are not logged in. Please log in to view analytics.");
            hideLoadingIndicator();
            return;
        }

        const queryParams = new URLSearchParams(periodValues).toString();
        const requestUrl = `${API_ENDPOINT}?${queryParams}`;

        try {
            const response = await fetch(requestUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            console.log("API Response Data:", data);
            
            const simpleData = data.totals || data;
            const detailedData = data.breakdown || [];
            
            renderSimpleTable(simpleData, data.period);
            renderDetailedTable(detailedData);
            
            if (detailedData.length > 0) {
                detailedAnalysisSection.style.display = 'block';
            } else {
                detailedAnalysisSection.style.display = 'none';
            }

        } catch (error) {
            console.error("Error fetching or rendering data:", error);
            showCustomMessageModal("Data Fetch Error", `Failed to load data. Details: ${error.message}`);
        } finally {
            hideLoadingIndicator();
        }
    }

    function renderSimpleTable(data, periodText) {
        profitAnalysisTableBody.innerHTML = '';
        if (Object.keys(data).length === 0) {
            profitAnalysisTableBody.innerHTML = '<tr><td colspan="7">No simple analytics data available for this period.</td></tr>';
            return;
        }
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${periodText}</td>
            <td>${data.totalDisbursement}</td>
            <td>${data.totalRepayment}</td>
            <td>${data.totalExpectedInterest}</td>
            <td>${data.defaultedLoans}</td>
            <td>${data.totalDefaultedAmount}</td>
            <td>${data.profitEarned}</td>
        `;
        profitAnalysisTableBody.appendChild(row);
    }

    function renderDetailedTable(data) {
        detailedAnalysisTableBody.innerHTML = '';
        if (data.length === 0) {
            detailedAnalysisTableBody.innerHTML = '<tr><td colspan="6">No detailed analytics data available for this period.</td></tr>';
            // Hide the buttons if no data is present
            exportPdfBtn.style.display = 'none';
            exportXmlBtn.style.display = 'none';
            return;
        }
        
        // Show the buttons if detailed data is available
        exportPdfBtn.style.display = 'inline-block';
        exportXmlBtn.style.display = 'inline-block';

        data.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.period}</td>
                <td>${item.disbursement}</td>
                <td>${item.expectedRepayment}</td>
                <td>${item.expectedInterest}</td>
                <td>${item.profitEarned}</td>
                <td>-</td>
            `;
            detailedAnalysisTableBody.appendChild(row);
        });
    }

    // --- Helper UI Functions ---
    function showLoadingIndicator() {
        loadingIndicator.style.display = 'block';
    }

    function hideLoadingIndicator() {
        loadingIndicator.style.display = 'none';
    }

    function showCustomMessageModal(title, message) {
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        customMessageModal.style.display = 'block';
    }

    function hideCustomMessageModal() {
        customMessageModal.style.display = 'none';
    }
    
    function exportData(format) {
        if (format === 'pdf') {
            const detailedAnalysisTable = document.getElementById('detailedAnalysisTable');
            if (!detailedAnalysisTable) {
                showCustomMessageModal("Export Error", "Detailed analysis table not found.");
                return;
            }

            html2canvas(detailedAnalysisTable).then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF('p', 'mm', 'a4');

                const imgWidth = 210;
                const pageHeight = 295;
                const imgHeight = canvas.height * imgWidth / canvas.width;
                let heightLeft = imgHeight;
                let position = 0;

                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;

                while (heightLeft >= 0) {
                    position = heightLeft - imgHeight;
                    pdf.addPage();
                    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                    heightLeft -= pageHeight;
                }

                pdf.save('profit-analytics.pdf');
            }).catch(error => {
                console.error("Error generating PDF:", error);
                showCustomMessageModal("Export Error", "Failed to generate PDF. Please try again.");
            });
        } else if (format === 'xml') {
            showCustomMessageModal("Exporting Data", `This will export the detailed analytics as an XML file. (Not yet implemented)`);
        }
    }
    
    // This section hides the pre-loader but does not fetch data
    const rollingLoader = document.querySelector('.rolling-load');
    if (rollingLoader) {
        setTimeout(() => {
            rollingLoader.style.display = 'none';
        }, 1000);
    }
});