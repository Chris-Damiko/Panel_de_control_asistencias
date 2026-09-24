// Adaptador simulado: se comporta como el DS-K1T320MFX real (mismas formas de
// respuesta que isapiAdapter/openApiAdapter) pero sin hablarle a ningún
// dispositivo de verdad. Sirve para probar y demostrar el panel completo
// mientras no hay hardware conectado - el mismo patrón que un ESP32 simulado
// antes de tener el LilyGo real en mano. Cuando haya dispositivo real, se
// cambia HIKVISION_MODE en .env y no hace falta tocar nada más.
const config = require('../../config/hikvisionConfig').simulated;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function addOrUpdatePerson(person) {
  await delay(150 + Math.random() * 150);
  return {
    statusCode: 1,
    statusString: 'OK',
    subStatusCode: 'ok',
    employeeNo: person.employee_no,
  };
}

async function getDeviceInfo() {
  await delay(80);
  return {
    DeviceInfo: {
      deviceName: config.deviceName,
      deviceID: config.deviceId,
      model: config.model,
      serialNumber: config.serialNumber,
      macAddress: config.macAddress,
      firmwareVersion: config.firmwareVersion,
      firmwareReleasedDate: config.firmwareReleasedDate,
      deviceType: 'accessControl',
    },
  };
}

async function addFace(employeeNo) {
  await delay(200 + Math.random() * 200);
  return {
    statusCode: 1,
    statusString: 'OK',
    employeeNo,
  };
}

module.exports = { addOrUpdatePerson, getDeviceInfo, addFace };
