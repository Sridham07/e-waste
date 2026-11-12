const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/listings', require('./routes/listings'));
app.use('/api/collectors', require('./routes/collectors'));
app.use('/api/pickups', require('./routes/pickups'));

// Analytics / global stats endpoint
app.get('/api/stats', (req, res) => {
  const fs = require('fs');
  const users = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/users.json'), 'utf8'));
  const listings = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/listings.json'), 'utf8'));
  const pickups = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/pickups.json'), 'utf8'));
  const collectors = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/collectors.json'), 'utf8'));

  const totalCo2 = users.reduce((sum, u) => sum + (u.co2Saved || 0), 0) + 25000;
  const totalDevices = users.reduce((sum, u) => sum + (u.devicesRecycled || 0), 0) + 10000;
  const totalWeight = users.reduce((sum, u) => sum + (u.totalWeight || 0), 0) + 5000;

  res.json({
    totalUsers: users.length,
    totalListings: listings.filter(l => l.status === 'active').length,
    totalPickups: pickups.length,
    totalCollectors: collectors.length,
    totalCo2Saved: Math.round(totalCo2),
    totalDevicesRecycled: totalDevices,
    totalWeight: Math.round(totalWeight)
  });
});

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.listen(PORT, () => {
  console.log(`\n🌿 E-Cure Earth API running at http://localhost:${PORT}`);
  console.log(`   Frontend: http://localhost:${PORT}/index.html\n`);
});
