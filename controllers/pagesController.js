// GET /
exports.home = (req, res) => {
  res.render('pages/home', { title: 'Node Authentication' });
};

// GET /protected
exports.protected = (req, res) => {
  res.render(
    'pages/protected', 
    { title: 'Protected Page', message: 'Only Logged In users should see this.' }
  );
};