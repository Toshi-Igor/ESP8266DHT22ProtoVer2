// Import necessary modules
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const WebSocket = require('ws');
const fs = require('fs');

// Set up express app
const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// MySQL connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'iamgRoot',  // Replace with your MySQL root password
  database: 'data_sensedb',
});

// Check MySQL connection
db.connect((err) => {
  if (err) {
    console.log('Failed to connect to MySQL. Data will be logged to a file.');
  } else {
    console.log('Connected to MySQL database.');
  }
});

// WebSocket setup
const wss = new WebSocket.Server({ port: 8080 });
let clients = [];

// Broadcast data to all WebSocket clients
function broadcastData(data) {
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));  // Send the new data as a WebSocket message
    }
  });
}

// Handle WebSocket connections
wss.on('connection', (ws) => {
  clients.push(ws);
  console.log('New WebSocket client connected.');

  ws.on('close', () => {
    clients = clients.filter((client) => client !== ws);
    console.log('WebSocket client disconnected.');
  });
});

// Function to log data to a file if the database fails
function logDataToFile(data) {
  const logEntry = `${new Date().toISOString()} - Temperature: ${data.temperature}, Humidity: ${data.humidity}, Heat Index: ${data.heat_index}\n`;
  fs.appendFile('sensor_data_backup.log', logEntry, (err) => {
    if (err) {
      console.error('Error writing to file:', err);
    } else {
      console.log('Data logged to file:', logEntry);
    }
  });
}

// API to receive data from ESP8266
app.post('/log_dht', (req, res) => {
  const { temperature, humidity, heat_index } = req.body;

  // Insert data into the database
  const query = 'INSERT INTO dht_data (temperature, humidity, heat_index) VALUES (?, ?, ?)';
  db.query(query, [temperature, humidity, heat_index], (err, result) => {
    if (err) {
      console.error('Failed to insert data into MySQL:', err);
      logDataToFile({ temperature, humidity, heat_index });
      res.status(500).send('Error logging data');
    } else {
      const data = {
        id: result.insertId, // Retrieve the inserted ID
        temperature,
        humidity,
        heat_index,
        timestamp: new Date() // Add the current timestamp
      };

      // Broadcast the new data to WebSocket clients
      broadcastData(data);

      res.send('Data logged and broadcasted.');
    }
  });
});

// API to retrieve historical data from MySQL
app.get('/history', (req, res) => {
  const query = 'SELECT * FROM dht_data ORDER BY timestamp DESC LIMIT 100'; // Get the latest 100 entries

  db.query(query, (err, results) => {
    if (err) {
      console.error('Failed to fetch historical data:', err);
      res.status(500).send('Error fetching historical data');
    } else {
      res.json(results); // Send the historical data as JSON
    }
  });
});

// Serve the webpage
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Start the Express server
app.listen(3000, () => {
  console.log('Server running on port 3000.');
});
