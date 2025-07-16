// Enhanced forgot-password.js with comprehensive debugging and fixes
document.addEventListener('DOMContentLoaded', () => {
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    const resendLink = document.getElementById('resendLink');
    
    let currentEmail = '';
    let lastResetTime = 0;
    const RESET_COOLDOWN = 60000; // 1 minute cooldown between resets
    
    // Enhanced Firebase initialization check
    function checkFirebaseConfig() {
        console.log('=== Firebase Configuration Check ===');
        console.log('Firebase available:', typeof firebase !== 'undefined');    // Check if Firebase is loaded
        console.log('Firebase apps:', firebase.apps.length);    // Check if any Firebase apps are initialized
        
        if (firebase.apps.length > 0) { // If Firebase is initialized, log app details
            const app = firebase.apps[0];   // Get the first initialized app
            console.log('Firebase app name:', app.name);    /
            console.log('Firebase project ID:', app.options.projectId);
            console.log('Firebase auth domain:', app.options.authDomain);
            console.log('Firebase API key exists:', !!app.options.apiKey);
        }
        
        console.log('Firebase Auth available:', typeof firebase.auth !== 'undefined');  // Check if Firebase Auth is available
        console.log('Current domain:', window.location.origin); // Log current domain
        console.log('======================================');
        
        return firebase.apps.length > 0;
    }
    
    // Check Firebase configuration on load
    if (!checkFirebaseConfig()) {
        console.error('Firebase is not initialized properly');
        showError('Firebase configuration error. Please check the setup.');
        return;
    }
    
    // Enhanced email validation and debugging
    function validateAndConvertEmail(matrixId) {
        console.log('=== Email Validation Debug ===');
        console.log('Input Matrix ID:', matrixId);
        
        const matrixIdPattern = /^[Pp]{1}\d{8}$/;
        const isValidFormat = matrixIdPattern.test(matrixId);
        console.log('Valid Matrix ID format:', isValidFormat);
        
        if (!isValidFormat) {
            return { isValid: false, email: null, error: 'Invalid Matrix ID format' };
        }
        
        const email = `${matrixId.toLowerCase()}@student.newinti.edu.my`;
        console.log('Converted email:', email);
        console.log('Email validation passed');
        console.log('==============================');
        
        return { isValid: true, email: email, error: null };
    }
    
    // Enhanced password reset function with detailed logging
    async function handlePasswordReset(isResend = false) {  // Function to handle password reset
        const matrixId = document.getElementById('matrixId').value.trim().toUpperCase();    // Get the Matrix ID input
        console.log('\n=== Password Reset Process Started ===');    // Log start of password reset process
        console.log('Matrix ID input:', matrixId);       // Log the Matrix ID input
        console.log('Is resend:', isResend);    // Log if this is a resend request
        
        // Validate Matrix ID format
        const validation = validateAndConvertEmail(matrixId);   
        if (!validation.isValid) {  // If validation fails, show error
            showError("Invalid Matrix ID format. Please use format: P12345678");
            return;
        }
        
        currentEmail = validation.email;    // Get the converted email
        console.log('Target email:', currentEmail);   // Log the target email
        
        try {
            // Show loading state
            const resetBtn = document.querySelector('.login-btn');
            const originalText = resetBtn.textContent;  // Store original button text
            setLoadingState(resetBtn, true, isResend ? 'Resending...' : 'Sending...');  // Set loading state on button
            
            console.log('=== Checking User Existence ==='); // Log user existence check
            let userExists = false; // Flag to track if user exists
            
            try {
                // Check if user exists using fetchSignInMethodsForEmail
                const signInMethods = await firebase.auth().fetchSignInMethodsForEmail(currentEmail);
                console.log('Sign-in methods for email:', signInMethods);   // Log sign-in methods for the email
                userExists = signInMethods.length > 0;
                console.log('User exists:', userExists);
                
                if (!userExists) {
                    console.warn('No user found with this email address');
                    // Firebase will still send the email but it won't work
                    // We should inform the user appropriately
                }
            } catch (checkError) {
                console.log('User existence check failed:', checkError.code, checkError.message);
                // Continue with password reset attempt
            }
            
            console.log('=== Configuring Action Code Settings ===');
            // Enhanced action code settings
            const actionCodeSettings = {    
                url: `${window.location.origin}/index.html?reset=success`,
                handleCodeInApp: false,
                // Add iOS and Android package names if you have mobile apps
                // iOS: { bundleId: 'your.bundle.id' },
                // android: { packageName: 'your.package.name', installApp: true, minimumVersion: '12' }
            };
            
            console.log('Action code settings:', JSON.stringify(actionCodeSettings, null, 2));  // Log action code settings
            console.log('Redirect URL:', actionCodeSettings.url);
            
            console.log('=== Sending Password Reset Email ===');
            console.log('Attempting to send to:', currentEmail);
            
            // Send password reset email
            await firebase.auth().sendPasswordResetEmail(currentEmail, actionCodeSettings);
            
            console.log('✅ Password reset email sent successfully!');
            
            // Update last reset time
            lastResetTime = Date.now();
            
            // Show success message
            document.getElementById('emailSent').textContent = currentEmail;
            showSuccess();
            
            // Clear form if not resending
            if (!isResend) {
                document.getElementById('matrixId').value = '';
                document.getElementById('matrixId').classList.remove('valid', 'invalid');
            }
            
            // Additional user guidance
            console.log('=== User Guidance ===');
            console.log('1. Check inbox for:', currentEmail);
            console.log('2. Check spam/junk folder');
            console.log('3. Email may take 5-15 minutes to arrive');
            console.log('4. Look for sender: noreply@your-project-id.firebaseapp.com');
            console.log('====================');
            
        } catch (error) {   // Catch any errors during the password reset process
            console.error('\n❌ Password Reset Error Details:');
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            console.error('Full error object:', error);
            
            // Log additional debugging info
            if (error.code === 'auth/invalid-email') {
                console.error('Email format issue - check email construction');
            } else if (error.code === 'auth/user-not-found') {
                console.error('User does not exist in Firebase Auth');
            } else if (error.code === 'auth/too-many-requests') {
                console.error('Rate limiting triggered');
            }
            
            let errorMsg = getPasswordResetErrorMessage(error.code, error.message);
            showError(errorMsg);
            
        } finally {
            // Remove loading state
            const resetBtn = document.querySelector('.login-btn');
            setLoadingState(resetBtn, false, 'Send Reset Link');
        }
        
        console.log('=== Password Reset Process Completed ===\n');
    }
    
    // Enhanced error message handling
    function getPasswordResetErrorMessage(errorCode, errorMessage) {
        switch (errorCode) {
            case "auth/user-not-found":
                return "No account found with this Matrix ID. Please check your Matrix ID or register for a new account first.";
            case "auth/invalid-email":
                return "Invalid email format generated from Matrix ID. Please contact support.";
            case "auth/too-many-requests":
                return "Too many password reset requests. Please wait 15-30 minutes before trying again.";
            case "auth/network-request-failed":
                return "Network error. Please check your internet connection and try again.";
            case "auth/user-disabled":
                return "This account has been disabled. Please contact support for assistance.";
            case "auth/quota-exceeded":
                return "Password reset quota exceeded. Please try again later or contact support.";
            case "auth/missing-continue-uri":
            case "auth/invalid-continue-uri":
            case "auth/unauthorized-continue-uri":
                return "Email configuration error. Please contact support - the password reset link may not work properly.";
            case "auth/operation-not-allowed":
                return "Password reset is not enabled. Please contact support.";
            case "auth/weak-password":
                return "The generated reset link has security issues. Please contact support.";
            default:
                console.error("Unhandled password reset error:", errorCode, errorMessage);
                return `Unable to send password reset email (${errorCode}). Please try again later or contact support.`;
        }
    }
    
    // Rest of your existing functions with minor enhancements...
    forgotPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handlePasswordReset();
    });
    
    resendLink.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const now = Date.now();
        if (now - lastResetTime < RESET_COOLDOWN) {
            const remainingTime = Math.ceil((RESET_COOLDOWN - (now - lastResetTime)) / 1000);
            showError(`Please wait ${remainingTime} seconds before requesting another reset email.`);
            return;
        }
        
        await handlePasswordReset(true);
    });
    
    // Real-time Matrix ID validation
    document.getElementById('matrixId').addEventListener('input', (e) => {
        const matrixId = e.target.value.trim();
        const isValid = /^[Pp]{1}\d{8}$/.test(matrixId);
        
        if (matrixId && !isValid) {
            e.target.classList.add('invalid');
            e.target.classList.remove('valid');
        } else if (matrixId && isValid) {
            e.target.classList.add('valid');
            e.target.classList.remove('invalid');
        } else {
            e.target.classList.remove('valid', 'invalid');
        }
        
        clearMessages();
    });
    
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
        
        setTimeout(() => {
            if (errorMessage.style.display === "block") {
                errorMessage.style.display = "none";
            }
        }, 15000); // Increased timeout for better UX
    }
    
    function showSuccess() {
        successMessage.style.display = "block";
        errorMessage.style.display = "none";
    }
    
    function clearMessages() {
        if (errorMessage.style.display === "block") {
            errorMessage.style.display = "none";
        }
    }
    
    // Handle URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('email')) {
        const emailParam = urlParams.get('email');
        if (emailParam.includes('@student.newinti.edu.my')) {
            document.getElementById('matrixId').value = emailParam.split('@')[0].toUpperCase();
        }
    }
    
    // Enhanced Firebase Auth state monitoring
    firebase.auth().onAuthStateChanged((user) => {
        console.log('Auth state changed:', user ? `User: ${user.email}` : 'No user signed in');
    });
    
    // Add comprehensive system check
    console.log('\n=== System Environment Check ===');
    console.log('User Agent:', navigator.userAgent);
    console.log('Current URL:', window.location.href);
    console.log('Referrer:', document.referrer);
    console.log('Online status:', navigator.onLine);
    console.log('Local time:', new Date().toISOString());
    console.log('Timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
    console.log('===================================\n');
});