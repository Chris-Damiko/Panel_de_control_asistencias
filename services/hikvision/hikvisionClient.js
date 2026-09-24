const { mode } = require('../../config/hikvisionConfig');
const isapiAdapter = require('./isapiAdapter');
const openApiAdapter = require('./openApiAdapter');
const simulatedAdapter = require('./simulatedAdapter');

const ADAPTERS = { isapi: isapiAdapter, openapi: openApiAdapter, simulated: simulatedAdapter };
const adapter = ADAPTERS[mode] || isapiAdapter;

module.exports = {
  mode,
  addOrUpdatePerson: (person) => adapter.addOrUpdatePerson(person),
  getDeviceInfo: adapter.getDeviceInfo || (() => Promise.reject(new Error('getDeviceInfo no soportado en modo ' + mode))),
  addFace: adapter.addFace || (() => Promise.reject(new Error('addFace no soportado en modo ' + mode))),
};
