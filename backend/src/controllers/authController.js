/**
 * Authentication Controller
 * Handles user authentication, registration, and session management
 */

const User = require('../models/User');
const { generateToken } = require('../middleware/auth');

class AuthController {
  /**
   * User login
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email y contraseña son requeridos'
        });
      }

      // Find user by email
      const user = await User.findByEmail(email);

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Credenciales inválidas'
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          error: 'Cuenta desactivada. Contacte al administrador'
        });
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: 'Credenciales inválidas'
        });
      }

      // Update login stats
      await user.updateLoginInfo();

      // Generate JWT token
      const token = generateToken(user._id);

      // Prepare user data (without sensitive info)
      const userData = {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        role: user.role,
        department: user.department,
        employeeId: user.employeeId,
        preferences: user.preferences,
        metrics: user.metrics,
        lastLogin: user.lastLogin
      };

      res.json({
        success: true,
        message: 'Inicio de sesión exitoso',
        data: {
          user: userData,
          token,
          expiresIn: '7d'
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * User registration (only for admins/supervisors)
   */
  async register(req, res) {
    try {
      const {
        email,
        password,
        firstName,
        lastName,
        phone,
        role,
        department,
        supervisorId
      } = req.body;

      // Validate required fields
      if (!email || !password || !firstName || !lastName || !role) {
        return res.status(400).json({
          success: false,
          error: 'Campos requeridos: email, password, firstName, lastName, role'
        });
      }

      // Validate role
      const validRoles = ['agente_comercial', 'supervisor', 'alta_gerencia'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          error: 'Rol inválido'
        });
      }

      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'Usuario ya existe con este email'
        });
      }

      // Validate supervisor assignment
      if (role === 'agente_comercial' && supervisorId) {
        const supervisor = await User.findById(supervisorId);
        if (!supervisor || supervisor.role !== 'supervisor') {
          return res.status(400).json({
            success: false,
            error: 'Supervisor inválido'
          });
        }
      }

      // Create new user
      const newUser = new User({
        email,
        password,
        firstName,
        lastName,
        phone,
        role,
        department: department || 'Comercial',
        supervisorId: role === 'agente_comercial' ? supervisorId : undefined,
        createdBy: req.user._id,
        emailVerified: true // Auto-verify for admin-created accounts
      });

      await newUser.save();

      // If this is an agent, add to supervisor's managed agents
      if (role === 'agente_comercial' && supervisorId) {
        await User.findByIdAndUpdate(
          supervisorId,
          { $addToSet: { managedAgents: newUser._id } }
        );
      }

      // Prepare response data
      const userData = {
        id: newUser._id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        fullName: newUser.fullName,
        role: newUser.role,
        department: newUser.department,
        employeeId: newUser.employeeId,
        isActive: newUser.isActive
      };

      res.status(201).json({
        success: true,
        message: 'Usuario creado exitosamente',
        data: {
          user: userData
        }
      });
    } catch (error) {
      console.error('Registration error:', error);

      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          error: 'Usuario ya existe'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Error creando usuario'
      });
    }
  }

  /**
   * Get current user profile
   */
  async getProfile(req, res) {
    try {
      const user = await User.findById(req.user._id)
        .populate('supervisorId', 'firstName lastName email role')
        .populate('managedAgents', 'firstName lastName email role metrics');

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
      }

      const userData = {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
        department: user.department,
        employeeId: user.employeeId,
        supervisor: user.supervisorId,
        managedAgents: user.managedAgents,
        preferences: user.preferences,
        metrics: user.metrics,
        lastLogin: user.lastLogin,
        loginCount: user.loginCount,
        createdAt: user.createdAt
      };

      res.json({
        success: true,
        data: userData
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Error obteniendo perfil'
      });
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(req, res) {
    try {
      const allowedUpdates = ['firstName', 'lastName', 'phone', 'preferences'];
      const updates = {};

      // Filter allowed updates
      Object.keys(req.body).forEach(key => {
        if (allowedUpdates.includes(key)) {
          updates[key] = req.body[key];
        }
      });

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No hay campos válidos para actualizar'
        });
      }

      const user = await User.findByIdAndUpdate(
        req.user._id,
        updates,
        { new: true, runValidators: true }
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
      }

      res.json({
        success: true,
        message: 'Perfil actualizado exitosamente',
        data: {
          user: {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            preferences: user.preferences
          }
        }
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Error actualizando perfil'
      });
    }
  }

  /**
   * Change password
   */
  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Contraseña actual y nueva son requeridas'
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          error: 'La nueva contraseña debe tener al menos 6 caracteres'
        });
      }

      const user = await User.findById(req.user._id);

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);

      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          error: 'Contraseña actual incorrecta'
        });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      res.json({
        success: true,
        message: 'Contraseña actualizada exitosamente'
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        error: 'Error cambiando contraseña'
      });
    }
  }

  /**
   * Logout (client-side implementation)
   */
  async logout(req, res) {
    res.json({
      success: true,
      message: 'Sesión cerrada exitosamente'
    });
  }

  /**
   * Refresh token
   */
  async refreshToken(req, res) {
    try {
      // Generate new token
      const token = generateToken(req.user._id);

      res.json({
        success: true,
        data: {
          token,
          expiresIn: '7d'
        }
      });
    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(500).json({
        success: false,
        error: 'Error renovando token'
      });
    }
  }
}

module.exports = AuthController;