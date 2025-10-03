const mongoose = require('mongoose');

const CompteSchema = new mongoose.Schema({
  numero_compte: {
    type: String,
    unique: true,
    required: true,
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
    unique: true // Un utilisateur ne peut avoir qu'un seul compte
  },
  solde: {
    type: Number,
    required: true,
    default: 0,
    min: 0 // Le solde ne peut pas être négatif
  },
  date_creation: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Compte', CompteSchema);