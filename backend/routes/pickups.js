const express = require('express');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const PICKUPS_FILE = path.join(__dirname, '../data/pickups.json');
const USERS_FILE = path.join(__dirname, '../data/users.json');

function readPickups() {
  try { return JSON.parse(fs.readFileSync(PICKUPS_FILE, 'utf8')); }
  catch { return []; }
}
function writePickups(data) {
  fs.writeFileSync(PICKUPS_FILE, JSON.stringify(data, null, 2));
}
function readUsers() {
  try { return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); }
  catch { return []; }
}
function writeUsers(data) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2));
}

// GET /api/pickups — user's pickups
router.get('/', authMiddleware, (req, res) => {
  const pickups = readPickups().filter(p => p.userId === req.user.id);
  res.json(pickups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

// POST /api/pickups — schedule
router.post('/', authMiddleware, (req, res) => {
  const { collectorId, collectorName, address, date, items, deviceCount, weight } = req.body;
  if (!collectorId || !address || !date)
    return res.status(400).json({ error: 'Required fields missing' });

  const pickup = {
    id: uuidv4(),
    userId: req.user.id,
    userName: req.user.name,
    collectorId,
    collectorName: collectorName || 'Collector',
    address,
    date,
    items: items || [],
    deviceCount: deviceCount || 1,
    weight: weight || 2.5,
    co2Saved: (weight || 2.5) * 2.5,
    status: 'scheduled',
    createdAt: new Date().toISOString()
  };

  const pickups = readPickups();
  pickups.push(pickup);
  writePickups(pickups);

  // Update user stats
  const users = readUsers();
  const idx = users.findIndex(u => u.id === req.user.id);
  if (idx !== -1) {
    users[idx].devicesRecycled = (users[idx].devicesRecycled || 0) + (deviceCount || 1);
    users[idx].totalWeight = (users[idx].totalWeight || 0) + (weight || 2.5);
    users[idx].co2Saved = (users[idx].co2Saved || 0) + (weight || 2.5) * 2.5;
    users[idx].points = (users[idx].points || 0) + ((deviceCount || 1) * 10);
    writeUsers(users);
  }

  res.status(201).json(pickup);
});

// PATCH /api/pickups/:id — update status
router.patch('/:id', authMiddleware, (req, res) => {
  const pickups = readPickups();
  const idx = pickups.findIndex(p => p.id === req.params.id && p.userId === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'Pickup not found' });
  pickups[idx].status = req.body.status || pickups[idx].status;
  writePickups(pickups);
  res.json(pickups[idx]);
});

module.exports = router;
