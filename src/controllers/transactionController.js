// src/controllers/transactionController.js (CODE FINAL ET COMPLET)

const Transaction = require('../models/Transaction');
const Compte = require('../models/Compte');
// Import de Types pour vérifier si l'ID est un ObjectId valide
const mongoose = require('mongoose');
const { Types } = mongoose;


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
// controllers/transactionController.js

// @desc    Annuler une transaction (Agent uniquement)
// @route   DELETE /api/transactions/:id
// @access  Private (Agent)
// @desc    Annuler une transaction (Agent uniquement)
// @route   DELETE /api/transactions/:id
// @access  Private (Agent)
exports.cancelTransaction = async (req, res, next) => {
    const session = await Compte.startSession();
    session.startTransaction();

    try {
        const transactionId = req.params.id;

        console.log('🔄 Tentative d\'annulation de la transaction:', transactionId);

        let transaction;
        
        // --- 🎯 CORRECTION: Vérifier explicitement si l'ID est un ObjectId valide ---
        if (Types.ObjectId.isValid(transactionId)) {
             // Si c'est un ObjectId valide (24 caractères), on cherche par _id
            transaction = await Transaction.findById(transactionId).session(session);
        } else {
            // Si ce n'est pas un ObjectId, on suppose que c'est un autre identifiant 
            // unique de transaction (ex: un champ 'id_transaction' si vous en avez un)
             transaction = await Transaction.findOne({ 
                id_transaction: transactionId 
            }).session(session);
        }
        // --------------------------------------------------------------------------
        

        if (!transaction) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ 
                success: false, 
                error: 'Transaction introuvable.' 
            });
        }

        // Vérifier si déjà annulée
        if (transaction.est_annule) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ 
                success: false, 
                error: 'Cette transaction a déjà été annulée.' 
            });
        }

        // Vérifier le statut
        if (transaction.statut === 'annulee' || transaction.statut === 'Annulé') {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ 
                success: false, 
                error: 'Transaction déjà annulée.' 
            });
        }

        console.log('✅ Transaction trouvée:', {
            id: transaction._id,
            type: transaction.type,
            montant: transaction.montant,
            emetteur: transaction.numero_compte_emetteur,
            recepteur: transaction.numero_compte_recepteur
        });

        // Chercher le compte concerné (selon le type de transaction)
        let compte;
        
        if (transaction.type === 'depot') {
            // Pour un dépôt : retirer l'argent du compte récepteur
            compte = await Compte.findOne({ 
                numero_compte: transaction.numero_compte_recepteur 
            }).session(session);
        } else if (transaction.type === 'retrait') {
            // Pour un retrait : remettre l'argent au compte émetteur
            compte = await Compte.findOne({ 
                numero_compte: transaction.numero_compte_emetteur 
            }).session(session);
        } else if (transaction.type === 'transfert') {
            // Pour un transfert : gérer les deux comptes
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ 
                success: false, 
                error: 'L\'annulation de transfert n\'est pas encore implémentée.' 
            });
        }
        
        if (!compte) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ 
                success: false, 
                error: 'Compte associé introuvable.' 
            });
        }

        console.log('💰 Solde avant annulation:', compte.solde);

        // Appliquer l'opération inverse
        if (transaction.type === 'depot') {
            // Annuler un dépôt = retirer l'argent
            if (compte.solde < transaction.montant) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({ 
                    success: false, 
                    error: 'Solde insuffisant pour annuler cette transaction.' 
                });
            }
            compte.solde -= transaction.montant;
        } else if (transaction.type === 'retrait') {
            // Annuler un retrait = remettre l'argent
            compte.solde += transaction.montant;
        }

        await compte.save({ session });

        console.log('💰 Solde après annulation:', compte.solde);

        // Marquer la transaction comme annulée
        transaction.est_annule = true;
        transaction.date_annulation = new Date();
        transaction.annule_par = req.user._id || req.user.id;
        transaction.statut = 'annulee';
        await transaction.save({ session });

        // Valider la transaction MongoDB
        await session.commitTransaction();

        console.log('✅ Transaction annulée avec succès');

        res.status(200).json({
            success: true,
            message: `Transaction annulée avec succès.`,
            nouveau_solde: compte.solde,
            data: {
                transaction_id: transaction._id,
                type: transaction.type,
                montant: transaction.montant,
                date_annulation: transaction.date_annulation
            }
        });

    } catch (error) {
        console.error('❌ Erreur lors de l\'annulation:', error);
        await session.abortTransaction();
        
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Erreur lors de l\'annulation de la transaction.' 
        });
    } finally {
        session.endSession();
    }
};
