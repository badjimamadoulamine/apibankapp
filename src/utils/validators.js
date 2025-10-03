const { body, validationResult } = require('express-validator');

// Middleware pour gérer les résultats de la validation
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Transformer l'erreur en un format géré par errorHandler
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
  body('date_naissance')
    .isISO8601()
    .withMessage('La date de naissance doit être une date valide (AAAA-MM-JJ)'),
  body('adresse').trim().notEmpty().withMessage('L\'adresse est requise'),
  body('numero_carte_identite')
    .trim()
    .matches(/^[0-9]{13}$/)
    .withMessage('Le numéro de carte d\'identité doit comporter 13 chiffres'),
  body('mot_de_passe').isLength({ min: 6 }).withMessage('Le mot de passe doit faire au moins 6 caractères'),
  handleValidationErrors
];