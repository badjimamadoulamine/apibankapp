// [Votre fichier de validation]

const { body, validationResult } = require('express-validator');

// Middleware pour gérer les résultats de la validation
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const firstError = errors.array()[0].msg;
    return res.status(400).json({
      success: false,
      error: firstError
    });
  }
  next();
};

// Validation pour la création d'utilisateur
exports.validateUserCreation = [
  body('nom').trim().notEmpty().withMessage('Le nom est requis'),
  body('prenom').trim().notEmpty().withMessage('Le prénom est requis'),
  body('telephone')
    .matches(/^\+221[0-9]{9}$/)
    .withMessage('Format de téléphone invalide (+221XXXXXXXXX)'),
    
  // 🎯 CORRECTION MAJEURE POUR LE FORMAT DE DATE
  body('date_naissance')
    .trim()
    .notEmpty().withMessage('La date de naissance est requise')
    // 1. Validation du format JJ/MM/AAAA
    .matches(/^\d{2}\/\d{2}\/\d{4}$/) 
    .withMessage('La date de naissance doit être au format JJ/MM/AAAA (ex: 31/12/1990)')
    // 2. Conversion (Sanitization) pour la BDD
    .customSanitizer(value => {
        // Transforme "JJ/MM/AAAA" en objet Date
        // Le format standard JS est MM/JJ/AAAA
        const parts = value.split('/'); 
        return new Date(`${parts[1]}/${parts[0]}/${parts[2]}`);
    })
    // 3. Validation de la validité de la Date (vérifie si 30/02/2024 n'est pas accepté)
    .custom(value => {
        if (isNaN(value.getTime())) {
            throw new Error('Cette date n\'est pas une date calendaire valide.');
        }
        return true;
    }),

  body('adresse').trim().notEmpty().withMessage('L\'adresse est requise'),
  body('numero_carte_identite')
    .trim()
    .matches(/^[0-9]{13}$/)
    .withMessage('Le numéro de carte d\'identité doit comporter 13 chiffres'),
  body('mot_de_passe').isLength({ min: 6 }).withMessage('Le mot de passe doit faire au moins 6 caractères'),
  
  // Gestion des erreurs
  handleValidationErrors
];