const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const https = require('https');
const fs = require('fs');
const http = require('http');

// Initialisiere Express
const app = express();
const port = 8080; // HTTP Port für Weiterleitungen
const securePort = 443; // HTTPS Port

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Datenbankpfad
const db = new sqlite3.Database('/home/daniel/datenbank_gruppenkasse/gruppenkasse.db', (err) => {
  if (err) {
    console.error('❌ Fehler beim Öffnen der Datenbank:', err.message);
  } else {
    console.log('✅ Datenbank erfolgreich verbunden');
  }
});

// Beispiel Login-Endpoint
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Fehlende Felder' });
  }

  const sql = 'SELECT COUNT(*) AS count FROM users WHERE email = ? AND password = ?';
  db.get(sql, [email, password], (err, row) => {
    if (err) {
      console.error('❌ Datenbankfehler:', err.message);
      return res.status(500).json({ success: false, message: 'DB-Fehler' });
    }

    if (row.count > 0) {
      res.json({ success: true });
    } else {
      res.status(401).json({ success: false, message: 'Falsche Zugangsdaten' });
    }
  });
});

// Endpoint für das gesicherte Dashboard (mit dynamischen Benutzerdaten)
app.get('/secure-dashboard', (req, res) => {
  const authHeader = req.headers['authorization'];

  if (authHeader !== 'Bearer geheim123') {
    return res.status(403).send('Nicht erlaubt – Kein gültiger Zugriffsschlüssel');
  }

  const email = req.query.email;  // Die E-Mail, die beim Login verwendet wurde

  if (!email) {
    return res.status(400).send('E-Mail fehlt');
  }

  // Hole die Benutzerdaten aus der Datenbank
  const sql = 'SELECT email, gruppenfahrt_2025, gruppenkasse_2025 FROM users WHERE email = ?';
  db.get(sql, [email], (err, row) => {
    if (err) {
      console.error('❌ Fehler beim Abrufen der Benutzerdaten:', err.message);
      return res.status(500).send('Interner Serverfehler');
    }

    if (row) {
      // Ersetze Platzhalter im HTML mit den Benutzerdaten
      const dashboardHtml = `
        <html>
        <head><title>Dashboard</title></head>
        <body>
          <h1>Willkommen, ${row.email}</h1>
          <p>Gruppenfahrt 2025: ${row.gruppenfahrt_2025} €</p>
          <p>Gruppenkasse 2025: ${row.gruppenkasse_2025} €</p>
        </body>
        </html>
      `;
      res.send(dashboardHtml);  // Dynamisches HTML zurücksenden
    } else {
      res.status(404).send('Benutzer nicht gefunden');
    }
  });
});

// Starte HTTP-Server (Port 80 für Weiterleitung)
http.createServer(app).listen(port, () => {
  console.log(`🚀 HTTP-Server läuft auf http://localhost:${port}`);
});

// Lade SSL-Zertifikat und Schlüssel für HTTPS
const options = {
  key: fs.readFileSync('/etc/letsencrypt/live/gruppetews.ddns.net/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/gruppetews.ddns.net/fullchain.pem'),
};

// Starte HTTPS-Server
https.createServer(options, app).listen(securePort, () => {
  console.log(`🚀 HTTPS-Server läuft auf https://gruppetews.ddns.net`);
});
