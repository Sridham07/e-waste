const express = require('express');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const LISTINGS_FILE = path.join(__dirname, '../data/listings.json');

function readListings() {
  try { return JSON.parse(fs.readFileSync(LISTINGS_FILE, 'utf8')); }
  catch { return []; }
}
function writeListings(data) {
  fs.writeFileSync(LISTINGS_FILE, JSON.stringify(data, null, 2));
}

// GET /api/listings
router.get('/', (req, res) => {
  let listings = readListings().filter(l => l.status === 'active');
  const { category, location, search } = req.query;
  if (category && category !== 'all') listings = listings.filter(l => l.category === category);
  if (location && location !== 'all') listings = listings.filter(l => l.location === location);
  if (search) {
    const q = search.toLowerCase();
    listings = listings.filter(l => l.title.toLowerCase().includes(q) || l.description.toLowerCase().includes(q));
  }
  res.json(listings);
});

// GET /api/listings/:id
router.get('/:id', (req, res) => {
  const listing = readListings().find(l => l.id === req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  res.json(listing);
});

// POST /api/listings — create
router.post('/', authMiddleware, (req, res) => {
  const { title, category, price, location, description, image } = req.body;
  if (!title || !category || !price || !location)
    return res.status(400).json({ error: 'Required fields missing' });

  const listing = {
    id: uuidv4(),
    title,
    category,
    price: parseFloat(price),
    location,
    description: description || '',
    image: image || 'laptop.jpeg',
    sellerId: req.user.id,
    sellerName: req.user.name,
    postedAt: new Date().toISOString(),
    status: 'active'
  };

  const listings = readListings();
  listings.push(listing);
  writeListings(listings);
  res.status(201).json(listing);
});

// DELETE /api/listings/:id
router.delete('/:id', authMiddleware, (req, res) => {
  let listings = readListings();
  const listing = listings.find(l => l.id === req.params.id);
  if (!listing) return res.status(404).json({ error: 'Not found' });
  if (listing.sellerId !== req.user.id && listing.sellerId !== 'seed')
    return res.status(403).json({ error: 'Forbidden' });

  listings = listings.filter(l => l.id !== req.params.id);
  writeListings(listings);
  res.json({ message: 'Listing removed' });
});

module.exports = router;
