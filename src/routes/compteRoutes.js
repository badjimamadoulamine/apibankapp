const express = require('express');
const { getCompte, getComptes } = require('../controllers/compteController');
const { getBalance } = require('../controllers/transactionController'); // getBalance est dans le controller de transaction
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

router.use(protect); // Toutes les routes après ceci nécessitent un token

// Agent uniquement
router.route('/')
  .get(authorize('agent'), getComptes);

// Accès par le titulaire du compte (couvert par 'protect' et vérification dans le contrôleur) ou l'Agent
router.route('/:numero_compte')
  .get(getCompte);

router.route('/:numero_compte/solde')
  .get(getBalance);

module.exports = router;