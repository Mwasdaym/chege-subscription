require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { PayHeroClient } = require('payhero-devkit');
const path = require('path');
const nodemailer = require('nodemailer');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Load accounts from JSON
const accounts = JSON.parse(fs.readFileSync('accounts.json', 'utf8'));

// Setup Outlook transporter
const transporter = nodemailer.createTransport({
  service: 'hotmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Initialize PayHero Client
const client = new PayHeroClient({
  authToken: process.env.AUTH_TOKEN
});

// Enhanced Subscription plans data with categories
const subscriptionPlans = {
  'streaming': {
    category: 'Streaming Services',
    icon: 'fas fa-play-circle',
    color: '#FF6B6B',
    plans: {
      'netflix': { name: 'Netflix Premium', price: 220, duration: '1 Month', features: ['4K Ultra HD', '4 Screens', 'Unlimited Content'], popular: true },
      'spotify': { name: 'Spotify Premium', price: 180, duration: '1 Month', features: ['Ad-free Music', 'Offline Downloads', 'High Quality Audio'] },
      'showmax': { name: 'Showmax Pro', price: 150, duration: '1 Month', features: ['Live Sports', 'Showmax Originals', 'Multiple Devices'] },
      'primevideo': { name: 'Prime Video', price: 200, duration: '1 Month', features: ['4K Streaming', 'Amazon Originals', 'Offline Viewing'] },
      'hdopremium': { name: 'HDO Box Premium', price: 150, duration: '1 Month', features: ['No Ads', 'All Content Unlocked', 'HD Streaming'] },
      'dstv': { name: 'DStv Premium', price: 800, duration: '1 Month', features: ['Live Sports', 'Movies & Series', 'Multiple Devices'] }
    }
  },
  'security': {
    category: 'VPN & Security',
    icon: 'fas fa-shield-alt',
    color: '#4ECDC4',
    plans: {
      'expressvpn': { name: 'ExpressVPN', price: 150, duration: '1 Month', features: ['Lightning Fast', 'Secure Browsing', 'Global Servers'] },
      'nordvpn': { name: 'NordVPN', price: 250, duration: '1 Month', features: ['Military Encryption', '6 Devices', 'No Logs Policy'], popular: true },
      'surfshark': { name: 'Surfshark VPN', price: 300, duration: '1 Month', features: ['Unlimited Devices', 'CleanWeb', 'Whitelister'] }
    }
  },
  'productivity': {
    category: 'Productivity Tools',
    icon: 'fas fa-briefcase',
    color: '#45B7D1',
    plans: {
      'whatsappbot': { name: 'WhatsApp Bot', price: 60, duration: 'Lifetime', features: ['Auto Replies', 'Bulk Messaging', '24/7 Support'] },
      'unlimitedpanels': { name: 'Unlimited Panels', price: 100, duration: 'Lifetime', features: ['All Services', 'Auto Updates', 'Premium Support'] },
      'canvapro': { name: 'Canva Pro', price: 80, duration: '1 Month', features: ['Premium Templates', 'Background Remover', 'Magic Resize'] },
      'capcutpro': { name: 'CapCut Pro', price: 300, duration: '1 Month', features: ['Premium Effects', 'No Watermark', 'Cloud Storage'], popular: true },
      'chatgpt': { name: 'ChatGPT Premium', price: 500, duration: '1 Month', features: ['GPT-4 Access', 'Priority Responses', 'No Limits'] }
    }
  }
};

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/plans', (req, res) => {
  res.json({ success: true, categories: subscriptionPlans });
});

