/**
 * Seed script for demo data - populates database with realistic logistics data
 * Run with: node scripts/seed-demo.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// --- Models ---
const User = require('../src/models/User');
const Client = require('../src/models/Client');
const Quote = require('../src/models/Quote');

// --- Configuration ---
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost/axel';

// --- Demo Data ---

const ROUTES = [
  { origin: 'Madrid', destination: 'Paris', distance: 1275, transitDays: 2, countries: ['ES', 'FR'] },
  { origin: 'Barcelona', destination: 'Berlin', distance: 1870, transitDays: 3, countries: ['ES', 'FR', 'DE'] },
  { origin: 'Valencia', destination: 'Amsterdam', distance: 1950, transitDays: 3, countries: ['ES', 'FR', 'BE', 'NL'] },
  { origin: 'Bilbao', destination: 'Milan', distance: 1350, transitDays: 2, countries: ['ES', 'FR', 'IT'] },
  { origin: 'Sevilla', destination: 'London', distance: 2100, transitDays: 3, countries: ['ES', 'FR', 'GB'] },
  { origin: 'Zaragoza', destination: 'Marsella', distance: 780, transitDays: 1, countries: ['ES', 'FR'] },
  { origin: 'Madrid', destination: 'Lisboa', distance: 625, transitDays: 1, countries: ['ES', 'PT'] },
  { origin: 'Barcelona', destination: 'Roma', distance: 1365, transitDays: 2, countries: ['ES', 'FR', 'IT'] },
  { origin: 'Valencia', destination: 'Bruselas', distance: 1750, transitDays: 3, countries: ['ES', 'FR', 'BE'] },
  { origin: 'Madrid', destination: 'Frankfurt', distance: 1850, transitDays: 3, countries: ['ES', 'FR', 'DE'] },
  { origin: 'Bilbao', destination: 'Burdeos', distance: 420, transitDays: 1, countries: ['ES', 'FR'] },
  { origin: 'Sevilla', destination: 'Porto', distance: 480, transitDays: 1, countries: ['ES', 'PT'] },
  { origin: 'Barcelona', destination: 'Lyon', distance: 640, transitDays: 1, countries: ['ES', 'FR'] },
  { origin: 'Madrid', destination: 'Zurich', distance: 1700, transitDays: 3, countries: ['ES', 'FR', 'CH'] },
  { origin: 'Valencia', destination: 'Munich', distance: 1850, transitDays: 3, countries: ['ES', 'FR', 'DE'] },
];

const CLIENTS_DATA = [
  { name: 'Juan Perez', company: 'Transportes Ibericos SL', email: 'jperez@transibericos.es', city: 'Madrid', taxId: 'B12345678' },
  { name: 'Maria Garcia', company: 'LogiSur Express SA', email: 'mgarcia@logisur.es', city: 'Sevilla', taxId: 'A87654321' },
  { name: 'Carlos Lopez', company: 'Maderas del Norte SL', email: 'clopez@maderasnorte.es', city: 'Bilbao', taxId: 'B23456789' },
  { name: 'Ana Martinez', company: 'Frutas Levante SA', email: 'amartinez@frutaslevante.es', city: 'Valencia', taxId: 'A34567890' },
  { name: 'Pedro Sanchez', company: 'Quimicos Catalanes SL', email: 'psanchez@quimicoscat.es', city: 'Barcelona', taxId: 'B45678901' },
  { name: 'Laura Fernandez', company: 'Electrodomesticos Luna SL', email: 'lfernandez@electroluna.es', city: 'Zaragoza', taxId: 'B56789012' },
  { name: 'Miguel Torres', company: 'Vinos y Aceites del Sur SA', email: 'mtorres@vinosur.es', city: 'Cordoba', taxId: 'A67890123' },
  { name: 'Sofia Ruiz', company: 'Textiles Mediterraneo SL', email: 'sruiz@textilmed.es', city: 'Alicante', taxId: 'B78901234' },
  { name: 'David Moreno', company: 'Autopartes Castilla SL', email: 'dmoreno@autocastilla.es', city: 'Valladolid', taxId: 'B89012345' },
  { name: 'Isabel Diaz', company: 'Farmaceutica Galicia SA', email: 'idiaz@farmagalicia.es', city: 'A Coruna', taxId: 'A90123456' },
  { name: 'Javier Navarro', company: 'Construcciones Aragon SL', email: 'jnavarro@construaragon.es', city: 'Zaragoza', taxId: 'B01234567' },
  { name: 'Carmen Romero', company: 'Plasticos Andalucia SL', email: 'cromero@plastiandalucia.es', city: 'Malaga', taxId: 'B11223344' },
  { name: 'Roberto Jimenez', company: 'Maquinaria Vasca SA', email: 'rjimenez@maquivasca.es', city: 'San Sebastian', taxId: 'A22334455' },
  { name: 'Elena Herrero', company: 'Cosmeticos Iberia SL', email: 'eherrero@cosiberia.es', city: 'Madrid', taxId: 'B33445566' },
  { name: 'Pablo Gutierrez', company: 'Alimentacion Extremena SL', email: 'pgutierrez@alimextremena.es', city: 'Badajoz', taxId: 'B44556677' },
];

const CARGO_TYPES = ['general', 'forestales', 'adr', 'refrigerado', 'especial'];
const SERVICE_TYPES = ['economico', 'estandar', 'express'];
const STATUSES = ['accepted', 'accepted', 'accepted', 'active', 'active', 'rejected', 'expired', 'sent', 'viewed', 'negotiating'];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(monthsBack) {
  const now = new Date();
  const start = new Date(now);
  start.setMonth(start.getMonth() - monthsBack);
  return new Date(start.getTime() + Math.random() * (now.getTime() - start.getTime()));
}

function generateQuoteId() {
  const prefix = 'QUO';
  const date = new Date();
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${dateStr}-${random}`;
}

async function seedDemo() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log(`Connected to: ${mongoose.connection.name}`);

    // --- Clear existing data ---
    console.log('\nClearing existing data...');
    await User.deleteMany({});
    await Client.deleteMany({});
    await Quote.deleteMany({});
    console.log('Collections cleared.');

    // --- Create Users ---
    console.log('\nCreating users...');
    const password = await bcrypt.hash('password123', 12);

    const usersData = [
      { email: 'agente1@logistic.com', password, firstName: 'Miguel', lastName: 'Garcia', role: 'agente_comercial', department: 'Ventas', phone: '+34 600 100 001' },
      { email: 'agente2@logistic.com', password, firstName: 'Laura', lastName: 'Lopez', role: 'agente_comercial', department: 'Ventas', phone: '+34 600 100 002' },
      { email: 'supervisor1@logistic.com', password, firstName: 'Ana', lastName: 'Martinez', role: 'supervisor', department: 'Operaciones', phone: '+34 600 200 001' },
      { email: 'supervisor2@logistic.com', password, firstName: 'Carlos', lastName: 'Navarro', role: 'supervisor', department: 'Operaciones', phone: '+34 600 200 002' },
      { email: 'admin@logistic.com', password, firstName: 'Roberto', lastName: 'Sanchez', role: 'alta_gerencia', department: 'Direccion General', phone: '+34 600 300 001' },
    ];

    const createdUsers = [];
    for (const userData of usersData) {
      const user = new User(userData);
      await user.save();
      createdUsers.push(user);
      console.log(`  Created: ${user.firstName} ${user.lastName} (${user.role})`);
    }

    const agents = createdUsers.filter(u => u.role === 'agente_comercial');
    const supervisors = createdUsers.filter(u => u.role === 'supervisor');

    // Assign agents to supervisor1
    const sup1 = supervisors[0];
    sup1.managedAgents = agents.map(a => a._id);
    await sup1.save();
    for (const agent of agents) {
      agent.supervisorId = sup1._id;
      await agent.save();
    }
    console.log(`  Assigned ${agents.length} agents to ${sup1.firstName}`);

    // --- Create Clients ---
    console.log('\nCreating clients...');
    const createdClients = [];
    for (const clientData of CLIENTS_DATA) {
      const client = await Client.create({
        ...clientData,
        country: 'ES',
        isActive: true,
        createdBy: randomPick(agents)._id,
      });
      createdClients.push(client);
    }
    console.log(`  Created ${createdClients.length} clients`);

    // --- Create Quotes ---
    console.log('\nCreating quotes...');
    const quotes = [];

    for (let i = 0; i < 30; i++) {
      const route = randomPick(ROUTES);
      const client = randomPick(createdClients);
      const agent = randomPick(agents);
      const cargoType = randomPick(CARGO_TYPES);
      const serviceType = randomPick(SERVICE_TYPES);
      const status = randomPick(STATUSES);
      const createdAt = randomDate(6);

      const weight = randomFloat(500, 24000, 0);
      const baseCost = route.distance * randomFloat(0.8, 1.5);
      const fuelCost = baseCost * randomFloat(0.15, 0.25);
      const tollCost = route.distance * randomFloat(0.05, 0.15);
      const driverCost = route.transitDays * randomFloat(120, 200);
      const vehicleCost = route.transitDays * randomFloat(80, 150);
      const subtotal = baseCost + fuelCost + tollCost + driverCost + vehicleCost;

      const marginPercent = randomFloat(8, 25);
      const margin = subtotal * (marginPercent / 100);
      const totalWithoutVAT = subtotal + margin;
      const vat = totalWithoutVAT * 0.21;
      const total = totalWithoutVAT + vat;

      const validUntil = new Date(createdAt);
      validUntil.setDate(validUntil.getDate() + 30);

      const quoteId = generateQuoteId() + String(i).padStart(2, '0');

      const quoteData = {
        quoteId,
        route: {
          origin: route.origin,
          destination: route.destination,
          distance: route.distance,
          estimatedTransitDays: route.transitDays,
          countries: route.countries,
        },
        cargo: {
          type: cargoType,
          weight: weight,
          volume: randomFloat(10, 80),
          value: randomFloat(5000, 50000),
          description: `Carga ${cargoType} - ${route.origin} a ${route.destination}`,
        },
        costBreakdown: {
          distanceRate: parseFloat(baseCost.toFixed(2)),
          fuelCost: parseFloat(fuelCost.toFixed(2)),
          tollCost: parseFloat(tollCost.toFixed(2)),
          driverCost: parseFloat(driverCost.toFixed(2)),
          vehicleCost: parseFloat(vehicleCost.toFixed(2)),
          subtotal: parseFloat(subtotal.toFixed(2)),
          adjustmentFactor: 1,
          margin: parseFloat(margin.toFixed(2)),
          totalWithoutVAT: parseFloat(totalWithoutVAT.toFixed(2)),
          vat: parseFloat(vat.toFixed(2)),
          total: parseFloat(total.toFixed(2)),
        },
        client: {
          company: client.company,
          email: client.email,
          contactName: client.name,
          phone: client.phone || '+34 600 000 000',
        },
        preferences: {
          serviceType: serviceType,
          profitMargin: marginPercent,
        },
        requirements: {
          insurance: Math.random() > 0.5,
          tracking: Math.random() > 0.3,
          signature: Math.random() > 0.6,
        },
        validUntil,
        confidence: randomFloat(75, 98),
        status,
        tracking: {
          timeline: [
            {
              status: 'generated',
              timestamp: createdAt,
              description: 'Cotizacion generada automaticamente',
              performedBy: agent._id.toString(),
            }
          ],
          clientAccess: {},
          communications: [],
          assignedTo: agent._id.toString(),
          negotiations: [],
        },
        intelligence: {
          sourcesConsulted: randomInt(3, 8),
          usedAI: true,
          processingTime: randomInt(800, 3500),
          commercialMargin: marginPercent,
          routeSource: 'openroute',
          routeConfidence: randomFloat(85, 99),
          tollSource: 'calculated',
          tollConfidence: randomFloat(80, 95),
          countries: route.countries.length,
        },
        createdAt,
        updatedAt: createdAt,
        createdBy: agent._id.toString(),
      };

      // Add extra timeline events for non-active statuses
      if (status === 'sent' || status === 'viewed' || status === 'accepted' || status === 'rejected') {
        const sentDate = new Date(createdAt.getTime() + randomInt(1, 3) * 86400000);
        quoteData.tracking.timeline.push({
          status: 'sent',
          timestamp: sentDate,
          description: 'Cotizacion enviada al cliente',
          performedBy: agent._id.toString(),
        });
      }
      if (status === 'viewed' || status === 'accepted' || status === 'rejected') {
        const viewDate = new Date(createdAt.getTime() + randomInt(2, 5) * 86400000);
        quoteData.tracking.timeline.push({
          status: 'viewed',
          timestamp: viewDate,
          description: 'Cliente visualizo la cotizacion',
          performedBy: 'client',
        });
      }
      if (status === 'accepted') {
        const acceptDate = new Date(createdAt.getTime() + randomInt(3, 10) * 86400000);
        quoteData.tracking.timeline.push({
          status: 'accepted',
          timestamp: acceptDate,
          description: 'Cotizacion aceptada por el cliente',
          performedBy: 'client',
        });
      }
      if (status === 'rejected') {
        const rejectDate = new Date(createdAt.getTime() + randomInt(3, 10) * 86400000);
        quoteData.tracking.timeline.push({
          status: 'rejected',
          timestamp: rejectDate,
          description: 'Cotizacion rechazada por el cliente',
          performedBy: 'client',
        });
      }

      const quote = await Quote.create(quoteData);
      quotes.push(quote);
    }
    console.log(`  Created ${quotes.length} quotes`);

    // --- Update agent metrics ---
    console.log('\nUpdating agent metrics...');
    for (const agent of agents) {
      const agentQuotes = quotes.filter(q => q.tracking.assignedTo === agent._id.toString());
      const acceptedQuotes = agentQuotes.filter(q => q.status === 'accepted');
      const totalRevenue = acceptedQuotes.reduce((sum, q) => sum + (q.costBreakdown?.total || 0), 0);

      agent.metrics = {
        totalQuotes: agentQuotes.length,
        acceptedQuotes: acceptedQuotes.length,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        averageQuoteValue: acceptedQuotes.length > 0 ? Math.round((totalRevenue / acceptedQuotes.length) * 100) / 100 : 0,
        conversionRate: agentQuotes.length > 0 ? Math.round((acceptedQuotes.length / agentQuotes.length) * 10000) / 100 : 0,
        lastCalculated: new Date(),
      };
      await agent.save();
      console.log(`  ${agent.firstName} ${agent.lastName}: ${agentQuotes.length} quotes, ${acceptedQuotes.length} accepted, EUR ${Math.round(totalRevenue)}`);
    }

    // --- Update client stats ---
    console.log('\nUpdating client stats...');
    for (const client of createdClients) {
      const clientQuotes = quotes.filter(q => q.client.email === client.email);
      const acceptedClientQuotes = clientQuotes.filter(q => q.status === 'accepted');
      client.totalQuotes = clientQuotes.length;
      client.totalRevenue = acceptedClientQuotes.reduce((sum, q) => sum + (q.costBreakdown?.total || 0), 0);
      await client.save();
    }

    // --- Summary ---
    console.log('\n========================================');
    console.log('  DEMO DATA SEEDED SUCCESSFULLY');
    console.log('========================================');
    console.log(`  Users:   ${createdUsers.length} (2 agents, 2 supervisors, 1 gerencia)`);
    console.log(`  Clients: ${createdClients.length}`);
    console.log(`  Quotes:  ${quotes.length}`);
    console.log('');
    console.log('  Login credentials (all use password123):');
    console.log('  - admin@logistic.com (alta_gerencia)');
    console.log('  - supervisor1@logistic.com (supervisor)');
    console.log('  - supervisor2@logistic.com (supervisor)');
    console.log('  - agente1@logistic.com (agente_comercial)');
    console.log('  - agente2@logistic.com (agente_comercial)');
    console.log('========================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding demo data:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seedDemo();
