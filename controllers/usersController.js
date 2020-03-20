const bcrypt = require('bcrypt');
const createError = require('http-errors');
const User = require('../models/user');
const { body, validationResult } = require('express-validator');

exports.validateForm = [
  // Validate username not empty.
  body('username').trim().not().isEmpty().withMessage('Username cannot be blank.'),
  // Change email to lowercase, validate not empty, valid format, is not in use if changed.
  body('email')
    .not().isEmpty().withMessage('Email cannot be blank.')
    .isEmail().withMessage('Email format is invalid.')
    .normalizeEmail()
    // Validate that a changed email is not already in use.
    .custom((value, { req }) => {
      return User.findOne({email: value}).then(user => {
        if (user && user._id.toString() !== req.params.id) {
          return Promise.reject('Email is already in use');
        }
      });
    }),
  // Validate password is at least 6 chars long, matches password confirmation if changed.
  body('password')
    .isLength({ min: 6 }).optional({ checkFalsy: true })
    .withMessage('Password must be at least 6 characters.')
    .optional({ checkFalsy: true }).custom((value, { req }) => {
      if (value != req.body.passwordConfirmation) {
        throw new Error('Password confirmation does not match password');
      }
      // Indicates the success of this synchronous custom validator
      return true;    
    }
  ),
];

// GET /users
exports.list = (req, res, next) => {
  User.find()
  // User.find({activated: true}) adds a condition
    .sort({'username': 'asc'})
    .limit(50)
    .select('_id username email')
    .exec((err, users) => {
      if (err) { 
        next(err); 
      } else {
        res.render('users/list', { title: 'Users', users: users });
      }
    });
};

// GET /users/:id
exports.details = (req, res, next) => { 
  User.findById(req.params.id, (err, user) => {
    // if id not found mongoose throws CastError. 
    if (err || !user) {
      next(createError(404));
    } else {
      res.render('users/details', { title: 'User', user: user });
    }
  });
};

// GET /users/:id/update
exports.updatePage = (req, res, next) => {
  User.findById(req.params.id, (err, user) => {
    // if id not found throws CastError. 
    if (err || !user) { 
      next(createError(404));
    } else {
      res.render('users/update', { title: 'Update User', user: user });
    }
  });
};

// POST /users/:id/update
exports.update =   async (req, res, next) => {
  const user = {
    username: req.body.username,
    email: req.body.email,
    _id: req.params.id
  }; 

  // Create object of any validation errors from the request.
  const errors = validationResult(req);
  // if errors send the errors and original request body back.
  if (!errors.isEmpty()) {
    return res.render('users/update', { user: user, errors: errors.array() });
  }
  try {
    if (req.body.password) {
      user.password = await bcrypt.hash(req.body.password, 10);
    }
    await User.findByIdAndUpdate(
      req.params.id, 
      user, 
      {new: true}
    );
    req.flash('success', 'Account Updated.');
    res.redirect(`/users/${user._id}`);
  } catch (err) {
    next(err);
  }
};

// GET /users/:id/delete
exports.deletePage = (req, res, next) => {
  User.findById(req.params.id, (err, user) => {
    // if id not found throws CastError. 
    if (err || !user) {
      next(createError(404));
    } else {
      res.render('users/delete', { title: 'Delete Account', user: user });
    }
  });
};

// POST users/:id/delete
exports.delete = (req, res, next) => {
  User.findByIdAndRemove(req.body.id, (err) => {
    if (err) { 
      next(err); 
    } else {
      res.clearCookie('jwt');
      req.flash('info', 'Account Deleted.');
      res.redirect('/');   
    }
  })
};