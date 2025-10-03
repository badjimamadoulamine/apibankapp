const express = require('express');
const { 
  depot, 
  retrait, 
  getTransactions, 
  cancelTransaction 
} = require('../controllers/transactionController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

router.use(protect); // Toutes les routes après ceci nécessitent un token

// Dépôt : Agent ou Distributeur
router.post('/depot', authorize('agent', 'distributeur'), depot);

// Retrait : Distributeur uniquement
router.post('/retrait', authorize('distributeur'), retrait);

// Annuler transaction : Agent uniquement
router.delete('/cancel/:id', authorize('agent'), cancelTransaction);

// Obtenir transactions : Tous
router.get('/:numero_compte', getTransactions);

// NOTE: Le transfert entre utilisateurs peut être ajouté ici si besoin.

module.exports = router;