// src/controllers/transactionController.js (CODE FINAL ET COMPLET)

const Transaction = require('../models/Transaction');
const Compte = require('../models/Compte');

// ------------------------------------------------------------------
// UTILS
// ------------------------------------------------------------------

/**
 * Valide si le solde est suffisant pour une transaction.
 */
const checkBalance = (compte, montant) => {
    if (compte.solde < montant) {
        throw new Error('Solde insuffisant pour effectuer cette transaction.');
    }
    return true;
};

// ------------------------------------------------------------------
// 2. OPÉRATIONS (Depot, Retrait, Transfert)
// ------------------------------------------------------------------

// @desc    Effectuer un dépôt
// @desc    Effectuer un dépôt
// @route   POST /api/transactions/depot
// @access  Private (Agent, Distributeur)
exports.depot = async (req, res, next) => {
    try {
        // 🎯 CORRECTION CRITIQUE : Maintenant on attend numero_compte_recepteur
        const { numero_compte_recepteur, montant } = req.body; 

        if (!numero_compte_recepteur || !montant || montant <= 0) {
            return res.status(400).json({ success: false, error: 'Numéro de compte récepteur et montant valide requis.' });
        }

        // On utilise numero_compte_recepteur pour chercher le compte
        const compte = await Compte.findOne({ numero_compte: numero_compte_recepteur }); 
        if (!compte) {
            return res.status(404).json({ success: false, error: 'Compte destinataire introuvable.' });
        }

        // Augmenter le solde
        compte.solde += Number(montant);
        await compte.save();

        // Créer l'enregistrement de la transaction
        const transaction = await Transaction.create({
    type: 'depot', //  correspond à l'enum ['depot', 'retrait', 'transfert']
    montant,
    // Pour un dépôt, on peut ignorer l'émetteur ou mettre le compte de l'agent connecté
    numero_compte_emetteur: req.user.numero_compte || 'Caisse',
    numero_compte_recepteur, 
    effectuee_par: req.user._id, // correspond à ton schéma
    statut: 'validee' // correspond à ['en_attente', 'validee', 'annulee']
});

        res.status(201).json({
            success: true,
            message: 'Dépôt effectué avec succès.',
            transaction,
            nouveau_solde: compte.solde
        });

    } catch (error) {
        next(error);
    }
};

// Récupérer tous les dépôts (Historique)
// -----------------------------
exports.getDepots = async (req, res, next) => {
    try {
        const depots = await Transaction.find()
            .sort({ createdAt: -1 })
            .populate('effectuee_par', 'nom prenom role numero_compte')


        if (!depots || depots.length === 0) {
            return res.status(200).json({ success: true, message: 'Aucun dépôt trouvé', data: [] });
        }

        res.status(200).json({ success: true, data: depots });
    } catch (error) {
        next(error);
    }
};

// 🎯 Fonction Retrait (Doit exister pour l'importation)
exports.retrait = async (req, res, next) => {
    // TODO: Implémenter la logique de retrait ici
    res.status(501).json({ success: false, error: 'Retrait non implémenté. Veuillez ajouter votre logique.' });
};

// 🎯 Fonction Transfert (Doit exister pour l'importation)
exports.transfert = async (req, res, next) => {
    // TODO: Implémenter la logique de transfert ici
    res.status(501).json({ success: false, error: 'Transfert non implémenté. Veuillez ajouter votre logique.' });
};


// ------------------------------------------------------------------
// 3. HISTORIQUE & ANNULATION
// ------------------------------------------------------------------

// @desc    Obtenir l'historique des transactions
exports.getTransactions = async (req, res, next) => {
    try {
        const numero_compte_param = req.params.numero_compte;
        const user_role = req.user.role; 
        
        let query = {};
        let limit = 50; 

        if (numero_compte_param) {
            // CAS 1: Historique d'un compte
            if (user_role !== 'agent' && req.user.numero_compte !== numero_compte_param) {
                return res.status(403).json({ success: false, error: 'Non autorisé à consulter l\'historique de ce compte.' });
            }
            query = {
                $or: [ { numero_compte_emetteur: numero_compte_param }, { numero_compte_recepteur: numero_compte_param } ]
            };
        } else if (user_role === 'agent') {
            // CAS 2: Historique global pour l'Agent
            query = {}; 
            limit = 200; // Limite de sécurité contre les timeouts
        } else {
            return res.status(403).json({ success: false, error: 'Accès non autorisé à l\'historique global des transactions.' });
        }
        
        const transactions = await Transaction.find(query)
            .sort({ createdAt: -1 })
            .limit(limit)// Application de la limite
            .populate('effectuee_par', 'nom prenom role numero_compte');


        res.status(200).json({
            success: true,
            data: { items: transactions, count: transactions.length }
        });

    } catch (error) {
        next(error); 
    }
};


// @desc    Annuler une transaction (Agent uniquement)
exports.cancelTransaction = async (req, res, next) => {
    const session = await Compte.startSession();
    session.startTransaction();

    try {
        const transaction = await Transaction.findById(req.params.id);

        if (!transaction || transaction.est_annule) {
            throw new Error(`Transaction ${!transaction ? 'introuvable.' : 'déjà annulée.'}`);
        }

        // On cherche le compte receveur (là où l'argent est allé ou d'où il est venu)
        const compte = await Compte.findOne({ 
            numero_compte: transaction.numero_compte_recepteur 
        }).session(session);
        
        if (!compte) {
            throw new Error('Compte associé introuvable.');
        }
        
        // Logique d'annulation : appliquer l'opération inverse
        if (transaction.type === 'depot') {
            compte.solde -= transaction.montant;
        } else if (transaction.type === 'retrait') {
            compte.solde += transaction.montant;
        } 
        
        checkBalance(compte, transaction.montant);

        await compte.save();

        // Marquer la transaction comme annulée
        transaction.est_annule = true;
        transaction.date_annulation = Date.now();
        transaction.annule_par = req.user.id;
        transaction.statut = 'Annulé';
        await transaction.save();

        await session.commitTransaction();

        res.status(200).json({
            success: true,
            message: `Transaction ${req.params.id} annulée.`,
            nouveau_solde: compte.solde
        });

    } catch (error) {
        await session.abortTransaction();
        next(error);
    } finally {
        session.endSession();
    }
};
