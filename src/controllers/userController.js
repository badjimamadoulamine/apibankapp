const User = require('../models/User');
const Compte = require('../models/Compte');
const jwt = require('jsonwebtoken');

// Générer le token JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// @desc    Login utilisateur
// @route   POST /api/users/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { numero_compte, mot_de_passe } = req.body;

    if (!numero_compte || !mot_de_passe) {
      return res.status(400).json({
        success: false,
        error: 'Veuillez fournir un numéro de compte et un mot de passe'
      });
    }

    const user = await User.findOne({ numero_compte }).select('+mot_de_passe');

    if (!user || !(await user.comparePassword(mot_de_passe))) {
      return res.status(401).json({
        success: false,
        error: 'Identifiants invalides'
      });
    }

    if (user.blocked) {
      return res.status(403).json({
        success: false,
        error: 'Compte bloqué. Contactez un agent.'
      });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
      userId: user._id,
      role: user.role,
      numero_compte: user.numero_compte
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Créer un utilisateur (client/distributeur)
// @route   POST /api/users
// @access  Private (Agent uniquement)
exports.createUser = async (req, res, next) => {
  try {
    const userData = {
      ...req.body,
      createdBy: req.user._id
    };

    const user = await User.create(userData);

    // ✅ CORRECTION CRITIQUE : Créer automatiquement le compte financier
    await Compte.create({
      numero_compte: user.numero_compte,
      user: user._id,
      solde: 0
    });

    res.status(201).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir tous les utilisateurs avec pagination
// @route   GET /api/users?page=1&limit=10&role=client
// @access  Private (Agent uniquement)
exports.getUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const startIndex = (page - 1) * limit;

    const query = {};
    if (req.query.role) {
      query.role = req.query.role;
    }
    if (req.query.blocked !== undefined) {
      query.blocked = req.query.blocked === 'true';
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .skip(startIndex)
      .limit(limit)
      .select('-mot_de_passe');

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: {
        items: users,
        totalCount: total
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir un utilisateur par ID
// @route   GET /api/users/:id
// @access  Private
exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-mot_de_passe');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé'
      });
    }

    // ✅ LOGIQUE D'AUTORISATION : Agent ou Utilisateur lui-même
    if (req.user.role !== 'agent' && req.user.id !== user.id) {
      return res.status(403).json({
        success: false,
        error: 'Non autorisé à consulter le profil d\'un autre utilisateur'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    // Gestion spécifique des erreurs de format d'ID (CastError)
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        error: 'ID d\'utilisateur invalide ou non trouvé'
      });
    }
    next(error);
  }
};

// @desc    Obtenir un utilisateur par numéro de compte
// @route   GET /api/users/compte/:numero_compte
// @access  Private
exports.getUserByNumeroCompte = async (req, res, next) => {
  try {
    const user = await User.findOne({ 
      numero_compte: req.params.numero_compte 
    }).select('-mot_de_passe');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Modifier un utilisateur
// @route   PUT /api/users/:id
// @access  Private
exports.updateUser = async (req, res, next) => {
  try {
    // Champs non modifiables
    const fieldsToRemove = ['numero_compte', 'role', 'createdBy', 'mot_de_passe'];
    fieldsToRemove.forEach(field => delete req.body[field]);

    const user = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).select('-mot_de_passe');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Supprimer un utilisateur
// @route   DELETE /api/users/:id
// @access  Private (Agent uniquement)
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé'
      });
    }

    // Supprimer aussi le compte financier
    await Compte.findOneAndDelete({ numero_compte: user.numero_compte });
    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Utilisateur et compte supprimés avec succès'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Suppression multiple d'utilisateurs
// @route   POST /api/users/bulk-delete
// @access  Private (Agent uniquement)
exports.bulkDelete = async (req, res, next) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'IDs invalides'
      });
    }

    const users = await User.find({ _id: { $in: ids } });
    const numeroComptes = users.map(u => u.numero_compte);

    await Compte.deleteMany({ numero_compte: { $in: numeroComptes } });
    await User.deleteMany({ _id: { $in: ids } });

    res.status(200).json({
      success: true,
      message: `${ids.length} utilisateur(s) supprimé(s)`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bloquer/débloquer un utilisateur
// @route   POST /api/users/toggle-block/:id
// @access  Private (Agent uniquement)
exports.toggleBlockUser = async (req, res, next) => {
  try {
    const { block } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { blocked: block },
      { new: true }
    ).select('-mot_de_passe');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé'
      });
    }

    res.status(200).json({
      success: true,
      message: `Utilisateur ${block ? 'bloqué' : 'débloqué'} avec succès`,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Blocage multiple
// @route   POST /api/users/bulk-block
// @access  Private (Agent uniquement)
exports.bulkBlock = async (req, res, next) => {
  try {
    const { ids, block } = req.body;

    await User.updateMany(
      { _id: { $in: ids } },
      { blocked: block }
    );

    res.status(200).json({
      success: true,
      message: `${ids.length} utilisateur(s) ${block ? 'bloqué(s)' : 'débloqué(s)'}`
    });
  } catch (error) {
    next(error);
  }
}