// ==== 📦 Module einbinden ==== //
const express = require('express')         // Webserver-Framework
const sqlite3 = require('sqlite3').verbose() // SQLite-Unterstützung
const bodyParser = require('body-parser')  // Zum Parsen von JSON im Request-Body
const cors = require('cors')               // Um Anfragen vom Nuxt-Frontend zuzulassen
const fs = require('fs')                   // Zum Lesen von Dateien (z. B. dashboard.html)
const path = require('path')               // Um Pfade plattformunabhängig zu bauen

// ==== 🚀 Express-App starten ==== //
const app = express()
const port = 8080 // Dein Backend läuft dann z. B. unter http://192.168.178.86:8080

// ==== 🔧 Middleware konfigurieren ==== //
app.use(cors())                 // Erlaube Anfragen von anderen Ursprüngen (CORS)
app.use(bodyParser.json())      // JSON-Daten aus POST-Anfragen lesen können

// ==== 🔌 Datenbankverbindung ==== //
const dbPath = '/home/daniel/datenbank_gruppenkasse/gruppenkasse.db' // Pfad zu deiner DB
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Fehler beim Öffnen der Datenbank:', err.message)
  } else {
    console.log('✅ Datenbank erfolgreich verbunden:', dbPath)
  }
})


// ==== 🔐 LOGIN-ENDPUNKT ==== //
// Frontend sendet hier E-Mail und Passwort → wird geprüft
app.post('/login', (req, res) => {
  const { email, password } = req.body

  // Felder prüfen
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Fehlende Felder' })
  }

  // DB-Abfrage: gibt es den Benutzer?
  const sql = 'SELECT COUNT(*) AS count FROM users WHERE email = ? AND password = ?'
  db.get(sql, [email, password], (err, row) => {
    if (err) {
      console.error('❌ Datenbankfehler:', err.message)
      return res.status(500).json({ success: false, message: 'DB-Fehler' })
    }

    // Ergebnis prüfen
    if (row.count > 0) {
      console.log(`✅ Login erfolgreich für: ${email}`)
      res.json({ success: true })
    } else {
      console.warn(`❌ Ungültige Zugangsdaten für: ${email}`)
      res.status(401).json({ success: false, message: 'Falsche Zugangsdaten' })
    }
  })
})


// ==== 🔒 GESCHÜTZTE SEITE ==== //
// Diese Seite wird nur ausgeliefert, wenn der richtige Authorization-Header gesetzt ist
app.get('/secure-dashboard', (req, res) => {
  const authHeader = req.headers['authorization']

  // Schutz durch ein einfaches geheimes Token
  if (authHeader !== 'Bearer geheim123') {
    return res.status(403).send('Nicht erlaubt – Kein gültiger Zugriffsschlüssel')
  }

  // dashboard.html laden
  const dashboardPath = path.join(__dirname, 'dashboard.html')
  fs.readFile(dashboardPath, 'utf8', (err, data) => {
    if (err) {
      console.error('❌ Fehler beim Lesen der dashboard.html:', err.message)
      return res.status(500).send('Fehler beim Laden der Seite')
    }
    res.send(data) // HTML-Inhalt an Browser senden
  })
})

// ==== 📤 BENUTZERDATEN LADEN ==== //
// Frontend sendet Email → Server antwortet mit den dazugehörigen Werten
app.post('/userdata', (req, res) => {
  const { email } = req.body

  if (!email) {
    return res.status(400).json({ success: false, message: 'E-Mail fehlt' })
  }

  const sql = `
    SELECT email, gruppenfahrt_2025, gruppenkasse_2025
    FROM users
    WHERE email = ?
  `
  db.get(sql, [email], (err, row) => {
    if (err) {
      console.error('❌ DB-Fehler bei /userdata:', err.message)
      return res.status(500).json({ success: false, message: 'Interner Fehler' })
    }

    if (row) {
      res.json({ success: true, data: row })
    } else {
      res.status(404).json({ success: false, message: 'Nutzer nicht gefunden' })
    }
  })
})

// ==== 🟢 Server starten ==== //
app.listen(port, () => {
  console.log(`🚀 Login-Server läuft auf http://localhost:${port}`)
})

