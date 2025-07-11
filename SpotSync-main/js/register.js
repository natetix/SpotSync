// register.js
document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    
    // Real-time password strength indicator
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    
    // Add password strength indicator
    const passwordStrengthDiv = document.createElement('div');
    passwordStrengthDiv.className = 'password-strength';
    passwordStrengthDiv.innerHTML = '<div class="strength-bar"><div class="strength-fill"></div></div><span class="strength-text">Password strength</span>';
    passwordInput.parentNode.appendChild(passwordStrengthDiv);
    
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const matrixId = document.getElementById('matrixId').value.trim().toUpperCase();
        const fullName = document.getElementById('fullName').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        // Clear previous messages
        hideMessages();
        
        // Comprehensive validation
        const validationResult = validateRegistrationData(matrixId, fullName, password, confirmPassword);
        if (!validationResult.isValid) {
            showError(validationResult.message);
            return;
        }
        
        // Convert Matrix ID to institutional email
        const email = `${matrixId.toLowerCase()}@student.newinti.edu.my`;
        
        console.log("Attempting registration with email:", email);
        
        try {
            // Show loading state
            const registerBtn = document.querySelector('.login-btn');
            setLoadingState(registerBtn, true, 'Creating Account...');
            
            // Create user with email and password
            const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Update user profile with display name
            await user.updateProfile({
                displayName: fullName
            });
            
            // Send email verification with custom message
            const actionCodeSettings = {
                url: window.location.origin + '/index.html?verified=true',
                handleCodeInApp: false
            };
            
            await user.sendEmailVerification(actionCodeSettings);
            
            // Show success message
            document.getElementById('emailSent').textContent = email;
            showSuccess();
            
            // Clear form
            registerForm.reset();
            updatePasswordStrength('');
            
            console.log("Registration successful, verification email sent");
            
            // Optional: Auto-redirect after successful registration
            setTimeout(() => {
                window.location.href = 'index.html?message=Please check your email to verify your account';
            }, 5000);
            
        } catch (error) {
            console.error("Registration error:", error);
            
            // Enhanced error handling
            let errorMsg = getRegistrationErrorMessage(error.code, error.message);
            showError(errorMsg);
            
        } finally {
            // Remove loading state
            const registerBtn = document.querySelector('.login-btn');
            setLoadingState(registerBtn, false, 'Register');
        }
    });
    
    // Real-time password strength checking
    passwordInput.addEventListener('input', (e) => {
        updatePasswordStrength(e.target.value);
        clearPasswordMismatch();
    });
    
    // Real-time password confirmation validation
    confirmPasswordInput.addEventListener('input', (e) => {
        validatePasswordMatch();
        clearMessages();
    });
    
    // Real-time Matrix ID validation
    document.getElementById('matrixId').addEventListener('input', (e) => {
        const matrixId = e.target.value.trim();
        const isValid = /^[Pp]{1}\d{8}$/.test(matrixId);
        
        if (matrixId && !isValid) {
            e.target.style.borderColor = '#ef4444';
        } else {
            e.target.style.borderColor = '';
        }
        clearMessages();
    });
    
    // Real-time full name validation
    document.getElementById('fullName').addEventListener('input', (e) => {
        const name = e.target.value.trim();
        if (name && name.length < 2) {
            e.target.style.borderColor = '#ef4444';
        } else {
            e.target.style.borderColor = '';
        }
        clearMessages();
    });
    
    function validateRegistrationData(matrixId, fullName, password, confirmPassword) {
        // Matrix ID validation
        const matrixIdPattern = /^[Pp]{1}\d{8}$/;
        if (!matrixIdPattern.test(matrixId)) {
            return {
                isValid: false,
                message: "Invalid Matrix ID format. Please use format: P12345678"
            };
        }
        
        // Full name validation
        if (fullName.length < 2) {
            return {
                isValid: false,
                message: "Please enter your full name (at least 2 characters)"
            };
        }
        
        if (!isValidName(fullName)) {
            return {
                isValid: false,
                message: "Full name can only contain letters, spaces, hyphens, and apostrophes"
            };
        }
        
        // Password validation
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
            return passwordValidation;
        }
        
        // Password confirmation validation
        if (password !== confirmPassword) {
            return {
                isValid: false,
                message: "Passwords do not match"
            };
        }
        
        return { isValid: true };
    }
    
    function validatePassword(password) {
        if (password.length < 8) {
            return {
                isValid: false,
                message: "Password must be at least 8 characters long"
            };
        }
        
        if (password.length > 128) {
            return {
                isValid: false,
                message: "Password must be less than 128 characters"
            };
        }
        
        // Check for at least one letter and one number
        if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(password)) {
            return {
                isValid: false,
                message: "Password must contain at least one letter and one number"
            };
        }
        
        // Check for common weak passwords
        const commonPasswords = ['password', '12345678', 'qwerty123', 'password123'];
        if (commonPasswords.includes(password.toLowerCase())) {
            return {
                isValid: false,
                message: "Please choose a stronger password"
            };
        }
        
        return { isValid: true };
    }
    
    function isValidName(name) {
        // Allow letters, spaces, hyphens, apostrophes, and some international characters
        return /^[a-zA-Z\s\-'àáâäèéêëìíîïòóôöùúûüñç]+$/.test(name);
    }
    
    function updatePasswordStrength(password) {
        const strengthBar = document.querySelector('.strength-fill');
        const strengthText = document.querySelector('.strength-text');
        
        if (!password) {
            strengthBar.style.width = '0%';
            strengthBar.className = 'strength-fill';
            strengthText.textContent = 'Password strength';
            return;
        }
        
        let score = 0;
        let feedback = [];
        
        // Length check
        if (password.length >= 8) score += 20;
        else feedback.push('at least 8 characters');
        
        // Character variety checks
        if (/[a-z]/.test(password)) score += 15;
        if (/[A-Z]/.test(password)) score += 15;
        if (/\d/.test(password)) score += 15;
        if (/[^a-zA-Z\d]/.test(password)) score += 20;
        
        // Length bonus
        if (password.length >= 12) score += 15;
        
        // Determine strength level
        let level, color, text;
        if (score < 30) {
            level = 'weak';
            color = '#ef4444';
            text = 'Weak';
        } else if (score < 60) {
            level = 'medium';
            color = '#f59e0b';
            text = 'Medium';
        } else if (score < 80) {
            level = 'good';
            color = '#10b981';
            text = 'Good';
        } else {
            level = 'strong';
            color = '#059669';
            text = 'Strong';
        }
        
        strengthBar.style.width = `${Math.min(score, 100)}%`;
        strengthBar.style.backgroundColor = color;
        strengthText.textContent = `${text} password`;
        strengthText.style.color = color;
    }
    
    function validatePasswordMatch() {
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        
        if (confirmPassword && password !== confirmPassword) {
            confirmPasswordInput.style.borderColor = '#ef4444';
            confirmPasswordInput.title = 'Passwords do not match';
        } else {
            confirmPasswordInput.style.borderColor = '';
            confirmPasswordInput.title = '';
        }
    }
    
    function clearPasswordMismatch() {
        if (confirmPasswordInput.style.borderColor === 'rgb(239, 68, 68)') {
            validatePasswordMatch();
        }
    }
    
    function getRegistrationErrorMessage(errorCode, errorMessage) {
        switch (errorCode) {
            case "auth/email-already-in-use":
                return "This Matrix ID is already registered. Try logging in instead, or contact support if you believe this is an error.";
            case "auth/invalid-email":
                return "Invalid Matrix ID format. Please use format: P12345678";
            case "auth/weak-password":
                return "Password is too weak. Please use at least 8 characters with letters and numbers.";
            case "auth/network-request-failed":
                return "Network error. Please check your internet connection and try again.";
            case "auth/too-many-requests":
                return "Too many registration attempts. Please wait a few minutes before trying again.";
            case "auth/operation-not-allowed":
                return "Registration is currently disabled. Please contact support.";
            default:
                console.error("Unhandled registration error:", errorCode, errorMessage);
                return `Registration failed. Please try again or contact support if the problem persists.`;
        }
    }
    
    function setLoadingState(button, isLoading, text) {
        if (isLoading) {
            button.classList.add('loading');
            button.textContent = text;
            button.disabled = true;
        } else {
            button.classList.remove('loading');
            button.textContent = text;
            button.disabled = false;
        }
    }
    
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = "block";
        successMessage.style.display = "none";
        
        // Auto-hide error after 10 seconds
        setTimeout(() => {
            errorMessage.style.display = "none";
        }, 10000);
    }
    
    function showSuccess() {
        successMessage.style.display = "block";
        errorMessage.style.display = "none";
        
        // Hide success message after 15 seconds
        setTimeout(() => {
            successMessage.style.display = "none";
        }, 15000);
    }
    
    function hideMessages() {
        errorMessage.style.display = "none";
        successMessage.style.display = "none";
    }
    
    function clearMessages() {
        if (errorMessage.style.display === "block") {
            errorMessage.style.display = "none";
        }
    }
});