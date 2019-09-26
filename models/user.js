const mongoose = require('mongoose');
const { body } = require('express-validator');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  },
  email: {
    type: String,
    lowercase: true,
    required: true,
    index: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String
  },
  activationToken: {
    type: String
  },
  activated: {
    type: Boolean,
    default: false
  },
  resetToken: {
    type: String
  },
  resetSentAt: {
    type: Date
  }
}, {timestamps: true});

// Virtual field for user URL
userSchema.virtual('url').get(function() {
  return '/users/' + this._id;
});

module.exports = mongoose.model('User', userSchema);