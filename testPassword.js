const bcrypt = require('bcryptjs');

// Le hash stocké dans votre base de données pour l'utilisateur SN0000000001
const hashFromDB = '$2a$10$kLo.SX0ZLXMM.cIBxPmGpuX0SbeY.SddRIx6wX5B7gnR80qgvlWde';

// Liste de mots de passe à tester
const passwordsToTest = [
  'passer123',
  '123456',
  'password',
  'agent123',
  'Passer123',
  'PASSER123'
];

async function testPasswords() {
  console.log('🔐 Test des mots de passe...\n');
  
  for (const pwd of passwordsToTest) {
    const isValid = await bcrypt.compare(pwd, hashFromDB);
    console.log(`${isValid ? '✅' : '❌'} "${pwd}" → ${isValid ? 'VALIDE' : 'Invalide'}`);
  }
  
  console.log('\n---\n');
  
  // Générer un nouveau hash pour "passer123"
  console.log('🔑 Génération d\'un nouveau hash pour "passer123":');
  const salt = await bcrypt.genSalt(10);
  const newHash = await bcrypt.hash('passer123', salt);
  console.log('Nouveau hash:', newHash);
  
  // Vérifier que le nouveau hash fonctionne
  const testNewHash = await bcrypt.compare('passer123', newHash);
  console.log('Test du nouveau hash:', testNewHash ? '✅ VALIDE' : '❌ Invalide');
}

testPasswords();