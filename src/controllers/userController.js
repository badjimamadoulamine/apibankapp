// src/controllers/userController.js (CODE FINAL CORRIGÉ ET COMPLET)

const User = require('../models/User');
const Compte = require('../models/Compte');
const jwt = require('jsonwebtoken');

// ------------------------------------------------------------------
// UTILS
// ------------------------------------------------------------------

// Générer le token JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d'
    });
};

// ------------------------------------------------------------------
// 1. AUTHENTIFICATION & PROFIL
// ------------------------------------------------------------------

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

        // L'utilisateur est authentifié et non bloqué
        res.status(200).json({
            success: true,
            token: generateToken(user._id),
            userId: user._id,
            role: user.role,
            numero_compte: user.numero_compte,
            nom: user.nom,
            prenom: user.prenom
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Logout utilisateur
// @route   POST /api/users/logout
// @access  Public
exports.logout = (req, res, next) => {
    res.status(200).json({ success: true, message: 'Déconnexion réussie.' });
};

// @desc    Changer le mot de passe de l'utilisateur connecté
// @route   PUT /api/users/change-password
// @access  Private (Utilisateur connecté, via req.user.id)
exports.changePassword = async (req, res, next) => {
    try {
        const { oldPassword, newPassword, confirmPassword } = req.body;

        if (!oldPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ success: false, error: 'Tous les champs de mot de passe sont requis.' });
        }
        
        if (newPassword.length < 6) {
             return res.status(400).json({ success: false, error: 'Le nouveau mot de passe doit faire au moins 6 caractères.' });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ success: false, error: 'Le nouveau mot de passe et la confirmation ne correspondent pas.' });
        }

        const user = await User.findById(req.user.id).select('+mot_de_passe'); 

        if (!user) {
            return res.status(404).json({ success: false, error: 'Utilisateur non trouvé.' });
        }

        if (!(await user.comparePassword(oldPassword))) {
            return res.status(401).json({ success: false, error: 'Ancien mot de passe incorrect.' });
        }

        user.mot_de_passe = newPassword;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Mot de passe mis à jour avec succès.',
            data: user.getPublicProfile()
        });
    } catch (error) {
        next(error);
    }
};

// ------------------------------------------------------------------
// 2. GESTION DES UTILISATEURS (CRUD + Actions)
// ------------------------------------------------------------------
// @desc    Créer un nouvel utilisateur (Client, Agent, Distributeur)
// @route   POST /api/users
// @access  Private (Agent uniquement)
exports.createUser = async (req, res, next) => {
    try {
        const { role, ...rest } = req.body;
        const userRole = role ? role.toLowerCase() : 'client';
        const creatorId = req.user?.id;

        // Préparer les données utilisateur
        const userData = {
            ...rest,
            role: userRole,
            ...(userRole === 'distributeur' ? { createdBy: creatorId } : {})
        };

        // 1️⃣ Création de l’utilisateur
        const user = await User.create(userData);

        // 2️⃣ Vérifier si l’utilisateur a déjà un compte (par sécurité)
        const compteExist = await Compte.findOne({ user: user._id });
        if (compteExist) {
            return res.status(400).json({
                success: false,
                message: "Cet utilisateur possède déjà un compte."
            });
        }

        // 3️⃣ Création du compte associé
        let compte;
        try {
            compte = await Compte.create({
                user: user._id,
                numero_compte: user.numero_compte,
                solde: 0
            });
            console.log('Compte créé avec succès :', compte);
        } catch (err) {
            console.error('Erreur création compte :', err);

            // Supprimer l’utilisateur si le compte n’a pas pu être créé
            await User.findByIdAndDelete(user._id);
            return res.status(500).json({
                success: false,
                message: "Impossible de créer le compte pour cet utilisateur."
            });
        }

        // 4️⃣ Réponse
        res.status(201).json({
            success: true,
            message: `Utilisateur (${userRole}) et compte créés avec succès.`,
            data: {
                user: user.getPublicProfile(),
                compte
            },
            token: generateToken(user._id)
        });

    } catch (error) {
        console.error("Erreur création utilisateur :", error);

        // Gestion des erreurs MongoDB liées aux uniques
        if (error.code === 11000) {
            const field = Object.keys(error.keyValue)[0];
            return res.status(400).json({
                success: false,
                message: `Le ${field} existe déjà. Veuillez en utiliser un autre.`
            });
        }

        next(error);
    }
};
// @desc    Obtenir tous les utilisateurs
// @route   GET /api/users
// @access  Private (Agent uniquement)
exports.getUsers = async (req, res, next) => {
    try {
        const total = await User.countDocuments();
        const users = await User.find().select('-mot_de_passe');

        res.status(200).json({
            success: true,
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
// @access  Private (Agent ou Propriétaire)
exports.getUserById = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id).select('-mot_de_passe');

        if (!user) {
            return res.status(404).json({ success: false, error: 'Utilisateur non trouvé' });
        }

        if (req.user.role !== 'agent' && req.user.id !== user._id.toString()) {
            return res.status(403).json({ success: false, error: 'Non autorisé à consulter ce profil' });
        }

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        next(error);
    }
};

// 🎯 NOUVELLE FONCTION AJOUTÉE : getUserByNumeroCompte
// @desc    Obtenir un utilisateur par numéro de compte
// @route   GET /api/users/compte/:numero_compte
// @access  Private (Agent ou Propriétaire)
exports.getUserByNumeroCompte = async (req, res, next) => {
    try {
        const { numero_compte } = req.params;
        const user = await User.findOne({ numero_compte });
        if (!user) {
            return res.status(404).json({ success: false, message: "Utilisateur non trouvé pour ce numéro de compte" });
        }
        res.status(200).json({ success: true, data: user.getPublicProfile() });
    } catch (error) {
        next(error);
    }
};

// @desc    Mettre à jour un utilisateur par ID
// @route   PUT /api/users/:id
// @access  Private (Agent uniquement)
exports.updateUser = async (req, res, next) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!user) {
            return res.status(404).json({ success: false, message: "Utilisateur non trouvé" });
        }

        res.status(200).json({
            success: true,
            data: user.getPublicProfile()
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
        const user = await User.findByIdAndDelete(req.params.id);

        if (!user) {
            return res.status(404).json({ success: false, error: 'Utilisateur non trouvé' });
        }
        
        await Compte.deleteOne({ user: req.params.id });

        res.status(200).json({
            success: true,
            message: 'Utilisateur et compte associés supprimés avec succès'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Suppression multiple
// @route   POST /api/users/bulk-delete
// @access  Private (Agent uniquement)
exports.bulkDelete = async (req, res, next) => {
    try {
        const { ids } = req.body;
        await User.deleteMany({ _id: { $in: ids } });
        await Compte.deleteMany({ user: { $in: ids } });

        res.status(200).json({
            success: true,
            message: `${ids.length} utilisateur(s) et compte(s) supprimé(s)`
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
            data: user.getPublicProfile()
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
            { $set: { blocked: block } }
        );

        res.status(200).json({
            success: true,
            message: `${ids.length} utilisateur(s) ${block ? 'bloqué(s)' : 'débloqué(s)'} avec succès`
        });
    } catch (error) {
        next(error);
    }
};