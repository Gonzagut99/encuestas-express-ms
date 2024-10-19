const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const cors = require('cors'); 
const morgan = require('morgan'); 

const app = express();
const port = 3005;

app.use(express.json());
app.use(cors({
  origin: '*'
}));
app.use(morgan('combined')); 

// Connect to SQLite database
const db = new sqlite3.Database('./polls.db', (err) => {
  if (err) {
    console.error('Error connecting to the database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    initializeDatabase();
  }
});

// Initialize the database schema
function initializeDatabase() {
  db.run(`
    CREATE TABLE IF NOT EXISTS polls (
      id TEXT PRIMARY KEY,
      poll_text TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      poll_id TEXT,
      text TEXT NOT NULL,
      results INTEGER DEFAULT 0,
      FOREIGN KEY (poll_id) REFERENCES polls (id)
    )
  `);
}

// Middleware para manejar errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.get('/polls', (req, res) => {
  db.all('SELECT * FROM polls', (err, polls) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(polls);
  });
});

//get all polls 
// const Body = {
//   poll_id: poll?.id,
//   poll_text: poll?.poll_text,
//   options: poll?.options.map((option) => ({ option_text: option.option_text, votes: option.votes })),
// };
// Create a new poll
app.post('/polls', async (req, res) => {
  const { poll_id, poll_text, options } = req.body;

  try {
    await new Promise((resolve, reject) => {
      db.run('INSERT INTO polls (id, poll_text) VALUES (?, ?)', [poll_id, poll_text], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });

    const optionInserts = options.map(option => {
      return new Promise((resolve, reject) => {
        db.run('INSERT INTO options (poll_id, text, results) VALUES (?, ?, ?)', [poll_id, option.text, option.results], function(err) {
          if (err) reject(err);
          else resolve();
        });
      });
    });

    await Promise.all(optionInserts);
    res.status(200).json({ id: poll_id, poll_text, options });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
