// Dans routes/userRoutes.js

const express = require('express');
const { 
  login, 
  createUser, 
  getUsers, 
  getUserById, 
  getUserByNumeroCompte, 
  updateUser, 
  deleteUser, 
  bulkDelete,
  toggleBlockUser,
  bulkBlock
} = require('../controllers/userController');
const { protect, authorize } = require('../middlewares/auth');
const { validateUserCreation } = require('../utils/validators');

const router = express.Router();

// Routes publiques
router.post('/login', login);

// Routes privées
router.use(protect); // Toutes les routes après ceci nécessitent un token

// Agent uniquement
router.route('/')
  .post(authorize('agent'), validateUserCreation, createUser)
  .get(authorize('agent'), getUsers);

router.post('/bulk-delete', authorize('agent'), bulkDelete);
router.post('/bulk-block', authorize('agent'), bulkBlock);
router.post('/toggle-block/:id', authorize('agent'), toggleBlockUser);

// Agent ou l'utilisateur lui-même (la logique de propriété est dans userController.js)
router.route('/:id')
  .get(getUserById)
  .put(updateUser)
  .delete(authorize('agent'), deleteUser);

router.get('/compte/:numero_compte', getUserByNumeroCompte);

module.exports = router;