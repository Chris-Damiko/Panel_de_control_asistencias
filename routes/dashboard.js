const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middlewares/auth');
const attendanceStats = require('../services/attendanceStats');

router.get('/dashboard', requireAuth, async (req, res) => {
  const data = await attendanceStats.build();
  res.render('dashboard', data);
});

module.exports = router;
