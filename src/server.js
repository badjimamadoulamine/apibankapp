const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/database');
const errorHandler = require('./middlewares/errorHandler');

// Charger les variables d'environnement
dotenv.config({ path: './.env' });

// Connexion à la base de données
connectDB();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json()); // Body parser pour lire les données JSON

// Importer les routes
const userRoutes = require('./routes/userRoutes');
const compteRoutes = require('./routes/compteRoutes');
const transactionRoutes = require('./routes/transactionRoutes');

// Monter les routes
app.use('/api/users', userRoutes);
app.use('/api/comptes', compteRoutes);
app.use('/api/transactions', transactionRoutes);

// Middleware de gestion d'erreurs (doit être le dernier)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(
  PORT,
  () => console.log(`🚀 Serveur démarré en mode ${process.env.NODE_ENV} sur le port ${PORT}`)
);

// Gérer les promesses rejetées non gérées (unhandled rejections)
process.on('unhandledRejection', (err, promise) => {
  console.log(`❌ Erreur: ${err.message}`);
  // Fermer le serveur & quitter le processus
  server.close(() => process.exit(1));
});