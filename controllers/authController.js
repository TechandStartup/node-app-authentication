const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const cryptoRandomString = require('crypto-random-string');
const sgMail = require('@sendgrid/mail');
const ejs = require('ejs');
const User = require('../models/user');

/* SIGNUP */

exports.validateSignup = [
  // validate username not empty.
  body('username').trim().not().isEmpty().withMessage('Username cannot be blank.'),
  // change email to lowercase, validate not empty, valid format, not in use.
  body('email')
    .not().isEmpty().withMessage('Email cannot be blank.')
    .isEmail().withMessage('Email format is invalid.')
    .normalizeEmail()
    .custom((value) => {
      return User.findOne({email: value}).then(user => {
        if (user) {
          return Promise.reject('Email is already in use');
        }
      });
    }),
  // Validate password at least 6 chars, passwordConfirmation matches password.
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.')
    .custom((value, { req }) => {
      if (value !== req.body.passwordConfirmation) {
        throw new Error('Password confirmation does not match password');
      }
      // Indicates the success of this synchronous custom validator
      return true;    
    }
  )  
];

// GET /signup
exports.signupPage = (req, res, next) => {
  res.render('auth/signup', { title: 'Signup' });
};

// Helper function for signup action
const sendActivationEmail = async (username, email, token) => {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  const html = await ejs.renderFile(
    __dirname + "/../views/email/activate-account.ejs",
    {username: username, email: email, token: token }
  );
  const msg = {
    to: email,
    from: 'no-reply@example.com',
    subject: 'Account activation',
    html: html
  };
  try {
    // View email in the console without sending it.
    console.log('Activation Email: ', msg); 
    // Uncomment below to send the email.
    // await sgMail.send(msg);
    console.log('Email has been sent!');
  } catch(err) {
    console.log('There was an error sending the email. Error: ' + err);
  }
};

// POST /signup
exports.signup = async (req, res, next) => {
  // Create object of any validation errors from the request.
  const errors = validationResult(req);
  // if errors send the errors and original request body back.
  if (!errors.isEmpty()) {
    return res.render('auth/signup', { user: req.body, errors: errors.array() });
  }
  try {
    const token = await cryptoRandomString({length: 10, type: 'url-safe'});
    const username = req.body.username;
    const email = req.body.email;
    sendActivationEmail(username, email, token);
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const user = User.create({
      username: username,
      email: email,
      password: hashedPassword,
      activationToken: token
    });
    req.flash('info', 'Please check your email to activate your account.');
    res.redirect('/');
  } catch (err) {
    next(err);
  }
};

// GET /activate-account
exports.activateAccount = async (req, res, next) => { 
  if (!req.query.token || !req.query.email) {
    req.flash('warning', 'Token or email was not provided.');
    return res.redirect('/');
  }
  const user = await User.findOne({ email: req.query.email }); 
  if (!user || user.activationToken !== req.query.token) {
    req.flash('warning', 'Could not activate account.');
    return res.redirect('/');
  } 
  User.findByIdAndUpdate(user._id, {activated: true}, (err) => {
    if (err) { 
      return next(err); 
    }
    // On success - login user and redirect.
    const token = jwt.sign(
      { user: { id: user._id, username: user.username, role: user.role }}, 
      process.env.SECRET, 
      { expiresIn: '1y' }
    );
    res.cookie('jwt', token, { httpOnly: true, maxAge: 3600000 });
    req.flash('success', 'Your account is activated.');
    res.redirect(user.url);
  }); 
};

/* LOGIN */

// GET /login
exports.loginPage = (req, res, next) => {       
  res.render('auth/login', { title: "Log In" });
};

// POST /login
exports.validateLogin = [
  // change email to lowercase, validate not empty.
  body('email')
  .not().isEmpty().withMessage('Email cannot be blank.')
  .normalizeEmail()
  // custom validator gets user object from DB from email, rejects if not present, compares user.password to hashed password from login.
  .custom((value, {req}) => {
    return User.findOne({email: value}).then(async (user) => {
      if (!user) {
        return Promise.reject('Email or Password are incorrect.');
      }
      const passwordIsValid = await bcrypt.compareSync(req.body.password, user.password);
      if (!passwordIsValid) {
        // return Promise.reject('Email or Password are incorrect.');
        throw new Error('Email or Password are incorrect.')
      }
      if (user.activated === false) {
        throw new Error('Account not activated. Check your email for activation link.') 
      }
    });
  }),
]
exports.login = async (req, res, next) => {
  // Create object of any validation errors from the request.
  const errors = validationResult(req);
  // if errors send the errors and original request body back.
  if (!errors.isEmpty()) {
    res.render('auth/login', { user: req.body, errors: errors.array() });
  } else {
    User.findOne({email: req.body.email}).then((user) => {
      // the jwt and cookie each have their own expirations.
      const token = jwt.sign(
        { user: { id: user._id, username: user.username, role: user.role }}, 
        process.env.SECRET, 
        { expiresIn: '1y' }
      );
      // Assign the jwt to the cookie. 
      // Adding option secure: true only allows https. 
      // maxAge 3600000 is 1 hr (in milliseconds). Below is 1 year.
      res.cookie('jwt', token, { httpOnly: true, maxAge: 31536000000 });
      req.flash('success', 'You are logged in.');
      res.redirect('/');
    });
  }
};

