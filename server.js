require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { PayHeroClient } = require('payhero-devkit');
const path = require('path');
const bcrypt = require('bcryptjs'); // ✅ Fixed (was bcrypt)
const session = require('express-session');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Initialize PayHero Client
const client = new PayHeroClient({
  authToken: process.env.AUTH_TOKEN
});

// Session middleware
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true
}));

// Temporary user store (replace with a database later)
const users = [];

// ======================
// Subscription Plans Data
// ======================
const subscriptionPlans = {
  streaming: {
    category: 'Streaming Services',
    icon: 'fas fa-play-circle',
    color: '#FF6B6B',
    plans: {
      netflix: {
        name: 'Netflix Premium',
        price: 500,
        duration: '1 Month',
        features: ['4K Ultra HD', '4 Screens', 'Unlimited Content'],
        logo: '/logos/netflix.png',
        popular: true
      },
      spotify: {
        name: 'Spotify Premium',
        price: 180,
        duration: '1 Month',
        features: ['Ad-free Music', 'Offline Downloads', 'High Quality Audio'],
        logo: '/logos/spotify.png'
      },
      showmax: {
        name: 'Showmax Pro',
        price: 150,
        duration: '1 Month',
        features: ['Live Sports', 'Showmax Originals', 'Multiple Devices'],
        logo: '/logos/showmax.png'
      },
      primevideo: {
        name: 'Prime Video',
        price: 200,
        duration: '1 Month',
        features: ['4K Streaming', 'Amazon Originals', 'Offline Viewing'],
        logo: '/logos/primevideo.png'
      },
      hdopremium: {
        name: 'HDO Box Premium',
        price: 150,
        duration: '1 Month',
        features: ['No Ads', 'All Content Unlocked', 'HD Streaming'],
        logo: '/logos/hdopremium.png'
      },
      disney: {
        name: 'Disney+',
        price: 500,
        duration: '1 Year',
        features: ['Family Entertainment', 'Marvel, Pixar, Star Wars', 'Offline Downloads'],
        logo: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/disneyplus.svg'
      },
      ytpremium: {
        name: 'YouTube Premium',
        price: 80,
        duration: '1 Month',
        features: ['Ad-Free Videos', 'Background Play', 'Offline Viewing'],
        logo: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/youtube.svg'
      },
      crunchyroll: {
        name: 'Crunchyroll Premium',
        price: 400,
        duration: '1 Year',
        features: ['All Anime Unlocked', 'Simulcasts', 'No Ads'],
        logo: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/crunchyroll.svg'
      },
      dstv: {
        name: 'DStv Premium',
        price: 800,
        duration: '1 Month',
        features: ['Live TV', 'Sports & Movies', 'HD Channels', 'Catch-Up Shows'],
        logo: 'https://upload.wikimedia.org/wikipedia/commons/6/69/DStv_logo.svg',
        popular: true
      }
    }
  }
};

// =========================================
// AUTH: Register, Login, and Session Routes
// =========================================
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  const existing = users.find(u => u.username === username);
  if (existing) return res.status(400).json({ error: 'User already exists' });

  const hashed = await bcrypt.hash(password, 10);
  users.push({ username, password: hashed });
  res.json({ message: 'Registered successfully' });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username);
  if (!user) return res.status(400).json({ error: 'User not found' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).json({ error: 'Invalid password' });

  req.session.user = { username };
  res.json({ message: 'Login successful' });
});

app.get('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ message: 'Logged out' }));
});

// ======================
// PLANS ENDPOINT
// ======================
app.get('/api/plans', (req, res) => {
  res.json(subscriptionPlans);
});

// ======================
// START SERVER
// ======================
app.listen(port, () => {
  console.log(`🚀 CHEGE Tech Premium Service Started`);
  console.log(`📍 Port: ${port}`);
  console.log(`🌐 URL: http://localhost:${port}`);
});
