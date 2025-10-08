const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/database');
const errorHandler = require('./middlewares/errorHandler');

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
  'https://tonfrontend.vercel.app', // ton futur front sur Vercel
];

app.use(cors({
  origin: function (origin, callback) {
    // Autoriser les requêtes sans origin (ex: Postman) ou celles autorisées
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('❌ CORS non autorisé depuis cette origine: ' + origin));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

// -----------------------------------------------------------
// Middlewares globaux
// -----------------------------------------------------------
app.use(express.json()); // Permet de lire les données JSON envoyées par le front

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
// Middleware de gestion des erreurs (à la fin)
// -----------------------------------------------------------
app.use(errorHandler);

// -----------------------------------------------------------
// Démarrage du serveur
// -----------------------------------------------------------
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT} en mode ${process.env.NODE_ENV}`);
});

// -----------------------------------------------------------
// Gérer les promesses rejetées non gérées
// -----------------------------------------------------------
process.on('unhandledRejection', (err) => {
  console.log(`❌ Erreur: ${err.message}`);
  server.close(() => process.exit(1));
});