// GET /logout
exports.logout = (req, res, next) => {
  res.clearCookie('jwt');
  req.flash('info', 'Logged out.');
  res.redirect('/');
};

/* PASSWORD RESET */

// GET /password-reset
exports.forgotPasswordPage = (req, res, next) => {   
  res.render('auth/forgot-password', { title: 'Forgot Password' });
};

// Helper function for handleForgotPassword action.
const sendResetPasswordEmail = async (email, token) => {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  const html = await ejs.renderFile(
    __dirname + "/../views/email/reset-password.ejs",
    {email: email, token: token }
  );
  const msg = {
    to: email,
    from: 'no-reply@example.com',
    subject: 'Reset Password',
    html: html
  };
  try {
    // View email in the console without sending it.
    console.log('Password Reset Email: ', msg);
    // Uncomment below to send the email.
    // const status = await sgMail.send(msg);
    console.log('Email has been sent!');
  } catch(err) {
    console.log('There was an error sending the email. Error: ' + err);
  }
};

// POST /password-reset
exports.forgotPassword = [
  // change email to lowercase, validate not empty.
  body('email')
    .not().isEmpty().withMessage('Email cannot be blank.')
    .normalizeEmail()
    // custom validator gets user object from DB from email, rejects if not found.
    .custom((value, {req}) => {
      return User.findOne({email: value}).then(async (user) => {
        if (!user) {
          return Promise.reject('Email address not found.');
        }
      });
    }),
  async (req, res, next) => {
    // Create object of any validation errors from the request.
    const errors = validationResult(req);
    // if errors send the errors and original request body back.
    if (!errors.isEmpty()) {
      res.render('auth/forgot-password', { user: req.body, errors: errors.array() });
    } else {
      const token = await cryptoRandomString({length: 10, type: 'url-safe'});
      const user = await User.findOneAndUpdate(
        {email: req.body.email}, 
        {resetToken: token, resetSentAt: Date.now()}, 
        {new: true}
      );
      sendResetPasswordEmail(user.email, token);

      req.flash('info', 'Email sent with password reset instructions.');
      res.redirect('/');
    }
  }
];

// GET /reset-password
exports.resetPasswordPage = (req, res, next) => {
  res.render(
    'auth/reset-password', 
    { title: 'Reset Password', user: {email: req.query.email, resetToken: req.query.token}}
  );
};

// POST /reset-password
exports.resetPassword = [
  // Validate password at least 6 chars, passwordConfirmation matches password.
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.')
    .custom(async (value, { req }) => {
      if (!req.query.token || !req.query.email) { 
        throw new Error('Reset email or token is invalid'); 
      }      
      if (value !== req.body.passwordConfirmation) {
        throw new Error('Password confirmation does not match password');
      }
      let user = await User.findOne({ email: req.query.email, resetToken: req.query.token }); 
      if (!user) { 
        throw new Error('Reset email or token is invalid'); 
      }
      // validate not more than 2 hours.
      if (Date.now() - user.resetSentAt > 72000000) {
        throw new Error('Password Reset has Expired.');
      }
      // Indicates the success of this synchronous custom validator
      return true;    
    }
  ),
  async (req, res, next) => {

    // Create object of any validation errors from the request.
    const errors = validationResult(req);

    // if errors send the errors and original request body back.
    if (!errors.isEmpty()) {
      res.render('auth/reset-password', { user: req.body, errors: errors.array() });
    } else {
      const hashedPassword = await bcrypt.hash(req.body.password, 10);     
      const user = await User.findOneAndUpdate(
        {email: req.query.email}, 
        {password: hashedPassword}, 
        { new: true}
      );
      // create the signed json web token expiring in 1 year. 
      const jwtToken = await jwt.sign(
        { user: { id: user._id, username: user.username, role: user.role }}, 
        process.env.SECRET, 
        { expiresIn: '1y' }
      );
      // Assign the jwt to the cookie expiring in 1 year. 
      // Adding option secure: true only allows https.           
      res.cookie('jwt', jwtToken, { httpOnly: true, maxAge: 31536000000 });       
      req.flash('success', 'Password has been reset.');
      res.redirect(user.url);
    }
  }
];
