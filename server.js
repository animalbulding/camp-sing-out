const express = require('express');
const bodyParser = require('body-parser');
const { createBlob, getBlob } = require('@vercel/blob');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const STAFF_BLOB_NAME = 'staff-accounts.json';

// Function to fetch staff data from Vercel Blob
async function fetchStaffData() {
    try {
        const blob = await getBlob(STAFF_BLOB_NAME);
        if (!blob) return [];
        const response = await fetch(blob.url);
        return await response.json();
    } catch (error) {
        console.error('Error fetching staff data:', error);
        return [];
    }
}

// Function to save staff data to Vercel Blob
async function saveStaffData(data) {
    try {
        const jsonData = JSON.stringify(data, null, 2);
        await createBlob(STAFF_BLOB_NAME, jsonData, { contentType: 'application/json' });
    } catch (error) {
        console.error('Error saving staff data:', error);
    }
}

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

    const staffList = await fetchStaffData();
    const staffMember = staffList.find(staff => staff.email === email && staff.password === password);
    
    if (staffMember) {
        return res.json({ success: true, master: false });
    }

    res.status(401).json({ success: false });
});

// Route to add a new staff member
app.post('/add-staff', async (req, res) => {
    const { name, phone, email, password } = req.body;
    if (!name || !phone || !email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    const staffList = await fetchStaffData();
    staffList.push({ name, phone, email, password });

    await saveStaffData(staffList);
    res.json({ success: true, message: 'Staff member added successfully' });
});

// Route to get all staff members
app.get('/get-staff', async (req, res) => {
    const staffList = await fetchStaffData();
    res.json(staffList);
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

// Serve HTML files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/staff-login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'staff-login.html'));
});

app.get('/staff-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'staff_dashboard.html'));
});

app.get('/master-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'master_dashboard.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
