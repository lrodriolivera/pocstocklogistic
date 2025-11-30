/**
 * Script para crear usuarios de ejemplo en MongoDB
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Conectar a MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/stock-logistic');
    console.log(`✅ Connected to MongoDB: ${conn.connection.name}`);
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    process.exit(1);
  }
};

// Definir esquema User
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  role: {
    type: String,
    enum: ['agente_comercial', 'supervisor', 'alta_gerencia'],
    default: 'agente_comercial'
  },
  phone: String,
  department: String,
  isActive: { type: Boolean, default: true },
  supervisorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  managedAgents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  lastLogin: Date,
  loginCount: { type: Number, default: 0 },
  metrics: {
    quotesGenerated: { type: Number, default: 0 },
    quotesAccepted: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 }
  }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

const seedUsers = async () => {
  try {
    await connectDB();

    // Verificar si ya hay usuarios
    const existingUsers = await User.find();
    console.log(`📊 Found ${existingUsers.length} existing users`);

    if (existingUsers.length > 0) {
      console.log('👤 Existing users:');
      existingUsers.forEach(user => {
        console.log(`  - ${user.firstName} ${user.lastName} (${user.email}) - Role: ${user.role}`);
      });
      console.log('\n✅ Users already exist in database');
      process.exit(0);
    }

    // Crear usuarios de ejemplo
    const bcrypt = require('bcryptjs');

    // Hash de contraseñas
    const password = await bcrypt.hash('password123', 12);

    const users = [
      {
        email: 'admin@logistic.com',
        password,
        firstName: 'Carlos',
        lastName: 'Rodriguez',
        role: 'alta_gerencia',
        department: 'Dirección General',
        phone: '+34 600 000 001'
      },
      {
        email: 'supervisor@logistic.com',
        password,
        firstName: 'Ana',
        lastName: 'Martinez',
        role: 'supervisor',
        department: 'Operaciones',
        phone: '+34 600 000 002'
      },
      {
        email: 'agente1@logistic.com',
        password,
        firstName: 'Miguel',
        lastName: 'Garcia',
        role: 'agente_comercial',
        department: 'Ventas',
        phone: '+34 600 000 003'
      },
      {
        email: 'agente2@logistic.com',
        password,
        firstName: 'Laura',
        lastName: 'Lopez',
        role: 'agente_comercial',
        department: 'Ventas',
        phone: '+34 600 000 004'
      }
    ];

    // Crear usuarios
    const createdUsers = await User.insertMany(users);
    console.log(`✅ Created ${createdUsers.length} users successfully:`);

    createdUsers.forEach(user => {
      console.log(`  - ${user.firstName} ${user.lastName} (${user.email}) - Role: ${user.role}`);
    });

    // Asignar agentes al supervisor
    const supervisor = createdUsers.find(u => u.role === 'supervisor');
    const agents = createdUsers.filter(u => u.role === 'agente_comercial');

    if (supervisor && agents.length > 0) {
      // Actualizar supervisor con agentes
      supervisor.managedAgents = agents.map(a => a._id);
      await supervisor.save();

      // Actualizar agentes con supervisor
      await User.updateMany(
        { _id: { $in: agents.map(a => a._id) } },
        { supervisorId: supervisor._id }
      );

      console.log(`🔗 Assigned ${agents.length} agents to supervisor ${supervisor.firstName} ${supervisor.lastName}`);
    }

    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📋 Login credentials:');
    console.log('  Admin (Alta Gerencia): admin@logistic.com / password123');
    console.log('  Supervisor: supervisor@logistic.com / password123');
    console.log('  Agente 1: agente1@logistic.com / password123');
    console.log('  Agente 2: agente2@logistic.com / password123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding users:', error);
    process.exit(1);
  }
};

seedUsers();