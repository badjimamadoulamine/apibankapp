const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: [true, 'Veuillez ajouter un nom']
  },
  prenom: {
    type: String,
    required: [true, 'Veuillez ajouter un prénom']
  },
    // 🎯 NOTE: Vous n'aviez pas le champ 'email' dans le schéma précédent, mais je l'ajoute
    // car il est présent dans vos requêtes Postman et dans la demande de profil public.
    email: { 
        type: String,
        unique: true,
        required: [true, 'Veuillez ajouter un email'],
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Veuillez ajouter une adresse email valide'
        ]
    },
  telephone: {
    type: String,
    required: [true, 'Veuillez ajouter un numéro de téléphone'],
    unique: true
  },
  date_naissance: {
    type: Date,
    required: [true, 'Veuillez ajouter une date de naissance']
  },
  adresse: {
    type: String,
    required: [true, 'Veuillez ajouter une adresse']
  },
  numero_carte_identite: {
    type: String,
    required: [true, 'Veuillez ajouter un numéro de carte d\'identité'],
    unique: true
  },
  numero_compte: { // Le numéro de compte bancaire lié
    type: String,
    unique: true,
    required: true,
    default: function() {
      // Générer un numéro de compte unique (exemple simple)
      const datePart = Date.now().toString().slice(-4);
      const randomPart = Math.floor(100000 + Math.random() * 900000);
      return `CM-${datePart}-${randomPart}`;
    }
  },
  role: {
    type: String,
    enum: ['client', 'agent', 'distributeur'],
    default: 'client'
  },
  mot_de_passe: {
    type: String,
    required: [true, 'Veuillez ajouter un mot de passe'],
    minlength: 6,
    select: false // Ne pas retourner le mot de passe par défaut
  },
  blocked: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: function() {
      return this.role !== 'agent' && this.role !== 'client'; // Requis UNIQUEMENT pour 'distributeur'
    }
  },
  date_creation: {
    type: Date,
    default: Date.now
  }
});

// Chiffrer le mot de passe avant de sauvegarder
UserSchema.pre('save', async function(next) {
  if (!this.isModified('mot_de_passe')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.mot_de_passe = await bcrypt.hash(this.mot_de_passe, salt);
});

// Méthode pour comparer le mot de passe
UserSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.mot_de_passe);
};

// 🎯 FIX: getPublicProfile mis à jour avec tous les champs non-sensibles
UserSchema.methods.getPublicProfile = function() {
    return {
        id: this._id,
        nom: this.nom,
        prenom: this.prenom,
        email: this.email,
        telephone: this.telephone,
        date_naissance: this.date_naissance,
        adresse: this.adresse,
        numero_carte_identite: this.numero_carte_identite,
        role: this.role,
        numero_compte: this.numero_compte,
        blocked: this.blocked,
        date_creation: this.date_creation,
    };
};

module.exports = mongoose.model('User', UserSchema);