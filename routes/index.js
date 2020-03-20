const express = require('express');
const router = express.Router();
const pagesController = require('../controllers/pagesController');
const authController = require('../controllers/authController');
const usersController = require('../controllers/usersController');
const auth = require('./authMiddleware'); 

// Pages routes
router.get('/', pagesController.home);
router.get('/protected', auth.isLoggedIn, pagesController.protected);

// Auth routes
router.get('/signup', authController.signupPage);
router.post('/signup', authController.validateSignup, authController.signup);
router.get('/activate-account', authController.activateAccount);
router.get('/login', authController.loginPage);
router.post('/login', authController.validateLogin, authController.login);
router.get('/logout', authController.logout);
router.get('/forgot-password', authController.forgotPasswordPage);
router.post('/forgot-password', authController.forgotPassword);
router.get('/reset-password', authController.resetPasswordPage);
router.post('/reset-password', authController.resetPassword);

// Users routes
router.get('/users', auth.isAdmin, usersController.list);
router.get('/users/:id', auth.isCorrectUser, usersController.details);
router.get('/users/:id/update', auth.isCorrectUser, usersController.updatePage);
router.post('/users/:id/update', auth.isCorrectUser, 
            usersController.validateForm, usersController.update);
router.get('/users/:id/delete', auth.isCorrectUser, usersController.deletePage);
router.post('/users/:id/delete', auth.isCorrectUser, usersController.delete);

module.exports = router;