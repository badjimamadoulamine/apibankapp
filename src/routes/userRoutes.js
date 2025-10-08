// userRoutes.js (VERSION CORRIGÉE AVEC UPLOAD)

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

// ------------------------------------------------------------------
// Routes Publiques
// ------------------------------------------------------------------
router.post('/login', userController.login);
router.post('/logout', userController.logout);

// ------------------------------------------------------------------
// Routes Privées (Authentification requise)
// ------------------------------------------------------------------

// 🎯 IMPORTANT: Les routes FIXES doivent venir AVANT les routes paramétrées

// Profil utilisateur connecté
router.get('/profile', protect, userController.getProfile);
router.put('/profile', protect, upload.single('photo'), handleUploadError, userController.updateProfile); // ✅ AVEC GESTION ERREUR
router.put('/change-password', protect, userController.changePassword);

// Route spécifique par numéro de compte
router.get('/compte/:numero_compte', protect, userController.getUserByNumeroCompte);

// ------------------------------------------------------------------
// GESTION DES UTILISATEURS (Agent uniquement)
// ------------------------------------------------------------------

// CRUD Utilisateurs
router.route('/')
    .get(protect, authorize('agent'), userController.getUsers)
    .post(protect, authorize('agent'), userController.createUser);

// 🎯 CETTE ROUTE DOIT VENIR APRÈS LES ROUTES SPÉCIFIQUES
router.route('/:id')
    .get(protect, userController.getUserById)
    .put(protect, authorize('agent'), upload.single('photo'), handleUploadError, userController.updateUser)
    .delete(protect, authorize('agent'), userController.deleteUser);

// Actions de groupe
router.post('/toggle-block/:id', protect, authorize('agent'), userController.toggleBlockUser);
router.post('/bulk-delete', protect, authorize('agent'), userController.bulkDelete);
router.post('/bulk-block', protect, authorize('agent'), userController.bulkBlock);

module.exports = router;