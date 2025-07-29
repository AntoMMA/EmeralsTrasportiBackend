const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cloudinary = require('cloudinary').v2;
const Busboy = require('busboy');
const path = require('path');
const os = require('os');
const fs = require('fs');

admin.initializeApp();
const db = admin.firestore();

// Configura Cloudinary usando le variabili d'ambiente
cloudinary.config({
  cloud_name: functions.config().cloudinary.cloud_name,
  api_key: functions.config().cloudinary.api_key,
  api_secret: functions.config().cloudinary.api_secret
});

// Endpoint per l'upload degli aggiornamenti
exports.uploadUpdate = functions.https.onRequest(async (req, res) => {
  // Solo richieste POST
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  // Autenticazione (Esempio: solo utenti autorizzati possono caricare)
  // Puoi implementare qui una logica di autenticazione più robusta
  // ad esempio, verificando un token Firebase ID, un API key, o un ruolo utente.
  // Per ora, lasceremo un placeholder:
  // if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
  //   return res.status(403).send('Unauthorized');
  // }
  // const idToken = req.headers.authorization.split('Bearer ')[1];
  // try {
  //   const decodedIdToken = await admin.auth().verifyIdToken(idToken);
  //   if (!decodedIdToken.admin) { // Assumi un custom claim 'admin'
  //     return res.status(403).send('Forbidden: Not an admin');
  //   }
  // } catch (error) {
  //   return res.status(403).send('Unauthorized: Invalid token');
  // }

  const busboy = Busboy({ headers: req.headers });
  const fields = {};
  const uploads = {};

  busboy.on('file', (fieldname, file, filename) => {
    const filepath = path.join(os.tmpdir(), filename.filename);
    uploads[fieldname] = { file: filepath, filename: filename.filename };
    file.pipe(fs.createWriteStream(filepath));
  });

  busboy.on('field', (fieldname, val) => {
    fields[fieldname] = val;
  });

  busboy.on('finish', async () => {
    try {
      if (!uploads.updateFile) {
        return res.status(400).send('No update file uploaded.');
      }

      const { file, filename } = uploads.updateFile;
      const { version, description, releaseDate, platform } = fields;

      if (!version || !description || !releaseDate || !platform) {
        fs.unlinkSync(file); // Pulizia file temporaneo
        return res.status(400).send('Missing required fields: version, description, releaseDate, platform.');
      }

      // Carica il file su Cloudinary
      const result = await cloudinary.uploader.upload(file, {
        resource_type: "raw", // Per file ZIP o generici
        folder: `app_updates/${platform}`, // Organizza per piattaforma (es. desktop, android)
        public_id: `${platform}_v${version.replace(/\./g, '_')}_${Date.now()}` // ID pubblico unico
      });

      // Salva i metadati dell'aggiornamento su Firestore
      await db.collection('appUpdates').doc(platform).set({
        latestVersion: version,
        description: description,
        releaseDate: releaseDate,
        downloadUrl: result.secure_url,
        // Puoi aggiungere altri metadati qui, es. hash del file, dimensioni, ecc.
      }, { merge: true }); // 'merge: true' aggiorna o crea il documento

      fs.unlinkSync(file); // Pulizia del file temporaneo dopo l'upload

      res.status(200).send(`Update v${version} for ${platform} uploaded successfully! Download URL: ${result.secure_url}`);

    } catch (error) {
      console.error('Error uploading update:', error);
      if (uploads.updateFile && fs.existsSync(uploads.updateFile.file)) {
        fs.unlinkSync(uploads.updateFile.file); // Assicurati la pulizia in caso di errore
      }
      res.status(500).send('Failed to upload update: ' + error.message);
    }
  });

  // Gestisce lo streaming della richiesta
  busboy.end(req.rawBody);
});

// Endpoint per ottenere l'ultima versione di un aggiornamento
exports.checkUpdate = functions.https.onCall(async (data, context) => {
  const { platform } = data; // es. 'desktop', 'android'

  if (!platform) {
    throw new functions.https.HttpsError('invalid-argument', 'Platform is required.');
  }

  try {
    const docRef = db.collection('appUpdates').doc(platform);
    const docSnapshot = await docRef.get();

    if (!docSnapshot.exists) {
      return { updateAvailable: false, message: `No updates found for platform: ${platform}` };
    }

    const updateData = docSnapshot.data();
    return {
      updateAvailable: true,
      latestVersion: updateData.latestVersion,
      description: updateData.description,
      releaseDate: updateData.releaseDate,
      downloadUrl: updateData.downloadUrl,
      message: `Update found for ${platform}. Latest version: ${updateData.latestVersion}`
    };
  } catch (error) {
    console.error('Error checking for update:', error);
    throw new functions.https.HttpsError('internal', 'Failed to check for update.', error.message);
  }
});