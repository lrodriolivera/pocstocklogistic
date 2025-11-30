/**
 * 🚛 Transportist Adapters - Index
 *
 * Exporta todos los adaptadores de APIs de transportistas
 *
 * @author Stock Logistic Team
 * @version 1.0.0
 */

const BaseTransportistAdapter = require('./BaseTransportistAdapter');
const TimocomAdapter = require('./TimocomAdapter');
const TransEuAdapter = require('./TransEuAdapter');

// TODO: Agregar más adaptadores cuando estén implementados
// const SennderAdapter = require('./SennderAdapter');
// const InstaFreightAdapter = require('./InstaFreightAdapter');
// const CargopediaAdapter = require('./CargopediaAdapter');

module.exports = {
  BaseTransportistAdapter,
  TimocomAdapter,
  TransEuAdapter,
  // SennderAdapter,
  // InstaFreightAdapter,
  // CargopediaAdapter
};