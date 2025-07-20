const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const app = express();
const port = 8080;
const securePort = 443;

const options = {
  key: fs.readFileSync('/etc/letsencrypt/live/gruppetews.ddns.net/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/gruppetews.ddns.net/fullchain.pem')
};

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname)); // Statische Dateien ausliefern

// Datenbank verbinden
const db = new sqlite3.Database('./gruppenkasse.db', (err) => {
  if (err) {
    console.error('❌ Fehler beim Öffnen der Datenbank:', err.message);
  } else {
    console.log('✅ Datenbank erfolgreich verbunden');
  }
});





// Login-Endpoint für Admin und Nutzer
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Fehlende Felder' });
  }

  const sql = 'SELECT rolle FROM users WHERE email = ? AND password = ?';
  db.get(sql, [email, password], (err, row) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'DB-Fehler' });
    }

    if (row) {
      // Wenn der Benutzer ein Admin ist, sende 'role: admin'
      if (row.rolle === 'admin') {
        res.json({ success: true, role: 'admin' });
      } else {
        // Sonst sende 'role: user'
        res.json({ success: true, role: 'user' });
      }
    } else {
      res.status(401).json({ success: false, message: 'Falsche Zugangsdaten' });
    }
  });
});






// Weiterleitung zu den statischen Dashboards
app.get('/dashboard', (req, res) => {
  const email = req.query.email;

  if (!email) {
    return res.status(400).send('E-Mail fehlt');
  }

  const sql = 'SELECT email, gruppenfahrt_2025, gruppenkasse_2025 FROM users WHERE email = ?';
  db.get(sql, [email], (err, row) => {
    if (err || !row) return res.status(404).send('Benutzer nicht gefunden');

    fs.readFile(path.join(__dirname, 'dashboard.html'), 'utf8', (err, html) => {
      if (err) return res.status(500).send('Fehler beim Laden von dashboard.html');

      // Ersetze die Platzhalter durch die tatsächlichen Werte aus der Datenbank
      html = html
        .replace('{{email}}', row.email)
        .replace('{{gruppenfahrt}}', row.gruppenfahrt_2025)
        .replace('{{gruppenkasse}}', row.gruppenkasse_2025);

      res.send(html); // Gebe die bearbeitete HTML zurück
    });
  });
});







// Admin Dashboard
app.get('/admin-dashboard', (req, res) => {
  // Holt alle Nutzer aus der Datenbank
  db.all('SELECT id, email, gruppenkasse_2025, gruppenfahrt_2025 FROM users', [], (err, rows) => {
    if (err) {
      return res.status(500).send('Datenbankfehler');
    }

    // Lese die admin.html und ersetze die Platzhalter durch die Daten aus der DB
    fs.readFile(path.join(__dirname, 'admin.html'), 'utf8', (err, html) => {
      if (err) return res.status(500).send('Fehler beim Laden von admin.html');

      // Ersetze Platzhalter, um alle Benutzer anzuzeigen
      let usersHtml = '';
      rows.forEach(row => {
        usersHtml += `
          <tr>
            <td>${row.email}</td>
            <td>
              <input type="number" value="${row.gruppenkasse_2025}" id="gruppenkasse_${row.id}" />
            </td>
            <td>
              <input type="number" value="${row.gruppenfahrt_2025}" id="gruppenfahrt_${row.id}" />
            </td>
          </tr>
        `;
      });

      html = html.replace('{{users}}', usersHtml);

      // Gebe die bearbeitete HTML zurück
      res.send(html);
    });
  });
});




// Admin Update (Daten aktualisieren)
app.post('/admin-update', (req, res) => {
  const updates = req.body;

  // Update die Gruppenkasse und Gruppenfahrt Werte
  const stmt = db.prepare('UPDATE users SET gruppenkasse_2025 = ?, gruppenfahrt_2025 = ? WHERE id = ?');

  updates.forEach(user => {
    stmt.run(user.gruppenkasse_2025, user.gruppenfahrt_2025, user.id);
  });

  stmt.finalize();
  res.json({ success: true });
});








http.createServer(app).listen(port, () => {
  console.log(`🚀 HTTP-Server läuft auf http://localhost:${port}`);
});

https.createServer(options, app).listen(securePort, () => {
  console.log(`🚀 HTTPS-Server läuft auf https://gruppetews.ddns.net`);
});

