const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middlewares/auth');
const hikvisionClient = require('../services/hikvision/hikvisionClient');
const hikvisionConfig = require('../config/hikvisionConfig');
const attendanceStats = require('../services/attendanceStats');

router.get('/dispositivos', requireAuth, async (req, res) => {
  let device = null;
  let error = null;
  const data = await attendanceStats.build();

  try {
    const started = Date.now();
    const info = await hikvisionClient.getDeviceInfo();
    const latency = Date.now() - started;
    const d = info.DeviceInfo || info;
    const modeConfig = hikvisionConfig[hikvisionClient.mode] || {};
    device = {
      ip: modeConfig.host,
      model: d.model,
      firmware: d.firmwareVersion,
      firmwareDate: d.firmwareReleasedDate,
      serial: d.serialNumber,
      name: d.deviceName,
      id: d.deviceID,
      mac: d.macAddress,
      type: d.deviceType,
      latency,
    };
  } catch (err) {
    error = err.message;
  }

  res.render('dispositivos/index', {
    device,
    error,
    mode: hikvisionClient.mode,
    stats: data.stats,
    events: data.recentEvents,
    lastSync: data.device.lastSync,
  });
});

module.exports = router;
