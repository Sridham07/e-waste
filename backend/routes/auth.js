const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'ecure-earth-secret-2025';
const USERS_FILE = path.join(__dirname, '../data/users.json');

function readUsers() {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  } catch { return []; }
}

function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, plan } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'All fields required' });

    const users = readUsers();
    if (users.find(u => u.email === email))
      return res.status(409).json({ error: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: uuidv4(),
      name,
      email,
      password: hashedPassword,
      plan: plan || 'free',
      devicesRecycled: 0,
      totalWeight: 0,
      co2Saved: 0,
      points: 0,
      joinedAt: new Date().toISOString()
    };

    users.push(newUser);
    writeUsers(users);

    const token = jwt.sign({ id: newUser.id, name: newUser.name, email: newUser.email }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...userSafe } = newUser;
    res.status(201).json({ token, user: userSafe });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password required' });

    const users = readUsers();
    const user = users.find(u => u.email === email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...userSafe } = user;
    res.json({ token, user: userSafe });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  const users = readUsers();
  const user = users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { password: _, ...userSafe } = user;
  res.json(userSafe);
});

// PATCH /api/auth/me — update stats
router.patch('/me', authMiddleware, (req, res) => {
  const users = readUsers();
  const idx = users.findIndex(u => u.id === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'User not found' });

  const allowedFields = ['devicesRecycled', 'totalWeight', 'co2Saved', 'points', 'name'];
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) users[idx][field] = req.body[field];
  });

  writeUsers(users);
  const { password: _, ...userSafe } = users[idx];
  res.json(userSafe);
});

module.exports = router;
