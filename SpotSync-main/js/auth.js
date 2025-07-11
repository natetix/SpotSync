// auth.js
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');
    
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const matrixId = document.getElementById('matrixId').value.trim();
        const password = document.getElementById('password').value;
        
        // Validate Matrix ID format (P + 8 digits)
        const matrixIdPattern = /^[Pp]{1}\d{8}$/;
        if (!matrixIdPattern.test(matrixId)) {
            showError("Invalid Matrix ID format. Please use format: P12345678");
            return;
        }
        
        // Convert Matrix ID to institutional email (correct domain)
        const email = `${matrixId.toLowerCase()}@student.newinti.edu.my`;
        
        console.log("Attempting login with email:", email); // For debugging
        
        try {
            // Show loading state
            const loginBtn = document.querySelector('.login-btn');
            loginBtn.classList.add('loading');
            loginBtn.textContent = 'Logging in...';
            
            // Sign in with email/password
            const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
            
            // Check if email is verified
            if (!userCredential.user.emailVerified) {
                await firebase.auth().signOut();
                showError("Please verify your email before logging in. Check your student email inbox.");
                return;
            }
            
            // Successful login - redirect to dashboard
            console.log("Login successful, redirecting to dashboard");
            // Admin check for p23015057@student.newinti.edu.my
            if (email === ' @student.newinti.edu.my') {
                window.location.href = "admin-dashboard.html";
            } else {
                window.location.href = "user-dashboard.html";
            }
            
        } catch (error) {
            console.error("Login error:", error); // For debugging
            
            // Handle errors
            let errorMsg;
            switch (error.code) {
                case "auth/user-not-found":
                    errorMsg = "Matrix ID not found. Please check your Matrix ID or register first.";
                    break;
                case "auth/wrong-password":
                    errorMsg = "Incorrect password. Please try again.";
                    break;
                case "auth/invalid-email":
                    errorMsg = "Invalid Matrix ID format. Please use format: P12345678";
                    break;
                case "auth/too-many-requests":
                    errorMsg = "Account temporarily locked due to too many failed attempts. Try again later.";
                    break;
                case "auth/network-request-failed":
                    errorMsg = "Network error. Please check your internet connection.";
                    break;
                case "auth/user-disabled":
                    errorMsg = "This account has been disabled. Please contact support.";
                    break;
                default:
                    errorMsg = `Login failed: ${error.message}`;
                    console.error("Unhandled login error:", error);
            }
            showError(errorMsg);
        } finally {
            // Remove loading state
            const loginBtn = document.querySelector('.login-btn');
            loginBtn.classList.remove('loading');
            loginBtn.textContent = 'Login';
        }
    });
    
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = "block";
        
        // Auto-hide error after 7 seconds
        setTimeout(() => {
            errorMessage.style.display = "none";
        }, 7000);
    }
    
    // Clear error when user starts typing
    document.getElementById('matrixId').addEventListener('input', () => {
        if (errorMessage.style.display === "block") {
            errorMessage.style.display = "none";
        }
    });
    
    document.getElementById('password').addEventListener('input', () => {
        if (errorMessage.style.display === "block") {
            errorMessage.style.display = "none";
        }
    });
});