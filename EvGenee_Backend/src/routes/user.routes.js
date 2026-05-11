const express = require('express');
const {
    registerUser,
    loginUser,
    getProfile,
    updateProfile,
    logoutUser,
    forgotPassword,
    verifyOTP,
    resetPassword,
} = require('../controllers/user.controller');
const { 
    registerValidation, 
    loginValidation,
    forgotPasswordValidation,
    verifyOTPValidation,
    resetPasswordValidation
} = require('../validations/user.validation');
const { handleValidationErrors } = require('../middlewares/validate.middleware');
const { validateToken } = require('../middlewares/auth.middleware');

const router = express.Router();

// Public routes
router.post('/register', registerValidation, handleValidationErrors, registerUser);
router.post('/login', loginValidation, handleValidationErrors, loginUser);
router.post('/forgot-password', forgotPasswordValidation, handleValidationErrors, forgotPassword);
router.post('/verify-otp', verifyOTPValidation, handleValidationErrors, verifyOTP);
router.post('/reset-password', resetPasswordValidation, handleValidationErrors, resetPassword);

// Protected routes
router.get('/profile', validateToken, getProfile);
router.put('/profile', validateToken, updateProfile);
router.post('/logout', validateToken, logoutUser);

module.exports = router;