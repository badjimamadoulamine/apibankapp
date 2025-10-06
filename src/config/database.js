// config/database.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(' MongoDB connecté avec succès');
  } catch (error) {
    console.error(' Erreur de connexion MongoDB:', error.message);
    process.exit(1); // Stoppe le serveur si la connexion échoue
  }
};

module.exports = connectDB;
