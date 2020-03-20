const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const flash = require('express-flash');
const jwt = require('jsonwebtoken');
const logger = require('morgan');
const mongoose = require('mongoose');
require('dotenv').config();
const router = require('./routes/index');

const app = express();

// Connect to the MongoDB database
mongoose.connect(
  process.env.MONGODB_URI, 
  { useNewUrlParser: true, useFindAndModify: false, useCreateIndex: true, 
    useUnifiedTopology: true }
); 
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => { console.log('Connected to the Database.') });

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session({secret: process.env.SECRET, saveUninitialized: true, resave: false}));
app.use(flash());
app.use(express.static(path.join(__dirname, 'public')));

// Add current user to local storage
const getCurrentUser = (token) => {
  if (token) {
    let decoded = jwt.verify(token, process.env.SECRET);
    const user = decoded.user || '';
    return user;
  }
}
app.use((req, res, next) => {
  res.locals.currentUser = getCurrentUser(req.cookies.jwt);
  next();
});

app.use('/', router);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('pages/error');
});

module.exports = app;
