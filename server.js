const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Express-App initialisieren
const app = express();
const port = 8080;     // HTTP-Port
const securePort = 443; // HTTPS-Port

// SSL-Zertifikate
const options = {
  key: fs.readFileSync('/etc/letsencrypt/live/gruppetews.ddns.net/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/gruppetews.ddns.net/fullchain.pem')
};

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));  // Dient dashboard.html aus dem aktuellen Verzeichnis aus

// Datenbank verbinden
const db = new sqlite3.Database('./gruppenkasse.db', (err) => {
  if (err) {
    console.error('❌ Fehler beim Öffnen der Datenbank:', err.message);
  } else {
    console.log('✅ Datenbank erfolgreich verbunden');
  }
});

// Login-Endpoint
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

// Gesichertes Dashboard
app.get('/secure-dashboard', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (authHeader !== 'Bearer geheim123') {
    return res.status(403).send('Nicht erlaubt – Kein gültiger Zugriffsschlüssel');
  }

  const email = req.query.email;
  if (!email) {
    return res.status(400).send('E-Mail fehlt');
  }

  const sql = 'SELECT email, gruppenfahrt_2025, gruppenkasse_2025 FROM users WHERE email = ?';
  db.get(sql, [email], (err, row) => {
    if (err) {
      console.error('❌ Fehler beim Abrufen der Benutzerdaten:', err.message);
      return res.status(500).send('Interner Serverfehler');
    }

    if (row) {
      fs.readFile(path.join(__dirname, 'dashboard.html'), 'utf8', (err, html) => {
        if (err) {
          console.error('❌ Fehler beim Lesen von dashboard.html:', err.message);
          return res.status(500).send('Fehler beim Laden des Dashboards');
        }

        // Platzhalter ersetzen
        html = html
          .replace('{{email}}', row.email)
          .replace('{{gruppenfahrt}}', row.gruppenfahrt_2025)
          .replace('{{gruppenkasse}}', row.gruppenkasse_2025);

        res.send(html);
      });
    } else {
      res.status(404).send('Benutzer nicht gefunden');
    }
  });
});

// HTTP starten
http.createServer(app).listen(port, () => {
  console.log(`🚀 HTTP-Server läuft auf http://localhost:${port}`);
});

// HTTPS starten
https.createServer(options, app).listen(securePort, () => {
  console.log(`🚀 HTTPS-Server läuft auf https://gruppetews.ddns.net`);
});
