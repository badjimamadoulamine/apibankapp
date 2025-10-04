const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['depot', 'retrait', 'transfert'],
    default: 'depot' // ⚡ Par défaut dépôt si rien n’est envoyé
  },
  montant: {
    type: Number,
    required: true,
    min: [100, 'Le montant minimum est de 100 FCFA']
  },
  numero_compte_emetteur: {
    type: String,
    required: function() {
      return this.type !== 'depot'; // Requis uniquement si ce n’est pas un dépôt
    }
  },
  numero_compte_recepteur: {
    type: String,
    required: true // ⚡ Toujours requis pour dépôt
  },
  effectuee_par: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true // ⚡ sera rempli côté backend (ex: req.user._id)
  },
  statut: {
    type: String,
    enum: ['en_attente', 'validee', 'annulee'],
    default: 'validee' // ⚡ Dépôt validé par défaut
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

},{ timestamps: true });

module.exports = mongoose.model('Transaction', TransactionSchema, 'transactions');
