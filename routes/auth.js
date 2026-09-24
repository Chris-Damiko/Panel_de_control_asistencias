const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const User = require('../models/User');

router.get('/login', (req, res) => {
  res.render('login', { error: null });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findByEmail(email);

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.render('login', { error: 'Credenciales inválidas.' });
  }

  req.session.userId = user.id;
  req.session.role = user.role;
  req.session.fullName = user.full_name;
  res.redirect('/dashboard');
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

module.exports = router;
