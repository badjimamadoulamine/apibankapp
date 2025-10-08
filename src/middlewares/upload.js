// middleware/upload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Créer le dossier uploads s'il n'existe pas
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('✅ Dossier uploads créé');
}

// Configuration du stockage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Générer un nom unique : timestamp + extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        const filename = 'profile-' + uniqueSuffix + extension;
        console.log('📸 Fichier uploadé:', filename);
        cb(null, filename);
    }
});

// Filtrage des fichiers
const fileFilter = (req, file, cb) => {
    console.log('🔍 Vérification fichier:', {
        nom: file.originalname,
        type: file.mimetype,
        taille: file.size
    });

    // Vérifier que c'est bien une image
    if (file.mimetype.startsWith('image/')) {
        console.log('✅ Fichier image accepté');
        cb(null, true);
    } else {
        console.log('❌ Fichier non image rejeté:', file.mimetype);
        cb(new Error('Seules les images sont autorisées!'), false);
    }
};

// Configuration multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max
    }
});

// Middleware de gestion d'erreur
const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'La taille du fichier ne doit pas dépasser 5 Mo'
            });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
                success: false,
                error: 'Champ de fichier inattendu'
            });
        }
    } else if (err) {
        return res.status(400).json({
            success: false,
            error: err.message
        });
    }
    next();
};

module.exports = {
    upload,
    handleUploadError
};