app.post('/api/initiate-payment', async (req, res) => {
  try {
    const { planId, phoneNumber, customerName, email } = req.body;

    // Find plan in categories
    let plan = null;
    let categoryName = '';

    for (const [category, data] of Object.entries(subscriptionPlans)) {
      if (data.plans[planId]) {
        plan = data.plans[planId];
        categoryName = data.category;
        break;
      }
    }

    if (!plan) {
      return res.status(400).json({
        success: false,
        error: 'Invalid subscription plan'
      });
    }

    // Format phone number
    let formattedPhone = phoneNumber.trim();
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.substring(1);
    } else if (formattedPhone.startsWith('+')) {
      formattedPhone = formattedPhone.substring(1);
    }

    if (!formattedPhone.startsWith('254') || formattedPhone.length !== 12) {
      return res.status(400).json({
        success: false,
        error: 'Phone number must be in format 2547XXXXXXXX (12 digits)'
      });
    }

    const reference = `BERA-${planId.toUpperCase()}-${Date.now()}`;

    const stkPayload = {
      phone_number: formattedPhone,
      amount: plan.price,
      provider: 'm-pesa',
      channel_id: process.env.CHANNEL_ID,
      external_reference: reference,
      customer_name: customerName || 'Chege Tech Customer'
    };

    console.log('🔄 Initiating payment for:', plan.name);
    const response = await client.stkPush(stkPayload);

    res.json({
      success: true,
      message: `Payment initiated for ${plan.name}`,
      data: {
        reference,
        plan: plan.name,
        category: categoryName,
        amount: plan.price,
        duration: plan.duration,
        checkoutMessage: `You will receive an M-Pesa prompt to pay KES ${plan.price} for ${plan.name}`
      }
    });

  } catch (error) {
    console.error('❌ Payment initiation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to initiate payment'
    });
  }
});

// Donation endpoint
app.post('/api/donate', async (req, res) => {
  try {
    const { phoneNumber, amount, customerName } = req.body;

    if (!phoneNumber || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and amount are required'
      });
    }

    let formattedPhone = phoneNumber.trim();
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.substring(1);
    } else if (formattedPhone.startsWith('+')) {
      formattedPhone = formattedPhone.substring(1);
    }

    const reference = `DONATION-${Date.now()}`;
    const donationAmount = parseFloat(amount);

    const stkPayload = {
      phone_number: formattedPhone,
      amount: donationAmount,
      provider: 'm-pesa',
      channel_id: process.env.CHANNEL_ID,
      external_reference: reference,
      customer_name: customerName || 'Chege Tech Supporter'
    };

    const response = await client.stkPush(stkPayload);

    res.json({
      success: true,
      message: `Donation of KES ${donationAmount} initiated successfully`,
      data: {
        reference,
        amount: donationAmount,
        thankYouMessage: 'Thank you for supporting Chege Tech!',
        isDonation: true
      }
    });

  } catch (error) {
    console.error('❌ Donation initiation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ Payment confirmation + Email sending
app.get('/api/check-payment/:reference', async (req, res) => {
  try {
    const { reference } = req.params;
    const status = await client.transactionStatus(reference);

    if (status.status === 'success') {
      const isDonation = reference.startsWith('DONATION');

      // 🔐 Send account details if not a donation
      if (!isDonation) {
        const planId = reference.split('-')[1].toLowerCase();
        const accountList = accounts[planId];

        if (accountList && accountList.length > 0) {
          const account = accountList.shift();
          fs.writeFileSync('accounts.json', JSON.stringify(accounts, null, 2));

          const mailOptions = {
            from: process.env.EMAIL_USER,
            to: status.customer_email || process.env.EMAIL_USER, // fallback to admin
            subject: `Your ${planId.toUpperCase()} Account Details`,
            html: `
              <h2>✅ Payment Confirmed</h2>
              <p>Dear Customer,</p>
              <p>Your payment for <strong>${planId.toUpperCase()}</strong> was successful.</p>
              <p>Here are your account login details:</p>
              <pre style="background:#f2f2f2;padding:10px;border-radius:6px;">${account}</pre>
              <p>Please login and enjoy your premium subscription.</p>
              <p>– Chege Tech Team</p>
            `
          };

          await transporter.sendMail(mailOptions);
          console.log(`📧 Account details sent for ${planId}`);
        } else {
          console.warn(`⚠️ No available accounts for ${planId}`);
        }
      }

      return res.json({
        success: true,
        status: 'success',
        message: isDonation
          ? 'Donation confirmed! Thank you for your support.'
          : 'Payment confirmed! Account details have been emailed.'
      });
    }

    res.json({ success: true, status: status.status, message: `Payment status: ${status.status}` });

  } catch (error) {
    console.error('❌ Payment check error:', error);
    res.status(500).json({ success: false, error: 'Failed to check payment status' });
  }
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const balance = await client.serviceWalletBalance();
    res.json({
      success: true,
      message: 'Chege Tech Service operational',
      data: { uptime: process.uptime(), balance }
    });
  } catch (error) {
    res.status(503).json({ success: false, error: error.message });
  }
});

// Start server
app.listen(port, () => {
  console.log('🚀 Chege Tech Premium Service Started');
  console.log('📍 Port:', port);
});
