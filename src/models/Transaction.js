const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['depot', 'retrait', 'transfert'], // Types de transactions
    required: true
  },
  montant: {
    type: Number,
    required: true,
    min: [100, 'Le montant minimum est de 100 FCFA']
  },
  numero_compte_emetteur: {
    type: String,
    required: function() {
      return this.type !== 'depot'; // Requis pour retrait et transfert
    }
  },
  numero_compte_recepteur: {
    type: String,
    required: function() {
      return this.type !== 'retrait'; // Requis pour dépôt et transfert
    }
  },
  effectuee_par: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true // L'utilisateur (Agent ou Distributeur) qui a initié l'action
  },
  statut: {
    type: String,
    enum: ['en_attente', 'validee', 'annulee'],
    default: 'validee' // La plupart des transactions initiées sont validées immédiatement
  },
  motif_annulation: {
    type: String,
    required: function() {
      return this.statut === 'annulee';
    }
  },
  date_transaction: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Transaction', TransactionSchema);