const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/database');
const errorHandler = require('./middlewares/errorHandler');
const path = require('path'); // ✅ AJOUT IMPORTANT

// Charger les variables d'environnement
dotenv.config({ path: './.env' });

// Connexion à la base de données MongoDB Atlas
connectDB();

const app = express();

// -----------------------------------------------------------
// 🧠 CONFIGURATION CORS (⚠️ essentielle pour Render + Vercel)
// -----------------------------------------------------------
const allowedOrigins = [
  'http://localhost:5173',          // ton front local (Vite)
  'http://localhost:3000',          // autre port local
  'https://tonfrontend.vercel.app', // ton futur front sur Vercel
  process.env.FRONTEND_URL,         // URL depuis les variables d'environnement
].filter(Boolean); // Retire les valeurs undefined

app.use(cors({
  origin: function (origin, callback) {
    // En développement, autoriser toutes les origines
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // En production, vérifier les origines autorisées
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('❌ CORS non autorisé depuis:', origin);
      callback(new Error('CORS non autorisé'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// -----------------------------------------------------------
// Middlewares globaux
// -----------------------------------------------------------
app.use(express.json({ limit: '10mb' })); // ✅ AUGMENTER LA LIMITE POUR LES IMAGES
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 🎯 SERVIR LES FICHIERS STATIQUES (CRITIQUE POUR LES PHOTOS)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// -----------------------------------------------------------
// Route de santé (health check)
// -----------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: '🚀 API BankApp opérationnelle',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// -----------------------------------------------------------
// Routes principales
// -----------------------------------------------------------
const userRoutes = require('./routes/userRoutes');
const compteRoutes = require('./routes/compteRoutes');
const transactionRoutes = require('./routes/transactionRoutes');

app.use('/api/users', userRoutes);
app.use('/api/comptes', compteRoutes);
app.use('/api/transactions', transactionRoutes);

// -----------------------------------------------------------
// Route fallback pour les routes non trouvées
// -----------------------------------------------------------
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `Route non trouvée: ${req.originalUrl}`
  });
});

// -----------------------------------------------------------
// Middleware de gestion des erreurs (à la fin)
// -----------------------------------------------------------
app.use(errorHandler);

// -----------------------------------------------------------
// Démarrage du serveur
// -----------------------------------------------------------
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT} en mode ${process.env.NODE_ENV}`);
  console.log(`📁 Dossier uploads: ${path.join(__dirname, 'uploads')}`);
});

// -----------------------------------------------------------
// Gérer les promesses rejetées non gérées
// -----------------------------------------------------------
process.on('unhandledRejection', (err) => {
  console.log(`❌ Erreur non gérée: ${err.message}`);
  console.error(err.stack);
  server.close(() => process.exit(1));
});

// Gérer les exceptions non capturées
process.on('uncaughtException', (err) => {
  console.log(`❌ Exception non capturée: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});