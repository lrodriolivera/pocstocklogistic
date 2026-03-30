const express = require('express');
const Client = require('../models/Client');
const {
  authenticateToken,
  requireMinimumRole,
  buildRoleFilter
} = require('../middleware/auth');
const { requireTenant, stampTenant } = require('../middleware/tenant');

const router = express.Router();

// All routes require authentication and tenant
router.use(authenticateToken);
router.use(requireTenant);

// GET /api/clients/stats - basic stats (must be before /:id)
router.get('/stats', async (req, res) => {
  try {
    const filter = await buildRoleFilter(req.user, 'createdBy');

    const [totalClients, activeClients, topByRevenue] = await Promise.all([
      Client.countDocuments(filter),
      Client.countDocuments({ ...filter, isActive: true }),
      Client.find({ ...filter, isActive: true })
        .sort({ totalRevenue: -1 })
        .limit(5)
        .select('name company totalRevenue totalQuotes')
    ]);

    const revenueAgg = await Client.aggregate([
      { $match: { ...filter, isActive: true } },
      { $group: { _id: null, total: { $sum: '$totalRevenue' } } }
    ]);

    res.json({
      success: true,
      data: {
        totalClients,
        activeClients,
        totalRevenue: revenueAgg[0]?.total || 0,
        topByRevenue
      }
    });
  } catch (error) {
    console.error('Error fetching client stats:', error);
    res.status(500).json({ success: false, error: 'Error obteniendo estadisticas' });
  }
});

// GET /api/clients - list clients (paginated, filterable)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, search, active } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = await buildRoleFilter(req.user, 'createdBy');

    // Search by name or company
    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [
        { name: regex },
        { company: regex },
        { email: regex },
        { taxId: regex }
      ];
    }

    // Filter by active status
    if (active !== undefined) {
      filter.isActive = active === 'true';
    }

    const [clients, total] = await Promise.all([
      Client.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('createdBy', 'firstName lastName email'),
      Client.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        clients,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ success: false, error: 'Error obteniendo clientes' });
  }
});

// GET /api/clients/:id - get single client
router.get('/:id', async (req, res) => {
  try {
    const client = await Client.findById(req.params.id)
      .populate('createdBy', 'firstName lastName email');

    if (!client) {
      return res.status(404).json({ success: false, error: 'Cliente no encontrado' });
    }

    // Check access
    if (!canAccessClient(req.user, client)) {
      return res.status(403).json({ success: false, error: 'Acceso no autorizado' });
    }

    res.json({ success: true, data: client });
  } catch (error) {
    console.error('Error fetching client:', error);
    res.status(500).json({ success: false, error: 'Error obteniendo cliente' });
  }
});

// POST /api/clients - create client
router.post('/', async (req, res) => {
  try {
    const { name, company, email, phone, address, city, country, taxId, notes } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'El nombre es obligatorio' });
    }

    const client = new Client({
      name,
      company,
      email,
      phone,
      address,
      city,
      country,
      taxId,
      notes,
      createdBy: req.user._id
    });

    // Stamp tenant from authenticated user
    stampTenant(req, client);

    await client.save();

    res.status(201).json({ success: true, data: client });
  } catch (error) {
    console.error('Error creating client:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: 'Error creando cliente' });
  }
});

// PUT /api/clients/:id - update client
router.put('/:id', async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);

    if (!client) {
      return res.status(404).json({ success: false, error: 'Cliente no encontrado' });
    }

    if (!canAccessClient(req.user, client)) {
      return res.status(403).json({ success: false, error: 'Acceso no autorizado' });
    }

    const allowedFields = ['name', 'company', 'email', 'phone', 'address', 'city', 'country', 'taxId', 'notes'];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        client[field] = req.body[field];
      }
    });

    await client.save();

    res.json({ success: true, data: client });
  } catch (error) {
    console.error('Error updating client:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: 'Error actualizando cliente' });
  }
});

// DELETE /api/clients/:id - soft delete (set isActive: false)
router.delete('/:id', async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);

    if (!client) {
      return res.status(404).json({ success: false, error: 'Cliente no encontrado' });
    }

    if (!canAccessClient(req.user, client)) {
      return res.status(403).json({ success: false, error: 'Acceso no autorizado' });
    }

    client.isActive = false;
    await client.save();

    res.json({ success: true, message: 'Cliente desactivado correctamente' });
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({ success: false, error: 'Error eliminando cliente' });
  }
});

// Helper: check if user can access a specific client
function canAccessClient(user, client) {
  if (user.role === 'alta_gerencia') return true;

  if (user.role === 'supervisor') {
    const managedIds = (user.managedAgents || []).map(id => id.toString());
    return client.createdBy.toString() === user._id.toString() ||
           managedIds.includes(client.createdBy.toString());
  }

  return client.createdBy.toString() === user._id.toString();
}

module.exports = router;
