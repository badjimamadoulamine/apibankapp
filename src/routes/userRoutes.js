const express = require('express');
const userController = require('../controllers/userController');
const { protect, authorize } = require('../middlewares/auth');
const { validateUserCreation } = require('../utils/validators');

const router = express.Router();

// ------------------------------------------------------------------
// 1. ROUTES PUBLIQUES
// ------------------------------------------------------------------

// POST /api/v1/users/login - Connexion
router.post('/login', userController.login);

// POST /api/v1/users/logout - Déconnexion
router.post('/logout', userController.logout);

// ------------------------------------------------------------------
// 2. MIDDLEWARE DE PROTECTION (Token requis pour toutes les routes ci-dessous)
// ------------------------------------------------------------------
router.use(protect); 

// ------------------------------------------------------------------
// 3. ROUTES PRIVÉES / SÉCURITÉ
// ------------------------------------------------------------------

// PUT /api/v1/users/change-password
router.put('/change-password', userController.changePassword); 

// ------------------------------------------------------------------
// 4. ROUTES PRIVÉES (Nécessitent Token + Rôle Agent)
// ------------------------------------------------------------------

// POST /api/v1/users/ - Créer un utilisateur (Agent)
// GET /api/v1/users/ - Obtenir tous les utilisateurs (Agent)
router.route('/')
    .post(authorize('agent'), validateUserCreation, userController.createUser)
    .get(authorize('agent'), userController.getUsers);

// POST /api/v1/users/bulk-delete - Supprimer plusieurs utilisateurs (Agent)
router.post('/bulk-delete', authorize('agent'), userController.bulkDelete);

// POST /api/v1/users/bulk-block - Bloquer/Débloquer plusieurs utilisateurs (Agent)
router.post('/bulk-block', authorize('agent'), userController.bulkBlock);

// POST /api/v1/users/toggle-block/:id - Basculer le statut bloqué/débloqué (Agent)
router.post('/toggle-block/:id', authorize('agent'), userController.toggleBlockUser);

// ------------------------------------------------------------------
// 5. ROUTES PAR ID (Agent ou Propriétaire)
// ------------------------------------------------------------------

// GET /api/v1/users/compte/:numero_compte - Obtenir par numéro de compte (Agent/Propriétaire)
router.get('/compte/:numero_compte', userController.getUserByNumeroCompte);

// GET /api/v1/users/:id - Obtenir par ID
// PUT /api/v1/users/:id - Mettre à jour par ID
// DELETE /api/v1/users/:id - Supprimer par ID
router.route('/:id')
    .get(userController.getUserById)
    .put(userController.updateUser)
    .delete(authorize('agent'), userController.deleteUser);

module.exports = router;
