// src/routes/compteRoutes.js (CODE FINAL ET CORRIGÉ)

const express = require('express');
const { 
  getCompte, 
  getComptes, 
  getBalance, // 👈 Doit être exporté par compteController.js
} = require('../controllers/compteController'); 
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

// Middleware de protection : Toutes les routes après ceci nécessitent un token
router.use(protect); 

// ------------------------------------------------------------------
// 1. ROUTES DE GESTION (AGENT UNIQUEMENT)
// ------------------------------------------------------------------

// GET /api/comptes - Obtenir tous les comptes
router.route('/')
    .get(authorize('agent'), getComptes);

// ------------------------------------------------------------------
// 2. ROUTES PAR NUMÉRO DE COMPTE (AGENT OU PROPRIÉTAIRE)
// ------------------------------------------------------------------

// Route pour obtenir le solde
// GET /api/comptes/:numero_compte/solde
router.get('/:numero_compte/solde', getBalance); // 👈 C'est la ligne 19 qui posait problème

// Route pour obtenir les informations complètes du compte
// GET /api/comptes/:numero_compte
router.get('/:numero_compte', getCompte); 


module.exports = router;