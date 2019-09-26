# README

**Node.js App Authentication Guide for:**  a standard Node.js web application. Features: 

* User collection with all four CRUD operations. 
* Login authentication with email and hashed password.
* Verifies login status and user identity with cookies and JSON web tokens.
* Verifies user's email before activating their account.
* Allows password resets for users who forgot their password.

**Stack:** JavaScript/Node.js, Express web framework, MongoDB NoSQL database, and EJS templating language.  

**Status:** Unfinished first draft. Not ready for use.

**Documentation:** https://www.techandstartup.com/guides/nodejs/app-authentication

To use this app you need to have either a local or cloud version of MongoDB. 
Then change the .env-example file name to just .env, and make sure the MONGODB_URI constant is set to the right URI of your database. If you have a local MongoDB database named my_local_db running then it is set correctly.

Start a local MongoDB server from any window in your computer's terminal with the command:
mongod

To run the app in your development environment with debug mode:  
DEBUG=node-app-structure:* npm start

Or without Debug mode: 
npm start