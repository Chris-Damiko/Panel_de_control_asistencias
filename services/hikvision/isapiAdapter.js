const axios = require('axios');
const config = require('../../config/hikvisionConfig').isapi;

function baseUrl() {
  return `http://${config.host}:${config.port}`;
}

// DS-K1T320MFX exige digest auth, no basic. axios "auth" no hace digest;
// pendiente envolver con retry manual del challenge WWW-Authenticate o usar http-digest-client.
function client() {
  return axios.create({
    baseURL: baseUrl(),
    auth: { username: config.user, password: config.password },
    headers: { 'Content-Type': 'application/json' },
    timeout: 10000,
  });
}

async function addOrUpdatePerson(person) {
  const body = {
    UserInfo: {
      employeeNo: person.employee_no,
      name: person.name,
      userType: 'normal',
      Valid: { enable: true, beginTime: '2020-01-01T00:00:00', endTime: '2037-12-31T23:59:59' },
      gender: person.gender === 'female' ? 'female' : 'male',
    },
  };

  const { data } = await client().put('/ISAPI/AccessControl/UserInfo/Record?format=json', body);
  return data;
}

async function getDeviceInfo() {
  const { data } = await client().get('/ISAPI/System/deviceInfo?format=json');
  return data;
}

// Enrolamiento facial vía ISAPI: endpoint y forma exacta varían por firmware/terminal
// y no fueron verificados contra el DS-K1T320MFX real. Además hereda la misma
// limitación de digest auth que addOrUpdatePerson (arriba) - pendiente antes de usar
// en producción.
async function addFace(employeeNo, photoBuffer, mimeType = 'image/jpeg') {
  const form = new FormData();
  form.append(
    'FaceDataRecord',
    new Blob([JSON.stringify({ faceLibType: 'blackFD', FDID: '1', FPID: String(employeeNo) })], {
      type: 'application/json',
    })
  );
  form.append('img', new Blob([photoBuffer], { type: mimeType }), `${employeeNo}.jpg`);

  const basicAuth = Buffer.from(`${config.user}:${config.password}`).toString('base64');
  const res = await fetch(`${baseUrl()}/ISAPI/Intelligent/FDLib/FDSetUp?format=json`, {
    method: 'POST',
    headers: { Authorization: `Basic ${basicAuth}` },
    body: form,
  });
  if (!res.ok) throw new Error(`ISAPI addFace HTTP ${res.status}`);
  return res.json();
}

module.exports = { addOrUpdatePerson, getDeviceInfo, addFace };
