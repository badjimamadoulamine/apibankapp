const express = require('express');
const { 
  depot, 
  retrait, 
  transfert, 
  getTransactions, 
  cancelTransaction 
} = require('../controllers/transactionController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

// Middleware de protection : Toutes les routes après ceci nécessitent un token
router.use(protect); 

// Dépôt : Agent ou Distributeur
// POST /api/transactions/depot
router.post('/depot', authorize('agent', 'distributeur'), depot);

// Retrait : Distributeur uniquement
// POST /api/transactions/retrait
router.post('/retrait', authorize('distributeur'), retrait);

// Transfert : Titulaire du compte (protégé)
// POST /api/transactions/transfert
router.post('/transfert', transfert);

// Annuler transaction : Agent uniquement
// DELETE /api/transactions/:id
router.delete('/:id', authorize('agent'), cancelTransaction);

// Obtenir historique des transactions : Titulaire du compte ou Agent
// GET /api/transactions/:numero_compte
router.get('/', authorize('agent'), getTransactions);
router.get('/:numero_compte', getTransactions);

// NOTE: La route pour obtenir le solde (/api/comptes/:numero_compte/solde) 
// est configurée dans 'compteRoutes.js' mais utilise getBalance de transactionController.

module.exports = router;
