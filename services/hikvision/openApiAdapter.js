const axios = require('axios');
const crypto = require('crypto');
const config = require('../../config/hikvisionConfig').openapi;

function baseUrl() {
  return `https://${config.host}:${config.port}`;
}

// Firma HMAC-SHA256 requerida por Artemis: string-to-sign = METHOD\nAccept\nContent-Type\nHeaders-x-ca-*\nPATH
function sign(method, path, headers) {
  const stringToSign = [
    method.toUpperCase(),
    headers.Accept,
    headers['Content-Type'],
    `x-ca-key:${config.appKey}`,
    path,
  ].join('\n');

  return crypto.createHmac('sha256', config.appSecret).update(stringToSign).digest('base64');
}

function buildHeaders(method, path) {
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-Ca-Key': config.appKey,
    'X-Ca-Timestamp': Date.now().toString(),
  };
  headers['X-Ca-Signature'] = sign(method, path, {
    Accept: headers.Accept,
    'Content-Type': headers['Content-Type'],
  });
  return headers;
}

async function addOrUpdatePerson(person) {
  const path = '/artemis/api/resource/v1/person/single/add';
  const body = {
    personCode: person.employee_no,
    personName: person.name,
    orgIndexCode: person.org_index_code,
    gender: person.gender === 'female' ? 2 : 1,
  };

  const { data } = await axios.post(baseUrl() + path, body, {
    headers: buildHeaders('POST', path),
    httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }),
    timeout: 10000,
  });
  return data;
}

// Registro facial vía Artemis: llamada separada al alta de persona.
async function addFace(personCode, photoBuffer) {
  const path = '/artemis/api/resource/v1/face/single/addFace';
  const body = {
    personCode,
    faceData: photoBuffer.toString('base64'),
  };

  const { data } = await axios.post(baseUrl() + path, body, {
    headers: buildHeaders('POST', path),
    httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }),
    timeout: 15000,
  });
  return data;
}

module.exports = { addOrUpdatePerson, addFace };
