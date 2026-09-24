module.exports = {
  mode: process.env.HIKVISION_MODE || 'isapi',

  isapi: {
    host: process.env.ISAPI_HOST,
    port: process.env.ISAPI_PORT || 80,
    user: process.env.ISAPI_USER,
    password: process.env.ISAPI_PASSWORD,
  },

  openapi: {
    host: process.env.ARTEMIS_HOST,
    port: process.env.ARTEMIS_PORT || 443,
    appKey: process.env.ARTEMIS_APP_KEY,
    appSecret: process.env.ARTEMIS_APP_SECRET,
  },

  // Dispositivo simulado en software (sin hardware real conectado todavía).
  simulated: {
    host: process.env.SIM_HOST || '192.168.1.10',
    port: process.env.SIM_PORT || 80,
    deviceName: 'Control de Acceso Nocturno',
    deviceId: 'DVG-ACCESS-01',
    model: 'DS-K1T320MFX',
    serialNumber: 'DS-K1T320MFX0202026915SIM',
    macAddress: '8c:e7:48:2a:11:0f',
    firmwareVersion: 'V3.5.20',
    firmwareReleasedDate: '2024-12-27',
  },
};
