 /* 
═══════════════════════════════════════════════════════════════
FILE LOCATION: staff_dashboard_backend/server.js
DEPLOY TO RENDER AS WEB SERVICE
═══════════════════════════════════════════════════════════════

NEXUS STAFF DASHBOARD BACKEND
Provides API endpoints for dashboard data
*/

const express = require('express');
const axios = require('axios');
const session = require('express-session');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { promisify } = require('util');
const path = require('path'); // ✅ ADD THIS

const app = express();
const PORT = process.env.PORT || 3001;

// ═══ CONFIGURATION ═══
const CLIENT_ID = "1462605560884101130";
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || "https://nexus-staff-dashboard.onrender.com/auth/callback";
const FRONTEND_URL = process.env.FRONTEND_URL || "https://nexus-staff-dashboard.onrender.com";

// Staff role IDs
const OWNER_ID = "1471777621422637097";
const CALLING_STAFF = ["1471777769812918314"];
const SUPPORT_STAFF = ["1471777874645225502"];
const HELPER = ["1471778045760376984"];

// ═══ MIDDLEWARE ═══
app.use(cors({
    origin: FRONTEND_URL,
    credentials: true
}));

app.use(express.json());
const path = require('path'); // ✅ ADD THIS
app.use(session({
    secret: process.env.SESSION_SECRET || 'staff-dashboard-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// ═══ DATABASE CONNECTION ═══
// In production, connect to bot's database
// For now, using local copy
const db = new sqlite3.Database('./staff_data.db');

// Promisify database methods
const dbRun = promisify(db.run.bind(db));
const dbGet = promisify(db.get.bind(db));
const dbAll = promisify(db.all.bind(db));

// Initialize tables
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS sessions (
        sid TEXT PRIMARY KEY,
        user_id TEXT,
        username TEXT,
        roles TEXT,
        created_at INTEGER
    )`);
});

// ═══ DISCORD OAUTH ═══
app.get('/auth/callback', async (req, res) => {
    const { code } = req.query;
    
    if (!code) {
        return res.redirect(`${FRONTEND_URL}?error=no_code`);
    }
    
    try {
        // Exchange code for token
        const tokenResponse = await axios.post('https://discord.com/api/oauth2/token',
            new URLSearchParams({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: REDIRECT_URI,
                scope: 'identify guilds.members.read'
            }),
            {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            }
        );
        
        const { access_token, token_type } = tokenResponse.data;
        
        // Get user info
        const userResponse = await axios.get('https://discord.com/api/users/@me', {
            headers: { Authorization: `${token_type} ${access_token}` }
        });
        
        const user = userResponse.data;
        
        // Check if user is staff (check roles in your Discord server)
        // For now, checking against known staff IDs
        let role = 'none';
        
        if (user.id === OWNER_ID) {
            role = 'owner';
        } else if (CALLING_STAFF.includes(user.id)) {
            role = 'calling_staff';
        } else if (SUPPORT_STAFF.includes(user.id)) {
            role = 'support_staff';
        } else if (HELPER.includes(user.id)) {
            role = 'helper';
        }
        
        if (role === 'none') {
            return res.redirect(`${FRONTEND_URL}?error=not_staff`);
        }
        
        // Store session
        req.session.user = {
            id: user.id,
            username: `${user.username}#${user.discriminator}`,
            avatar: user.avatar 
                ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
                : `https://cdn.discordapp.com/embed/avatars/0.png`,
            role: role
        };
        
        res.redirect(`${FRONTEND_URL}?login=success`);
        
    } catch (error) {
        console.error('OAuth error:', error.response?.data || error.message);
        res.redirect(`${FRONTEND_URL}?error=oauth_failed`);
    }
});

// ═══ GET CURRENT USER ═══
app.get('/api/auth/me', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not logged in' });
    }
    
    res.json({
        success: true,
        user: req.session.user
    });
});

// ═══ LOGOUT ═══
app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.json({ success: true });
    });
});

// ═══ DASHBOARD DATA ENDPOINTS ═══

// Get modmail tickets
app.get('/api/modmail', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not logged in' });
    }
    
    try {
        // TODO: Connect to actual bot database
        // For now, return mock data
        const tickets = [
            {
                id: 1,
                user_id: "123456789",
                username: "User#1234",
                message: "I need help with the bot",
                status: "open",
                created_at: Date.now()
            }
        ];
        
        res.json({ success: true, tickets });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch modmail' });
    }
});

// Get feedback
app.get('/api/feedback', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not logged in' });
    }
    
    try {
        const feedback = [
            {
                id: 1,
                user_id: "123456789",
                username: "User#1234",
                feedback: "Great bot!",
                created_at: Date.now()
            }
        ];
        
        res.json({ success: true, feedback });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch feedback' });
    }
});

// Get appeals
app.get('/api/appeals', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not logged in' });
    }
    
    try {
        const appeals = [
            {
                id: 1,
                user_id: "123456789",
                username: "User#1234",
                reason: "I was wrongly banned",
                status: "pending",
                created_at: Date.now()
            }
        ];
        
        res.json({ success: true, appeals });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch appeals' });
    }
});

// Get profiles
app.get('/api/profiles', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not logged in' });
    }
    
    try {
        const profiles = [
            {
                user_id: "123456789",
                username: "User#1234",
                registered_date: "February 13, 2026",
                registered_time: "03:45 PM",
                is_banned: 0,
                is_call_banned: 0,
                appeal_status: "none"
            }
        ];
        
        res.json({ success: true, profiles });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch profiles' });
    }
});

// Get call reports
app.get('/api/call-reports', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not logged in' });
    }
    
    if (req.session.user.role === 'helper') {
        return res.status(403).json({ error: 'Helpers cannot view call reports' });
    }
    
    try {
        const reports = [
            {
                case_number: "CASE-123456",
                reporter_id: "123456789",
                reported_id: "987654321",
                reason: "Inappropriate content",
                created_at: Date.now()
            }
        ];
        
        res.json({ success: true, reports });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch reports' });
    }
});

// ═══ HEALTH CHECK ═══
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        redirect_uri: REDIRECT_URI
    });
});

// ═══ ROOT ═══
app.get('/', (req, res) => {
    res.json({
        message: 'Nexus Staff Dashboard Backend',
        endpoints: {
            auth: '/auth/callback',
            me: '/api/auth/me',
            logout: '/api/auth/logout',
            modmail: '/api/modmail',
            feedback: '/api/feedback',
            appeals: '/api/appeals',
            profiles: '/api/profiles',
            reports: '/api/call-reports',
            health: '/health'
        }
    });
});

// ═══ START SERVER ═══
app.listen(PORT, () => {
    console.log('═══════════════════════════════════════');
    console.log('✅ Staff Dashboard Backend Running');
    console.log(`📡 Port: ${PORT}`);
    console.log(`🔗 Redirect URI: ${REDIRECT_URI}`);
    console.log(`🌐 Frontend: ${FRONTEND_URL}`);
    console.log('═══════════════════════════════════════');
});