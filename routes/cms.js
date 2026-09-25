const express = require('express');
const router = express.Router();
const path = require('path');
const InstitutionSettings = require('../models/InstitutionSettings');
const { requireAuth, requireAdmin } = require('../middlewares/auth');
const { uploadLogo, uploadFavicon } = require('../middlewares/upload');
const githubSync = require('../lib/githubSync');

router.get('/cms', requireAuth, requireAdmin, async (req, res) => {
  const settings = await InstitutionSettings.get();
  res.render('cms', { settings, success: req.query.success || null });
});

router.post('/cms/colors', requireAuth, requireAdmin, async (req, res) => {
  const { institution_name, primary_color, secondary_color, accent_color } = req.body;
  const settings = await InstitutionSettings.get();
  await InstitutionSettings.update(settings.id, {
    institution_name,
    primary_color,
    secondary_color,
    accent_color,
  });
  res.redirect('/cms?success=colores');
});

router.post('/cms/logo', requireAuth, requireAdmin, uploadLogo.single('logo'), async (req, res) => {
  const settings = await InstitutionSettings.get();
  if (req.file) {
    const relativePath = path.posix.join('/uploads/logos', req.file.filename);
    await InstitutionSettings.update(settings.id, { logo_path: relativePath });
    githubSync.pushFile(req.file.path);
  }
  res.redirect('/cms?success=logo');
});

router.post('/cms/favicon', requireAuth, requireAdmin, uploadFavicon.single('favicon'), async (req, res) => {
  const settings = await InstitutionSettings.get();
  if (req.file) {
    const relativePath = path.posix.join('/uploads/favicons', req.file.filename);
    await InstitutionSettings.update(settings.id, { favicon_path: relativePath });
    githubSync.pushFile(req.file.path);
  }
  res.redirect('/cms?success=favicon');
});

module.exports = router;
