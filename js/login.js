document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const messageDiv = document.getElementById('message');
    const loginButton = document.getElementById('login-button');

    // --- New Toggle Logic Starts Here ---
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');

    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function () {
            // Toggle the type attribute
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);

            // Toggle the eye / eye-slash icon
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    }
    // --- New Toggle Logic Ends Here ---

    if (!loginForm || !messageDiv || !loginButton) {
        console.error("Required HTML elements not found.");
        return;
    }

    // Function to display messages to the user
    function showMessage(text, isError = false) {
        messageDiv.textContent = text;
        messageDiv.style.color = isError ? 'red' : 'green';
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Disable the button and show a loading state
        loginButton.disabled = true;
        showMessage('Logging in...');

        const email = loginForm.email.value;
        const password = loginForm.password.value;

        // Use a simple, non-retryable fetch
        try {
            const response = await fetch(`${API_BASE_URL}/Auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                // Login successful
                showMessage('Login successful! Redirecting...', false);
                // Save the token to local storage
                localStorage.setItem('token', data.token);

                // Redirect the user to the dashboard
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1000); // Wait 1 second before redirecting
            } else {
                // Login failed
                showMessage(`Login failed: ${data.message || 'Invalid credentials'}`, true);
                console.error("Login failed:", data);
            }
        } catch (error) {
            showMessage('An error occurred. Please try again.', true);
            console.error("An error occurred during the fetch request:", error);
        } finally {
            loginButton.disabled = false;
        }
    });
});
