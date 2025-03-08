const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const path = require('path');
const multer = require('multer');
const XLSX = require('xlsx');
const fs = require('fs');
const nodemailer = require('nodemailer');
const { put, get, del } = require('@vercel/blob');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Hardcoded master account
const MASTER_ACCOUNT = { email: 'admin@camp.com', password: 'masterpass' };

// Nodemailer email setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Staff login route
app.post('/staff-login', async (req, res) => {
  const { email, password } = req.body;
  if (email === MASTER_ACCOUNT.email && password === MASTER_ACCOUNT.password) {
    return res.json({ success: true, master: true });
  }
  res.status(401).json({ success: false });
});

// Sign-out camper and notify staff
app.post('/signout', async (req, res) => {
  const { first_name, last_name, parent_name } = req.body;
  try {
    const result = await pool.query('SELECT approved_pickups FROM campers WHERE first_name = $1 AND last_name = $2', [first_name, last_name]);
    if (result.rows.length === 0) return res.status(404).send('Camper not found');
    const approvedPickups = result.rows[0].approved_pickups || [];
    if (!approvedPickups.includes(parent_name)) return res.status(403).send('Parent not authorized');
    
    // Send email notification
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.NOTIFY_EMAIL,
      subject: 'Camper Sign-Out Notification',
      text: `${first_name} ${last_name} was signed out by ${parent_name}.`
    };
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) console.error('Email error:', err);
    });
    
    res.send('Camper signed out successfully');
  } catch (error) {
    console.error('Sign-out error:', error);
    res.status(500).send('Error signing out camper');
  }
});

// Home Route
const path = require("path");

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
