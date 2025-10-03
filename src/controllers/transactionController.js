const Transaction = require('../models/Transaction');
const Compte = require('../models/Compte');
const User = require('../models/User');

// @desc    Effectuer un dépôt
// @route   POST /api/transactions/depot
// @access  Private (Agent/Distributeur)
exports.depot = async (req, res, next) => {
  try {
    const { numero_compte_recepteur, montant } = req.body;

    if (!numero_compte_recepteur || !montant || montant < 100) {
      return res.status(400).json({
        success: false,
        error: 'Données invalides. Montant minimum: 100 FCFA'
      });
    }

    // Vérifier que l'utilisateur récepteur existe et n'est pas bloqué
    const userRecepteur = await User.findOne({ numero_compte: numero_compte_recepteur });
    if (!userRecepteur) {
      return res.status(404).json({
        success: false,
        error: 'Compte récepteur introuvable (Numéro de compte non associé à un utilisateur)'
      });
    }

    if (userRecepteur.blocked) {
      return res.status(403).json({
        success: false,
        error: 'Compte récepteur bloqué'
      });
    }

    // ⭐ CORRECTION : Chercher le document Compte financier
    const compteRecepteur = await Compte.findOne({ numero_compte: numero_compte_recepteur });

    // Vérification anti-null (si le Compte existe bien)
    if (!compteRecepteur) {
        return res.status(404).json({
            success: false,
            error: 'Document Compte financier manquant. Veuillez recréer l\'utilisateur.'
        });
    }

    // Mettre à jour le solde
    compteRecepteur.solde += montant;
    await compteRecepteur.save();

    // Créer la transaction
    const transaction = await Transaction.create({
      type: 'depot',
      montant,
      numero_compte_recepteur,
      effectuee_par: req.user._id,
      statut: 'validee'
    });

    res.status(201).json({
      success: true,
      message: `Dépôt de ${montant} FCFA effectué avec succès`,
      data: transaction
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Effectuer un retrait
// @route   POST /api/transactions/retrait
// @access  Private (Distributeur uniquement)
exports.retrait = async (req, res, next) => {
  try {
    const { numero_compte, montant } = req.body;

    if (!numero_compte || !montant || montant < 100) {
      return res.status(400).json({
        success: false,
        error: 'Données invalides. Montant minimum: 100 FCFA'
      });
    }

    // Vérifier l'utilisateur
    const user = await User.findOne({ numero_compte });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Compte introuvable (Numéro de compte non associé à un utilisateur)'
      });
    }

    if (user.blocked) {
      return res.status(403).json({
        success: false,
        error: 'Compte bloqué'
      });
    }

    // Chercher le compte financier
    const compte = await Compte.findOne({ numero_compte });
    
    // ⭐ CORRECTION : Vérification anti-null
    if (!compte) {
        return res.status(404).json({
            success: false,
            error: 'Document Compte financier manquant. Veuillez recréer l\'utilisateur.'
        });
    }

    if (compte.solde < montant) {
      return res.status(400).json({
        success: false,
        error: 'Solde insuffisant'
      });
    }

    // Créer la transaction
    const transaction = await Transaction.create({
      type: 'retrait',
      montant,
      numero_compte_emetteur: numero_compte,
      effectuee_par: req.user._id,
      statut: 'validee'
    });

    // Déduire le solde
    compte.solde -= montant;
    await compte.save();

    res.status(201).json({
      success: true,
      message: `Retrait de ${montant} FCFA effectué avec succès`,
      data: transaction
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir les transactions d'un compte
// @route   GET /api/transactions/:numero_compte
// @access  Private
exports.getTransactions = async (req, res, next) => {
  try {
    // Vérification de sécurité: l'utilisateur connecté doit être agent ou le titulaire du compte
    const compteUser = await Compte.findOne({ numero_compte: req.params.numero_compte });

    if (!compteUser) {
      return res.status(404).json({
        success: false,
        error: 'Compte introuvable'
      });
    }

    // L'agent peut tout voir (req.user.role !== 'agent'), 
    // ou l'utilisateur doit être le propriétaire du compte (req.user._id.toString() !== compteUser.user.toString())
    if (req.user.role !== 'agent' && req.user._id.toString() !== compteUser.user.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Non autorisé à consulter les transactions de ce compte'
      });
    }
    
    const transactions = await Transaction.find({
      $or: [
        { numero_compte_emetteur: req.params.numero_compte },
        { numero_compte_recepteur: req.params.numero_compte }
      ]
    }).sort({ date_transaction: -1 });

    res.status(200).json({
      success: true,
      count: transactions.length,
      data: {
        transactions
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Annuler une transaction
// @route   DELETE /api/transactions/cancel/:id
// @access  Private (Agent uniquement)
exports.cancelTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction introuvable'
      });
    }

    if (transaction.statut === 'annulee') {
      return res.status(400).json({
        success: false,
        error: 'Transaction déjà annulée'
      });
    }

    // 1. Inverser l'opération financière
    let compteToUpdate = null;
    
    // Pour un dépôt annulé, il faut retirer l'argent du compte récepteur
    if (transaction.type === 'depot') {
      compteToUpdate = await Compte.findOne({ 
        numero_compte: transaction.numero_compte_recepteur 
      });
      if (compteToUpdate) {
        compteToUpdate.solde -= transaction.montant;
      }
    } 
    // Pour un retrait annulé, il faut rendre l'argent au compte émetteur
    else if (transaction.type === 'retrait') {
      compteToUpdate = await Compte.findOne({ 
        numero_compte: transaction.numero_compte_emetteur 
      });
      if (compteToUpdate) {
        compteToUpdate.solde += transaction.montant;
      }
    }
    
    // Vérification de l'existence du compte à mettre à jour
    if (!compteToUpdate) {
        // Logique de sécurité pour éviter de continuer si le compte a été supprimé
        return res.status(500).json({
            success: false,
            error: "Annulation impossible: Compte financier cible introuvable."
        });
    }

    // ⭐ Vérification de solde insuffisant pour l'annulation d'un dépôt
    if (compteToUpdate.solde < 0) {
        return res.status(400).json({
            success: false,
            error: `Annulation impossible: Le compte ${compteToUpdate.numero_compte} n'a plus assez de fonds pour inverser cette transaction.`
        });
    }

    // Sauvegarder la modification
    await compteToUpdate.save();
    
    // 2. Annuler la transaction
    transaction.statut = 'annulee';
    transaction.motif_annulation = req.body.motif || 'Annulée par agent';
    await transaction.save();


    res.status(200).json({
      success: true,
      message: 'Transaction annulée avec succès',
      data: transaction
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir le solde d'un compte
// @route   GET /api/comptes/:numero_compte/solde
// @access  Private
exports.getBalance = async (req, res, next) => {
  try {
    const compte = await Compte.findOne({ 
      numero_compte: req.params.numero_compte 
    }).populate('user', 'nom prenom numero_compte');

    if (!compte) {
      return res.status(404).json({
        success: false,
        error: 'Compte introuvable'
      });
    }
    
    // Vérification de sécurité: l'utilisateur connecté doit être agent ou le titulaire du compte
    if (req.user.role !== 'agent' && req.user.numero_compte !== compte.numero_compte) {
        return res.status(403).json({
            success: false,
            error: 'Non autorisé à consulter ce solde'
        });
    }

    res.status(200).json({
      success: true,
      data: {
        numero_compte: compte.numero_compte,
        solde: compte.solde,
        titulaire: compte.user
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;