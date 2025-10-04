// src/controllers/compteController.js (CODE FINAL ET COMPLET)

const Compte = require('../models/Compte');
const User = require('../models/User');

// @desc    Obtenir tous les comptes (Agent uniquement)
// @route   GET /api/comptes
// @access  Private (Agent uniquement)
exports.getComptes = async (req, res, next) => {
    try {
        const comptes = await Compte.find()
            .populate('user', 'nom prenom telephone role blocked')
            .select('-__v'); 

        res.status(200).json({
            success: true,
            data: comptes
        });
    } catch (error) {
        next(error);
    }
};

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
    if (req.user.role !== 'agent' && req.user.numero_compte !== req.params.numero_compte) {
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


// 🎯 FONCTION getBalance
// @desc    Obtenir le solde d'un compte
// @route   GET /api/comptes/:numero_compte/solde
// @access  Private
exports.getBalance = async (req, res, next) => {
    try {
        const { numero_compte } = req.params;

        // Sécurité: Si l'utilisateur connecté n'est pas agent, il ne peut voir que son propre solde.
        if (req.user.role !== 'agent' && req.user.numero_compte !== numero_compte) {
            return res.status(403).json({ success: false, error: 'Non autorisé à consulter ce solde.' });
        }

        const compte = await Compte.findOne({ numero_compte }).select('solde numero_compte');

        if (!compte) {
            return res.status(404).json({ success: false, error: 'Compte introuvable.' });
        }

        res.status(200).json({
            success: true,
            numero_compte: compte.numero_compte,
            solde: compte.solde
        });
    } catch (error) {
        next(error);
    }
};

// Laisser ceci si vous n'avez pas de fonction createCompte
exports.createCompte = (req, res) => {
    return res.status(405).json({ 
        success: false, 
        error: "La création de compte est généralement gérée lors de la création d'utilisateur." 
    });
};