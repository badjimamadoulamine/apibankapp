const Compte = require('../models/Compte');
const User = require('../models/User');

// @desc    Obtenir un compte par numéro de compte
// @route   GET /api/comptes/:numero_compte
// @access  Private
exports.getCompte = async (req, res, next) => {
  try {
    const compte = await Compte.findOne({ 
      numero_compte: req.params.numero_compte 
    }).populate('user', 'nom prenom telephone role blocked');

    if (!compte) {
      return res.status(404).json({
        success: false,
        error: 'Compte introuvable'
      });
    }

    // Sécurité: Si l'utilisateur connecté n'est pas agent, il ne peut voir que son propre compte.
    if (req.user.role !== 'agent' && req.user._id.toString() !== compte.user._id.toString()) {
        return res.status(403).json({
            success: false,
            error: 'Non autorisé à consulter ce compte'
        });
    }

    res.status(200).json({
      success: true,
      data: compte
    });
  } catch (error) {
    next(error);
  }
};

// NOTE: La fonction getBalance se trouve dans transactionController.js, nous n'avons pas besoin de la dupliquer ici.

// @desc    Obtenir tous les comptes (Agent uniquement)
// @route   GET /api/comptes
// @access  Private (Agent uniquement)
exports.getComptes = async (req, res, next) => {
    try {
        // Logique de pagination et filtrage peut être ajoutée ici si nécessaire.
        const comptes = await Compte.find().populate('user', 'nom prenom telephone role blocked').sort({ date_creation: -1 });

        res.status(200).json({
            success: true,
            count: comptes.length,
            data: comptes
        });
    } catch (error) {
        next(error);
    }
};