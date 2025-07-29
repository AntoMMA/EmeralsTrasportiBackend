// Carica le variabili d'ambiente dal file .env (per sviluppo locale)
require('dotenv').config();

const express = require('express');
const cloudinary = require('cloudinary').v2;
const Busboy = require('busboy');
const path = require('path');
const os = require('os');
const fs = require('fs');
const admin = require('firebase-admin');
const cors = require('cors'); // Importa cors

const app = express();
const PORT = process.env.PORT || 3000; // Il server ascolterà sulla porta 3000 o quella definita dall'ambiente

// Middleware per CORS (Cross-Origin Resource Sharing)
// Questo è fondamentale per permettere alla tua web app (Electron/Capacitor) di chiamare questo server.
// Per sviluppo, usiamo '*', in produzione dovresti restringere al dominio specifico della tua app.
app.use(cors());

// Inizializza Firebase Admin SDK
// Sostituisci questo con il percorso al tuo file JSON delle credenziali del Service Account.
// Questo file lo scaricheremo al prossimo passaggio.
const serviceAccount = require('./serviceAccountKey.json'); // AGGIORNA QUESTO PERCORSO!

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// Configura Cloudinary usando le variabili d'ambiente
// Useremo dotenv per leggerle dal file .env in locale, e le variabili d'ambiente sul servizio di hosting.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Endpoint per l'upload degli aggiornamenti (API POST)
app.post('/uploadUpdate', (req, res) => {
  const busboy = Busboy({ headers: req.headers });
  const fields = {};
  const uploads = {};

  busboy.on('file', (fieldname, file, filename) => {
    // Controlla il nome del file per sicurezza
    const sanitizedFilename = path.basename(filename.filename); // Estrae solo il nome del file per evitare path traversal
    const filepath = path.join(os.tmpdir(), sanitizedFilename);
    uploads[fieldname] = { file: filepath, filename: sanitizedFilename };
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
      const { version, description, releaseDate, platform, authToken } = fields; // Aggiunto authToken per esempio

      if (!version || !description || !releaseDate || !platform) {
        fs.unlinkSync(file); // Pulizia file temporaneo
        return res.status(400).send('Missing required fields: version, description, releaseDate, platform.');
      }

      // --- Esempio di Autenticazione Server-Side (molto semplificato) ---
      // In un'applicazione reale, useresti token JWT, API keys, o sistemi OAuth più robusti.
      // Questo è un placeholder: assicurati che solo gli utenti autorizzati possano caricare.
      if (authToken !== process.env.UPLOAD_AUTH_TOKEN) { // AUTH_TOKEN da definire nel .env o variabili d'ambiente del server
         fs.unlinkSync(file);
         return res.status(403).send('Unauthorized to upload updates.');
      }
      // -----------------------------------------------------------------


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

      res.status(200).json({
        message: `Update v${version} for ${platform} uploaded successfully!`,
        downloadUrl: result.secure_url
      });

    } catch (error) {
      console.error('Error uploading update:', error);
      if (uploads.updateFile && fs.existsSync(uploads.updateFile.file)) {
        fs.unlinkSync(uploads.updateFile.file); // Assicurati la pulizia in caso di errore
      }
      res.status(500).send('Failed to upload update: ' + error.message);
    }
  });

  // Avvia il parsing del form data, incanalando la richiesta HTTP in ingresso in busboy
  req.pipe(busboy);
  // ^^^^^^^^^^^ QUESTA È LA RIGA MODIFICATA

  // Non c'è più bisogno di busboy.end(req.rawBody);
  // La gestione dell'errore 'error' sull'istanza busboy è già gestita dal try/catch
  // del blocco asincrono.

  // Gestisce lo streaming della richiesta
  req.pipe(busboy); // Questo incanala la richiesta direttamente in busboy
});

// Endpoint per ottenere l'ultima versione di un aggiornamento (API GET)
app.get('/checkUpdate', async (req, res) => {
  const { platform } = req.query; // Piattaforma è passata come query parameter (es. /checkUpdate?platform=desktop)

  if (!platform) {
    return res.status(400).send('Platform query parameter is required.');
  }

  try {
    const docRef = db.collection('appUpdates').doc(platform);
    const docSnapshot = await docRef.get();

    if (!docSnapshot.exists) {
      return res.status(200).json({ updateAvailable: false, message: `No updates found for platform: ${platform}` });
    }

    const updateData = docSnapshot.data();
    return res.status(200).json({
      updateAvailable: true,
      latestVersion: updateData.latestVersion,
      description: updateData.description,
      releaseDate: updateData.releaseDate,
      downloadUrl: updateData.downloadUrl,
      message: `Update found for ${platform}. Latest version: ${updateData.latestVersion}`
    });
  } catch (error) {
    console.error('Error checking for update:', error);
    res.status(500).send('Failed to check for update: ' + error.message);
  }
});

// Avvia il server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`Access checkUpdate at http://localhost:${PORT}/checkUpdate?platform=desktop`);
  console.log(`Upload updates at http://localhost:${PORT}/uploadUpdate (POST request)`);
});