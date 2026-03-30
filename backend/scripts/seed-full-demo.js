#!/usr/bin/env node
/**
 * AXEL - Comprehensive Seed Script
 * Generates 25 clients + 60 quotes covering ALL possible scenarios
 *
 * Run: node scripts/seed-full-demo.js
 * Location on EC2: /opt/axel/backend/scripts/seed-full-demo.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const crypto = require('crypto');

// ─── Models ───────────────────────────────────────────────────────────────────
const User = require('../src/models/User');
const Client = require('../src/models/Client');
const Quote = require('../src/models/Quote');

// ─── Config ───────────────────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/axel';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(Math.floor(Math.random() * 10) + 8, Math.floor(Math.random() * 60), 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min, max, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateQuoteId(index, date) {
  const hex = crypto.randomBytes(3).toString('hex').toUpperCase();
  const year = date.getFullYear();
  return `AXL-${year}-${hex}${String(index).padStart(2, '0')}`;
}

// ─── Route Data ───────────────────────────────────────────────────────────────
const ROUTES = [
  // Spain -> France
  { origin: 'Madrid, ES', destination: 'Paris, FR', distance: 1270, days: 2, countries: ['ES', 'FR'] },
  { origin: 'Barcelona, ES', destination: 'Lyon, FR', distance: 640, days: 1, countries: ['ES', 'FR'] },
  { origin: 'Valencia, ES', destination: 'Marseille, FR', distance: 830, days: 1, countries: ['ES', 'FR'] },
  { origin: 'Bilbao, ES', destination: 'Bordeaux, FR', distance: 470, days: 1, countries: ['ES', 'FR'] },
  // Spain -> Germany
  { origin: 'Madrid, ES', destination: 'Frankfurt, DE', distance: 1870, days: 3, countries: ['ES', 'FR', 'DE'] },
  { origin: 'Barcelona, ES', destination: 'Munich, DE', distance: 1400, days: 2, countries: ['ES', 'FR', 'DE'] },
  { origin: 'Valencia, ES', destination: 'Hamburg, DE', distance: 2200, days: 3, countries: ['ES', 'FR', 'DE'] },
  { origin: 'Zaragoza, ES', destination: 'Stuttgart, DE', distance: 1450, days: 2, countries: ['ES', 'FR', 'DE'] },
  // Spain -> Italy
  { origin: 'Barcelona, ES', destination: 'Milan, IT', distance: 1000, days: 2, countries: ['ES', 'FR', 'IT'] },
  { origin: 'Valencia, ES', destination: 'Rome, IT', distance: 1800, days: 3, countries: ['ES', 'FR', 'IT'] },
  { origin: 'Madrid, ES', destination: 'Turin, IT', distance: 1450, days: 2, countries: ['ES', 'FR', 'IT'] },
  { origin: 'Sevilla, ES', destination: 'Naples, IT', distance: 2300, days: 3, countries: ['ES', 'FR', 'IT'] },
  // Spain -> Benelux
  { origin: 'Madrid, ES', destination: 'Amsterdam, NL', distance: 1750, days: 2, countries: ['ES', 'FR', 'BE', 'NL'] },
  { origin: 'Barcelona, ES', destination: 'Brussels, BE', distance: 1150, days: 2, countries: ['ES', 'FR', 'BE'] },
  { origin: 'Valencia, ES', destination: 'Rotterdam, NL', distance: 1900, days: 3, countries: ['ES', 'FR', 'BE', 'NL'] },
  // Spain -> Portugal
  { origin: 'Madrid, ES', destination: 'Lisbon, PT', distance: 620, days: 1, countries: ['ES', 'PT'] },
  { origin: 'Sevilla, ES', destination: 'Porto, PT', distance: 480, days: 1, countries: ['ES', 'PT'] },
  // Spain -> UK
  { origin: 'Barcelona, ES', destination: 'London, UK', distance: 1500, days: 3, countries: ['ES', 'FR', 'UK'] },
  { origin: 'Bilbao, ES', destination: 'Manchester, UK', distance: 1350, days: 3, countries: ['ES', 'FR', 'UK'] },
  // Long haul
  { origin: 'Madrid, ES', destination: 'Warsaw, PL', distance: 2900, days: 4, countries: ['ES', 'FR', 'DE', 'PL'] },
  { origin: 'Barcelona, ES', destination: 'Prague, CZ', distance: 1700, days: 3, countries: ['ES', 'FR', 'DE', 'CZ'] },
  { origin: 'Valencia, ES', destination: 'Copenhagen, DK', distance: 2500, days: 4, countries: ['ES', 'FR', 'DE', 'DK'] },
  { origin: 'Sevilla, ES', destination: 'Vienna, AT', distance: 2600, days: 4, countries: ['ES', 'FR', 'DE', 'AT'] },
  // Extra routes for variety
  { origin: 'Malaga, ES', destination: 'Berlin, DE', distance: 2400, days: 3, countries: ['ES', 'FR', 'DE'] },
  { origin: 'Zaragoza, ES', destination: 'Zurich, CH', distance: 1100, days: 2, countries: ['ES', 'FR', 'CH'] },
];

const CARGO_TYPES = [
  { type: 'general', description: 'Mercancia general paletizada', weight: [2000, 24000], value: [15000, 120000] },
  { type: 'forestales', description: 'Tablones de madera de pino tratada', weight: [8000, 24000], value: [20000, 80000] },
  { type: 'forestales', description: 'Pellets de biomasa', weight: [15000, 24000], value: [10000, 40000] },
  { type: 'adr', description: 'Productos quimicos industriales Clase 3', weight: [5000, 18000], value: [30000, 150000] },
  { type: 'adr', description: 'Pinturas y disolventes inflamables', weight: [3000, 12000], value: [25000, 90000] },
  { type: 'refrigerado', description: 'Productos lacteos refrigerados', weight: [8000, 20000], value: [40000, 120000] },
  { type: 'refrigerado', description: 'Frutas y verduras frescas de temporada', weight: [10000, 22000], value: [30000, 90000] },
  { type: 'especial', description: 'Maquinaria industrial sobredimensionada', weight: [15000, 30000], value: [100000, 500000] },
  { type: 'especial', description: 'Vehiculos de alta gama en portacoches', weight: [12000, 20000], value: [200000, 800000] },
  { type: 'general', description: 'Electrodomesticos en pallets', weight: [5000, 18000], value: [30000, 150000] },
  { type: 'general', description: 'Textiles y confeccion', weight: [3000, 12000], value: [20000, 100000] },
  { type: 'general', description: 'Material de construccion', weight: [10000, 24000], value: [15000, 60000] },
  { type: 'general', description: 'Productos alimenticios no perecederos', weight: [8000, 22000], value: [25000, 80000] },
  { type: 'general', description: 'Componentes electronicos', weight: [2000, 8000], value: [50000, 300000] },
  { type: 'general', description: 'Mobiliario de oficina', weight: [4000, 15000], value: [20000, 70000] },
  { type: 'general', description: 'Vinos y bebidas en pallets', weight: [10000, 24000], value: [30000, 120000] },
];

const RESTRICTION_ALERTS = {
  FR: ['Prohibicion circulacion domingos y festivos en Francia', 'Eco-taxe en autopistas francesas', 'Zona baja emision Lyon/Paris'],
  DE: ['Restriccion circulacion domingos en Alemania', 'LKW-Maut obligatorio en autopistas alemanas', 'Umweltzone en ciudades alemanas'],
  IT: ['Divieto di transito festivos en Italia', 'Telepass obligatorio en peajes italianos'],
  BE: ['Eco-taxe Kilometerheffing en Belgica', 'Zona baja emision Bruselas/Amberes'],
  NL: ['Milieuzone en ciudades holandesas'],
  AT: ['GO-Maut obligatorio en Austria', 'Restriccion nocturna en Tirol (Inntal)'],
  CH: ['LSVA - tasa transito pesados Suiza', 'Prohibicion circulacion nocturna 22h-05h'],
  UK: ['Requiere documentacion Brexit post-2021', 'ULEZ Londres zona ultra baja emision', 'Reserva Eurotunnel/ferry necesaria'],
  PL: ['e-TOLL sistema electronico peajes Polonia'],
  CZ: ['Vigneta electronica obligatoria Republica Checa'],
  DK: ['Peaje puente Oresund/Storebaelt'],
  PT: ['Via Verde electronic toll Portugal'],
};

// ─── Client Definitions ──────────────────────────────────────────────────────
const CLIENT_DEFS = [
  { name: 'Antonio Garcia', company: 'Transportes Ibericos SL', email: 'antonio@transportesibericos.es', phone: '+34 91 234 5678', address: 'Calle Gran Via 45, 2o', city: 'Madrid', taxId: 'B28345612' },
  { name: 'Carmen Lopez', company: 'Maderas del Norte SA', email: 'carmen@maderasdelnorte.es', phone: '+34 94 567 8901', address: 'Avenida Sabino Arana 12', city: 'Bilbao', taxId: 'A48123456' },
  { name: 'Miguel Fernandez', company: 'Vinos Rioja Export SL', email: 'miguel@vinosriojaexport.es', phone: '+34 941 234 567', address: 'Carretera de Logrono km 3', city: 'Logrono', taxId: 'B26789012' },
  { name: 'Laura Martinez', company: 'Frescos del Levante SL', email: 'laura@frescoslevante.es', phone: '+34 96 345 6789', address: 'Poligono Industrial Fuente del Jarro 8', city: 'Valencia', taxId: 'B46234567' },
  { name: 'Pedro Sanchez', company: 'Quimica Industrial Tarragona SA', email: 'pedro@quitarragona.es', phone: '+34 977 123 456', address: 'Poligono Petroquimico Sur, Nave 15', city: 'Tarragona', taxId: 'A43567890' },
  { name: 'Isabel Rodriguez', company: 'Aceitunas del Sur SL', email: 'isabel@aceitunassur.es', phone: '+34 95 678 9012', address: 'Calle Betis 78', city: 'Sevilla', taxId: 'B41345678' },
  { name: 'Francisco Moreno', company: 'Muebles Zaragoza SA', email: 'francisco@muebleszaragoza.es', phone: '+34 976 234 567', address: 'Poligono Cogullada Nave 32', city: 'Zaragoza', taxId: 'A50123456' },
  { name: 'Ana Jimenez', company: 'Textil Mediterraneo SL', email: 'ana@textilmediterraneo.es', phone: '+34 93 456 7890', address: 'Carrer de la Industria 156', city: 'Barcelona', taxId: 'B08678901' },
  { name: 'Roberto Diaz', company: 'Maquinaria Pesada Iberica SA', email: 'roberto@mpiberica.es', phone: '+34 91 567 8901', address: 'Avenida de la Industria 23', city: 'Madrid', taxId: 'A28901234' },
  { name: 'Elena Navarro', company: 'Costa Sol Exports SL', email: 'elena@costasol.es', phone: '+34 95 234 5678', address: 'Paseo Maritimo 45', city: 'Malaga', taxId: 'B29567890' },
  { name: 'Hans Mueller', company: 'Deutsche Import GmbH', email: 'hans@deutscheimport.de', phone: '+49 69 123 4567', address: 'Industriestrasse 22', city: 'Frankfurt', country: 'DE', taxId: 'DE123456789' },
  { name: 'Pierre Dubois', company: 'France Logistics SARL', email: 'pierre@francelogistics.fr', phone: '+33 1 23 45 67 89', address: '15 Rue de la Logistique', city: 'Paris', country: 'FR', taxId: 'FR12345678901' },
  { name: 'Marco Rossi', company: 'Italia Express SRL', email: 'marco@italiaexpress.it', phone: '+39 02 1234 5678', address: 'Via della Spedizione 8', city: 'Milan', country: 'IT', taxId: 'IT12345678901' },
  { name: 'Jan Van der Berg', company: 'Holland Trade BV', email: 'jan@hollandtrade.nl', phone: '+31 20 123 4567', address: 'Havenweg 34', city: 'Rotterdam', country: 'NL', taxId: 'NL123456789B01' },
  { name: 'David Ruiz', company: 'Construcciones Mediterraneas SL', email: 'david@constmed.es', phone: '+34 96 789 0123', address: 'Calle del Puerto 67', city: 'Valencia', taxId: 'B46890123' },
  { name: 'Sofia Hernandez', company: 'Electronica Avanzada SL', email: 'sofia@electronicaavanzada.es', phone: '+34 93 890 1234', address: 'Carrer de la Tecnologia 88', city: 'Barcelona', taxId: 'B08345678' },
  { name: 'Javier Gutierrez', company: 'Agro Export Andalucia SA', email: 'javier@agroexport.es', phone: '+34 95 012 3456', address: 'Carretera Nacional IV km 550', city: 'Sevilla', taxId: 'A41678901' },
  { name: 'Maria Perez', company: 'Farmaceutica del Norte SL', email: 'maria.perez@farmanorte.es', phone: '+34 94 345 6789', address: 'Parque Tecnologico 14', city: 'Bilbao', taxId: 'B48567890' },
  { name: 'Carlos Romero', company: 'Auto Parts Europa SL', email: 'carlos@autopartseuropa.es', phone: '+34 91 678 9012', address: 'Poligono Las Mercedes Nave 45', city: 'Madrid', taxId: 'B28567890' },
  { name: 'Teresa Gil', company: 'Ceramicas Manises SL', email: 'teresa@ceramicasmanises.es', phone: '+34 96 123 4567', address: 'Avenida de la Ceramica 12', city: 'Valencia', taxId: 'B46012345' },
  { name: 'Paulo Silva', company: 'Iberia Cork Lda', email: 'paulo@iberiacork.pt', phone: '+351 21 123 4567', address: 'Rua da Cortica 45', city: 'Lisbon', country: 'PT', taxId: 'PT123456789' },
  { name: 'Ricardo Alonso', company: 'Bebidas Premium Espana SL', email: 'ricardo@bebidaspremium.es', phone: '+34 941 567 890', address: 'Poligono La Portalada 23', city: 'Logrono', taxId: 'B26345678' },
  { name: 'Lucia Dominguez', company: 'Plasticos Reciclados SA', email: 'lucia@plasticosreciclados.es', phone: '+34 976 678 901', address: 'Calle Industria 56', city: 'Zaragoza', taxId: 'A50678901' },
  { name: 'Alberto Torres', company: 'Calzado Levantino SL', email: 'alberto@calzadolevantino.es', phone: '+34 96 567 8901', address: 'Avenida del Calzado 34', city: 'Elche', taxId: 'B03234567' },
  { name: 'Beatriz Molina', company: 'Energia Solar del Sur SL', email: 'beatriz@energiasolarsur.es', phone: '+34 95 890 1234', address: 'Parque Empresarial 9', city: 'Malaga', taxId: 'B29012345' },
];

// ─── Quote Status Distribution ─────────────────────────────────────────────
// accepted: 15, pending(sent): 12, rejected: 8, expired: 5, negotiating: 8, draft: 5, generated(active): 7 = 60

const STATUS_DISTRIBUTION = [
  ...Array(15).fill('accepted'),
  ...Array(12).fill('sent'),
  ...Array(8).fill('rejected'),
  ...Array(5).fill('expired'),
  ...Array(8).fill('negotiating'),
  ...Array(5).fill('draft'),
  ...Array(7).fill('active'),
];

// Date distribution: month -6: 3, -5: 5, -4: 7, -3: 10, -2: 15, -1: 20 = 60
const DATE_DISTRIBUTION = [
  ...Array(3).fill(180),  // ~6 months ago
  ...Array(5).fill(150),  // ~5 months ago
  ...Array(7).fill(120),  // ~4 months ago
  ...Array(10).fill(90),  // ~3 months ago
  ...Array(15).fill(60),  // ~2 months ago
  ...Array(20).fill(30),  // ~1 month ago / current
];

const REJECTION_REASONS = [
  'Precio elevado comparado con otros proveedores',
  'Encontraron mejor oferta en la competencia',
  'Plazo de entrega demasiado largo',
  'El cliente decidio posponer el envio',
  'Cambio de proveedor de transporte',
  'Presupuesto interno reducido este trimestre',
  'Requisitos de seguro no cubiertos',
  'Ruta alternativa mas economica encontrada',
];

const NEGOTIATION_CLIENT_MSGS = [
  'Necesitamos mejor precio para volumen regular mensual',
  'Nuestro presupuesto maximo es un 15% menos, hay margen?',
  'Si firmamos contrato anual, que descuento podeis ofrecer?',
  'Hemos recibido oferta mas baja, podeis igualar?',
  'Para 3 envios mensuales, que precio por envio?',
  'Necesitamos incluir seguro completo en ese precio',
  'El precio esta bien pero necesitamos entrega express',
  'Podemos ajustar si eliminamos el seguro adicional?',
];

const NEGOTIATION_AGENT_MSGS = [
  'Podemos ofrecer descuento del 8% por contrato anual',
  'Ajustamos precio un 5% manteniendo todas las coberturas',
  'Para volumen regular ofrecemos tarifa preferente -10%',
  'Incluimos seguro completo sin coste adicional por contrato',
  'Ofrecemos precio intermedio con entrega en plazo standard',
  'Podemos hacer -7% si confirman antes de fin de mes',
  'Ajustamos la ruta para reducir peajes, nuevo precio mas competitivo',
  'Ofrecemos tarifa grupaje que reduce coste significativamente',
];

// ─── Main Seed Function ──────────────────────────────────────────────────────
async function seed() {
  console.log('============================================');
  console.log('  AXEL - Full Demo Seed Script');
  console.log('============================================\n');

  // Connect
  await mongoose.connect(MONGO_URI);
  console.log(`Conectado a: ${MONGO_URI}\n`);

  // ─── Step 1: Look up existing users ─────────────────────────────────
  console.log('--- Paso 1: Buscando usuarios existentes ---');
  const luis = await User.findOne({ email: 'luis@axel.es' });
  const jenifer = await User.findOne({ email: 'jenifer.romero@strixai.es' });
  const rodrigo = await User.findOne({ email: 'rodrigo.godoy@strixai.es' });

  if (!luis || !jenifer || !rodrigo) {
    const missing = [];
    if (!luis) missing.push('luis@axel.es');
    if (!jenifer) missing.push('jenifer.romero@strixai.es');
    if (!rodrigo) missing.push('rodrigo.godoy@strixai.es');
    console.error(`ERROR: Usuarios base no encontrados: ${missing.join(', ')}`);
    console.error('Ejecuta primero seed-users.js para crear los usuarios base.');
    process.exit(1);
  }

  console.log(`  Luis: ${luis._id} (${luis.role})`);
  console.log(`  Jenifer: ${jenifer._id} (${jenifer.role})`);
  console.log(`  Rodrigo: ${rodrigo._id} (${rodrigo.role})\n`);

  // ─── Step 2: Create/find additional users ───────────────────────────
  console.log('--- Paso 2: Creando/buscando agentes adicionales ---');

  const newUserDefs = [
    { firstName: 'Maria', lastName: 'Torres', email: 'maria.torres@axel.es', role: 'agente_comercial', department: 'Comercial', phone: '+34 612 345 678' },
    { firstName: 'Pablo', lastName: 'Mendez', email: 'pablo.mendez@axel.es', role: 'agente_comercial', department: 'Comercial', phone: '+34 623 456 789' },
    { firstName: 'Elena', lastName: 'Vidal', email: 'elena.vidal@axel.es', role: 'agente_comercial', department: 'Comercial', phone: '+34 634 567 890' },
    { firstName: 'Carlos', lastName: 'Ruiz', email: 'carlos.ruiz@axel.es', role: 'supervisor', department: 'Comercial', phone: '+34 645 678 901' },
  ];

  const additionalUsers = [];
  for (const def of newUserDefs) {
    let user = await User.findOne({ email: def.email });
    if (!user) {
      user = new User({
        ...def,
        password: 'Axel2026',
        isActive: true,
        emailVerified: true,
        tenantId: luis.tenantId,
        preferences: { language: 'es', theme: 'light', emailNotifications: true, dashboardLayout: 'standard' },
        metrics: { totalQuotes: 0, acceptedQuotes: 0, totalRevenue: 0, averageQuoteValue: 0, conversionRate: 0 }
      });
      await user.save();
      console.log(`  Creado: ${def.firstName} ${def.lastName} (${def.role})`);
    } else {
      console.log(`  Ya existe: ${def.firstName} ${def.lastName} (${def.role})`);
    }
    additionalUsers.push(user);
  }

  const [maria, pablo, elena, carlos] = additionalUsers;

  // Set supervisor relationships
  carlos.managedAgents = [maria._id, pablo._id, elena._id];
  await carlos.save();
  for (const agent of [maria, pablo, elena]) {
    agent.supervisorId = carlos._id;
    await agent.save();
  }

  // All available agents for assignment
  const allUsers = { luis, jenifer, rodrigo, maria, pablo, elena, carlos };
  // Weight distribution: Maria & Pablo most, Elena fewer, gerencia some
  const agentPool = [
    ...Array(12).fill(maria),
    ...Array(12).fill(pablo),
    ...Array(6).fill(elena),
    ...Array(4).fill(luis),
    ...Array(3).fill(jenifer),
    ...Array(3).fill(rodrigo),
    ...Array(4).fill(carlos),
  ];

  console.log('');

  // ─── Step 3: Delete existing quotes and clients ─────────────────────
  console.log('--- Paso 3: Limpiando datos existentes ---');
  const deletedQuotes = await Quote.deleteMany({});
  const deletedClients = await Client.deleteMany({});
  console.log(`  Eliminadas ${deletedQuotes.deletedCount} cotizaciones`);
  console.log(`  Eliminados ${deletedClients.deletedCount} clientes\n`);

  // ─── Step 4: Create clients ─────────────────────────────────────────
  console.log('--- Paso 4: Creando 25 clientes ---');
  const clients = [];
  const clientCreators = [maria, pablo, elena, luis, jenifer, carlos, rodrigo];

  for (let i = 0; i < CLIENT_DEFS.length; i++) {
    const def = CLIENT_DEFS[i];
    const creator = clientCreators[i % clientCreators.length];
    const client = await Client.create({
      tenantId: luis.tenantId,
      name: def.name,
      company: def.company,
      email: def.email,
      phone: def.phone,
      address: def.address,
      city: def.city,
      country: def.country || 'ES',
      taxId: def.taxId,
      notes: i < 5 ? 'Cliente frecuente, prioridad alta' : (i < 15 ? 'Cliente regular' : 'Cliente nuevo'),
      isActive: true,
      createdBy: creator._id,
      totalQuotes: 0,
      totalRevenue: 0
    });
    clients.push(client);
  }
  console.log(`  Creados ${clients.length} clientes\n`);

  // ─── Step 5: Create 60 quotes ───────────────────────────────────────
  console.log('--- Paso 5: Creando 60 cotizaciones ---');

  // Shuffle status distribution
  const statuses = [...STATUS_DISTRIBUTION].sort(() => Math.random() - 0.5);
  const quotes = [];
  let ftlCount = 0;
  let ltlCount = 0;

  for (let i = 0; i < 60; i++) {
    const status = statuses[i];
    const route = ROUTES[i % ROUTES.length];
    const cargoInfo = CARGO_TYPES[i % CARGO_TYPES.length];
    const client = clients[i % clients.length];
    const agent = agentPool[i % agentPool.length];

    // Date: spread over 6 months with more recent
    const baseDaysAgo = DATE_DISTRIBUTION[i];
    const jitter = rand(-10, 10);
    const createdDate = daysAgo(Math.max(1, baseDaysAgo + jitter));

    // Transport type: target 40 FTL, 20 LTL
    let transportType;
    if (ltlCount >= 20) {
      transportType = 'FTL';
    } else if (ftlCount >= 40) {
      transportType = 'LTL';
    } else {
      transportType = i % 3 === 0 ? 'LTL' : 'FTL';
    }
    if (transportType === 'FTL') ftlCount++; else ltlCount++;

    // Weight & value
    const weight = rand(cargoInfo.weight[0], cargoInfo.weight[1]);
    const cargoValue = rand(cargoInfo.value[0], cargoInfo.value[1]);
    const volume = Math.round(weight / rand(250, 450));
    const linearMeters = transportType === 'FTL' ? randFloat(10, 13.6) : randFloat(2, 8);

    // Cost calculation
    const ratePerKm = randFloat(0.85, 1.20);
    const distanceRate = parseFloat((route.distance * ratePerKm).toFixed(2));
    const fuelCost = parseFloat((route.distance * 0.35).toFixed(2));
    const tollBase = route.countries.length * rand(80, 200);
    const tollCost = parseFloat((tollBase + rand(0, 150)).toFixed(2));
    const transitDays = route.days + (transportType === 'LTL' ? 1 : 0);
    const driverCost = parseFloat((transitDays * 180).toFixed(2));
    const vehicleCost = parseFloat((transitDays * 95).toFixed(2));
    const insuranceCost = parseFloat((cargoValue * 0.003).toFixed(2));
    const subtotal = parseFloat((distanceRate + fuelCost + tollCost + driverCost + vehicleCost + insuranceCost).toFixed(2));
    const adjustmentFactor = transportType === 'LTL' ? randFloat(0.45, 0.65) : randFloat(1.0, 1.15);
    const adjustedSubtotal = parseFloat((subtotal * adjustmentFactor).toFixed(2));
    const marginPct = randFloat(0.12, 0.18);
    const margin = parseFloat((adjustedSubtotal * marginPct).toFixed(2));
    const totalWithoutVAT = parseFloat((adjustedSubtotal + margin).toFixed(2));
    const vat = parseFloat((totalWithoutVAT * 0.21).toFixed(2));
    const total = parseFloat((totalWithoutVAT + vat).toFixed(2));

    // Toll breakdown per country
    const tollBreakdown = route.countries.filter(c => c !== 'ES' || route.countries.length === 2).map(c => ({
      country: c,
      cost: parseFloat((tollCost / route.countries.length).toFixed(2)),
      type: 'peaje'
    }));

    // Validity
    let validUntil;
    if (status === 'expired') {
      validUntil = addDays(createdDate, rand(7, 15)); // Already expired
    } else if (status === 'draft') {
      validUntil = addDays(new Date(), rand(15, 30));
    } else {
      validUntil = addDays(new Date(), rand(5, 30));
    }

    // Service preference
    const serviceType = pick(['economico', 'estandar', 'express']);
    const profitMargin = Math.round(marginPct * 100);

    // Alternatives / pricing tiers (for non-draft quotes)
    const alternatives = status !== 'draft' ? [
      {
        name: 'Economica',
        type: 'economico',
        price: parseFloat((total * 0.9).toFixed(2)),
        transitDays: transitDays + 2,
        description: 'Servicio grupaje, plazo flexible'
      },
      {
        name: 'Standard',
        type: 'estandar',
        price: total,
        transitDays: transitDays,
        description: 'Completo standard, cobertura basica'
      },
      {
        name: 'Express',
        type: 'express',
        price: parseFloat((total * 1.3).toFixed(2)),
        transitDays: Math.max(1, transitDays - 1),
        description: 'Express 24-48h, prioridad maxima'
      }
    ] : [];

    // Restrictions & alerts
    const routeAlerts = [];
    for (const country of route.countries) {
      if (RESTRICTION_ALERTS[country]) {
        routeAlerts.push(...RESTRICTION_ALERTS[country].slice(0, rand(1, 2)));
      }
    }
    const adrRequired = cargoInfo.type === 'adr';
    const refrigeratedRequired = cargoInfo.type === 'refrigerado';
    const specialPermits = [];
    if (adrRequired) specialPermits.push('Transporte ADR Clase 3', 'Certificado conductor ADR');
    if (refrigeratedRequired) specialPermits.push('Certificado ATP vehiculo frigorifico');
    if (cargoInfo.type === 'especial') specialPermits.push('Permiso transporte especial', 'Vehiculo piloto requerido');

    // Pickup / delivery schedule
    const pickupDate = addDays(createdDate, rand(2, 7));
    const deliveryEstimated = addDays(pickupDate, transitDays);
    const weekdays = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];

    // Timeline events
    const timeline = [];
    const comms = [];
    const negotiations = [];
    let portalToken = null;
    let portalActive = false;
    let viewCount = 0;
    let lastViewed = null;

    // All quotes start with 'generated'
    timeline.push({
      status: 'generated',
      timestamp: createdDate,
      description: 'Cotizacion generada por AXEL AI',
      performedBy: agent._id.toString()
    });

    if (status !== 'draft' && status !== 'active') {
      // Was sent
      const sentDate = addDays(createdDate, rand(0, 2));
      timeline.push({
        status: 'sent',
        timestamp: sentDate,
        description: 'Cotizacion enviada al cliente por email',
        performedBy: agent._id.toString()
      });
      comms.push({
        type: 'email_sent',
        timestamp: sentDate,
        content: `Cotizacion ${generateQuoteId(i, createdDate)} enviada a ${client.company}`,
        recipient: client.email,
        performedBy: agent._id.toString()
      });

      // Generate portal token for sent/pending/negotiating/accepted
      if (['sent', 'negotiating', 'accepted', 'viewed'].includes(status) || (status === 'sent' && Math.random() > 0.3)) {
        portalToken = crypto.randomBytes(32).toString('hex');
        portalActive = true;
      }

      // Viewed
      if (['accepted', 'rejected', 'negotiating'].includes(status) || (status === 'sent' && Math.random() > 0.5)) {
        const viewedDate = addDays(sentDate, rand(0, 3));
        timeline.push({
          status: 'viewed',
          timestamp: viewedDate,
          description: 'Cliente visualizo la cotizacion por primera vez',
          performedBy: 'client'
        });
        viewCount = rand(1, 5);
        lastViewed = addDays(viewedDate, rand(0, 5));
      }

      // Status-specific events
      if (status === 'accepted') {
        const acceptedDate = addDays(createdDate, rand(3, 15));
        timeline.push({
          status: 'accepted',
          timestamp: acceptedDate,
          description: 'Cliente acepto la cotizacion',
          performedBy: 'client'
        });
        comms.push({
          type: 'client_accepted',
          timestamp: acceptedDate,
          content: `${client.company} acepto la cotizacion`,
          recipient: agent.email,
          performedBy: 'client'
        });
      }

      if (status === 'rejected') {
        const rejectedDate = addDays(createdDate, rand(3, 20));
        const reason = pick(REJECTION_REASONS);
        timeline.push({
          status: 'rejected',
          timestamp: rejectedDate,
          description: reason,
          performedBy: 'client'
        });
        comms.push({
          type: 'client_rejected',
          timestamp: rejectedDate,
          content: `${client.company} rechazo la cotizacion. Motivo: ${reason}`,
          recipient: agent.email,
          performedBy: 'client'
        });
      }

      if (status === 'expired') {
        timeline.push({
          status: 'expired',
          timestamp: validUntil,
          description: 'Cotizacion expirada por superacion de fecha de validez',
          performedBy: 'system'
        });
      }

      if (status === 'negotiating') {
        // Client counter-offer
        const negoDate1 = addDays(createdDate, rand(3, 10));
        const clientMsg = pick(NEGOTIATION_CLIENT_MSGS);
        const clientPrice = parseFloat((total * randFloat(0.82, 0.90)).toFixed(2));

        negotiations.push({
          proposedPrice: clientPrice,
          proposedChanges: { requestedDiscount: true },
          proposedBy: 'client',
          timestamp: negoDate1,
          status: 'pending',
          notes: clientMsg
        });

        timeline.push({
          status: 'negotiating',
          timestamp: negoDate1,
          description: 'Nueva propuesta de negociacion del cliente',
          performedBy: 'client'
        });

        comms.push({
          type: 'client_negotiation',
          timestamp: negoDate1,
          content: clientMsg,
          recipient: agent.email,
          performedBy: 'client'
        });

        // Some have agent counter-response
        if (Math.random() > 0.4) {
          const negoDate2 = addDays(negoDate1, rand(1, 3));
          const agentMsg = pick(NEGOTIATION_AGENT_MSGS);
          const agentPrice = parseFloat((total * randFloat(0.90, 0.95)).toFixed(2));

          negotiations[0].status = 'rejected'; // First one rejected
          negotiations.push({
            proposedPrice: agentPrice,
            proposedChanges: { counterOffer: true },
            proposedBy: 'commercial',
            timestamp: negoDate2,
            status: 'pending',
            notes: agentMsg
          });

          timeline.push({
            status: 'negotiating',
            timestamp: negoDate2,
            description: 'Contraoferta del agente comercial',
            performedBy: agent._id.toString()
          });

          comms.push({
            type: 'negotiation',
            timestamp: negoDate2,
            content: agentMsg,
            recipient: client.email,
            performedBy: agent._id.toString()
          });
        }

        portalToken = portalToken || crypto.randomBytes(32).toString('hex');
        portalActive = true;
      }
    }

    // Map internal status to schema status
    // Schema enum: 'draft', 'active', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'negotiating'
    // 'active' = generated, 'sent' = pending (sent to client)
    const quoteStatus = status; // already matches schema enum

    const quoteId = generateQuoteId(i, createdDate);

    const quoteData = {
      tenantId: luis.tenantId,
      quoteId,
      route: {
        origin: route.origin,
        destination: route.destination,
        distance: route.distance,
        estimatedTransitDays: transitDays,
        countries: route.countries
      },
      cargo: {
        type: cargoInfo.type,
        weight,
        volume,
        value: cargoValue,
        description: cargoInfo.description,
        linearMeters,
        transportType,
        utilization: transportType === 'FTL'
          ? { percentage: randFloat(75, 98), status: 'optimal' }
          : { percentage: randFloat(20, 55), status: 'partial', sharedWith: rand(1, 3) },
        calculatedFromPallets: Math.random() > 0.5,
        calculatedPricing: transportType === 'LTL'
          ? { palletSpots: rand(4, 16), pricePerPallet: parseFloat((total / rand(4, 16)).toFixed(2)) }
          : null
      },
      costBreakdown: {
        distanceRate,
        fuelCost,
        tollCost,
        tollBreakdown,
        driverCost,
        vehicleCost,
        subtotal: adjustedSubtotal,
        adjustmentFactor,
        margin,
        totalWithoutVAT,
        vat,
        total,
        ltlFtlDetails: transportType === 'LTL'
          ? { type: 'LTL', factor: adjustmentFactor, ftlEquivalent: subtotal }
          : { type: 'FTL', factor: adjustmentFactor }
      },
      alternatives,
      schedule: {
        pickup: {
          date: pickupDate,
          weekday: weekdays[pickupDate.getDay()],
          formatted: pickupDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
        },
        delivery: {
          estimated: deliveryEstimated,
          earliest: addDays(pickupDate, Math.max(1, transitDays - 1)),
          latest: addDays(pickupDate, transitDays + 1),
          weekday: weekdays[deliveryEstimated.getDay()],
          formatted: deliveryEstimated.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }),
          window: `${transitDays - 1}-${transitDays + 1} dias`
        },
        transitDays,
        businessDays: transitDays,
        confidence: randFloat(0.85, 0.98),
        analysis: { factors: ['trafico', 'restricciones horarias', 'aduanas'], risk: pick(['bajo', 'medio']) }
      },
      intelligence: {
        sourcesConsulted: rand(3, 8),
        recommendedTransportist: pick(['Transportes Garcia', 'Logistica Europa', 'Trans-Iberia', 'Euro Freight', 'MedTrans']),
        usedAI: true,
        processingTime: rand(2000, 8000),
        luc1Reasoning: `Ruta optimizada ${route.origin} -> ${route.destination} via ${route.countries.join('-')}. ${transportType === 'LTL' ? 'Grupaje recomendado por volumen parcial.' : 'Camion completo por volumen de carga.'}`,
        luc1RestrictionsImpact: routeAlerts.length > 0 ? `${routeAlerts.length} restricciones detectadas en la ruta` : 'Sin restricciones significativas',
        luc1RestrictionsRecommendations: routeAlerts.slice(0, 2),
        ltlFtlUsed: transportType,
        commercialMargin: profitMargin,
        marginSource: 'configuracion_usuario',
        routeSource: 'openroute_api',
        routeConfidence: randFloat(0.90, 0.99),
        tollSource: 'toll_database_v2',
        tollConfidence: randFloat(0.85, 0.95),
        restrictionsSource: 'eu_restrictions_db',
        countries: route.countries.length
      },
      alerts: routeAlerts.map(a => ({ message: a, severity: pick(['info', 'warning', 'critical']), country: pick(route.countries) })),
      restrictionsAnalysis: {
        totalAlerts: routeAlerts.length,
        summary: { info: routeAlerts.length > 2 ? 2 : routeAlerts.length, warning: Math.min(1, routeAlerts.length), critical: adrRequired ? 1 : 0 },
        criticalRestrictions: adrRequired ? [{ type: 'ADR', description: 'Transporte de mercancias peligrosas requiere permisos especiales' }] : [],
        affectedCountries: route.countries,
        source: 'eu_restrictions_db'
      },
      client: {
        company: client.company,
        email: client.email,
        contactName: client.name,
        phone: client.phone
      },
      preferences: {
        serviceType,
        profitMargin
      },
      requirements: {
        insurance: cargoValue > 50000 || Math.random() > 0.3,
        tracking: Math.random() > 0.2,
        signature: Math.random() > 0.5
      },
      validUntil,
      confidence: randFloat(0.80, 0.98),
      status: quoteStatus,
      tracking: {
        timeline,
        clientAccess: portalToken ? {
          token: portalToken,
          accessUrl: `/portal/quote/${portalToken}`,
          viewCount,
          lastViewed,
          isActive: portalActive
        } : {
          viewCount: 0,
          isActive: false
        },
        communications: comms,
        assignedTo: agent._id.toString(),
        negotiations
      },
      createdAt: createdDate,
      updatedAt: status === 'draft' ? createdDate : addDays(createdDate, rand(1, 10)),
      createdBy: agent._id.toString(),
      searchTags: [
        route.origin.toLowerCase(),
        route.destination.toLowerCase(),
        cargoInfo.type,
        serviceType,
        ...route.countries.map(c => c.toLowerCase()),
        client.company.toLowerCase(),
        quoteId.toLowerCase()
      ]
    };

    const quote = await Quote.create(quoteData);
    quotes.push(quote);

    const icon = { draft: '📝', active: '🟢', sent: '📤', accepted: '✅', rejected: '❌', expired: '⏰', negotiating: '🤝', viewed: '👁' };
    process.stdout.write(`  ${icon[status] || '•'} ${quoteId} | ${status.padEnd(12)} | ${route.origin} -> ${route.destination} | ${total.toFixed(0)}€\n`);
  }

  console.log(`\n  Total creadas: ${quotes.length} cotizaciones`);
  console.log(`  FTL: ${ftlCount} | LTL: ${ltlCount}\n`);

  // ─── Step 6: Update client stats ────────────────────────────────────
  console.log('--- Paso 6: Actualizando estadisticas de clientes ---');
  for (const client of clients) {
    const clientQuotes = quotes.filter(q => q.client.email === client.email);
    const acceptedQuotes = clientQuotes.filter(q => q.status === 'accepted');
    const totalRevenue = acceptedQuotes.reduce((sum, q) => sum + (q.costBreakdown?.total || 0), 0);

    client.totalQuotes = clientQuotes.length;
    client.totalRevenue = parseFloat(totalRevenue.toFixed(2));
    await client.save();

    if (clientQuotes.length > 0) {
      console.log(`  ${client.company}: ${clientQuotes.length} cotizaciones, ${acceptedQuotes.length} aceptadas, ${totalRevenue.toFixed(0)}€ revenue`);
    }
  }
  console.log('');

  // ─── Step 7: Update user metrics ────────────────────────────────────
  console.log('--- Paso 7: Actualizando metricas de agentes ---');
  for (const [name, user] of Object.entries(allUsers)) {
    const userQuotes = quotes.filter(q => q.tracking.assignedTo === user._id.toString());
    const acceptedQuotes = userQuotes.filter(q => q.status === 'accepted');
    const totalRevenue = acceptedQuotes.reduce((sum, q) => sum + (q.costBreakdown?.total || 0), 0);
    const conversionRate = userQuotes.length > 0 ? (acceptedQuotes.length / userQuotes.length) * 100 : 0;
    const averageQuoteValue = acceptedQuotes.length > 0 ? totalRevenue / acceptedQuotes.length : 0;

    user.metrics = {
      totalQuotes: userQuotes.length,
      acceptedQuotes: acceptedQuotes.length,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      averageQuoteValue: parseFloat(averageQuoteValue.toFixed(2)),
      conversionRate: parseFloat(conversionRate.toFixed(1)),
      lastCalculated: new Date()
    };
    await user.save();

    console.log(`  ${user.firstName} ${user.lastName}: ${userQuotes.length} cotizaciones, ${acceptedQuotes.length} aceptadas (${conversionRate.toFixed(1)}%), ${totalRevenue.toFixed(0)}€`);
  }
  console.log('');

  // ─── Summary ────────────────────────────────────────────────────────
  console.log('============================================');
  console.log('  RESUMEN FINAL');
  console.log('============================================');
  console.log(`  Usuarios totales: ${Object.keys(allUsers).length} (3 existentes + 4 nuevos)`);
  console.log(`  Clientes: ${clients.length}`);
  console.log(`  Cotizaciones: ${quotes.length}`);
  console.log('');
  console.log('  Desglose por estado:');

  const statusCounts = {};
  for (const q of quotes) {
    statusCounts[q.status] = (statusCounts[q.status] || 0) + 1;
  }
  for (const [s, c] of Object.entries(statusCounts).sort()) {
    console.log(`    ${s}: ${c}`);
  }

  console.log('');
  console.log('  Desglose por tipo de carga:');
  const cargoCounts = {};
  for (const q of quotes) {
    cargoCounts[q.cargo.type] = (cargoCounts[q.cargo.type] || 0) + 1;
  }
  for (const [t, c] of Object.entries(cargoCounts).sort()) {
    console.log(`    ${t}: ${c}`);
  }

  console.log('');
  console.log('  Desglose por transporte:');
  console.log(`    FTL: ${ftlCount}`);
  console.log(`    LTL: ${ltlCount}`);

  const totalRevAll = quotes.filter(q => q.status === 'accepted').reduce((s, q) => s + (q.costBreakdown?.total || 0), 0);
  console.log('');
  console.log(`  Revenue total (aceptadas): ${totalRevAll.toFixed(2)}€`);
  console.log('');
  console.log('  Nuevos usuarios creados:');
  console.log('    maria.torres@axel.es / Axel2026 (agente_comercial)');
  console.log('    pablo.mendez@axel.es / Axel2026 (agente_comercial)');
  console.log('    elena.vidal@axel.es / Axel2026 (agente_comercial)');
  console.log('    carlos.ruiz@axel.es / Axel2026 (supervisor)');
  console.log('');
  console.log('============================================');
  console.log('  Seed completado correctamente!');
  console.log('============================================');

  await mongoose.disconnect();
  process.exit(0);
}

// ─── Run ──────────────────────────────────────────────────────────────────────
seed().catch(err => {
  console.error('ERROR en seed:', err);
  mongoose.disconnect();
  process.exit(1);
});
