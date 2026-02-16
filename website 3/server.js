/*
═══════════════════════════════════════════════════════════════
STAFF DASHBOARD BACKEND - WITH ROLE VERIFICATION
Deploy to: https://nexus-staff-dashboard.onrender.com
═══════════════════════════════════════════════════════════════
*/

const express = require('express');
const axios = require('axios');
const session = require('express-session');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// ═══ CONFIGURATION ═══
const CLIENT_ID = "1462605560884101130";
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const GUILD_ID = "1471777507832692888"; // Your server ID
const REDIRECT_URI = "https://nexus-staff-dashboard.onrender.com/auth/callback";
const FRONTEND_URL = "https://nexus-staff-frontend-site.onrender.com";

// ═══ STAFF ROLE IDS ═══
const STAFF_ROLES = {
    OWNER: "1471777621422637097",
    CALLING_STAFF: "1471777769812918314",
    SUPPORT_STAFF: "1471777874645225502",
    HELPER: "1471778045760376984"
};

// ═══ CORS ═══
app.use(cors({
    origin: [FRONTEND_URL, 'https://nexus-staff-frontend-site.onrender.com'],
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// ═══ SESSION ═══
app.use(session({
    secret: process.env.SESSION_SECRET || 'staff-dashboard-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    }
}));

// ═══ HELPER: CHECK IF USER IS STAFF ═══
function getUserRole(roles) {
    if (roles.includes(STAFF_ROLES.OWNER)) return 'owner';
    if (roles.includes(STAFF_ROLES.CALLING_STAFF)) return 'calling_staff';
    if (roles.includes(STAFF_ROLES.SUPPORT_STAFF)) return 'support_staff';
    if (roles.includes(STAFF_ROLES.HELPER)) return 'helper';
    return null;
}

// ═══ ROOT ═══
app.get('/', (req, res) => {
    res.json({
        message: 'Nexus Staff Dashboard Backend',
        version: '2.0',
        status: 'RUNNING',
        endpoints: {
            callback: 'GET /auth/callback',
            me: 'GET /api/auth/me',
            logout: 'POST /api/auth/logout',
            modmail: 'GET /api/modmail',
            feedback: 'GET /api/feedback',
            appeals: 'GET /api/appeals',
            profiles: 'GET /api/profiles',
            reports: 'GET /api/call-reports'
        }
    });
});

// ═══ HEALTH ═══
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        guild_id: GUILD_ID,
        features: ['Staff Auth', 'Role Verification']
    });
});

// ═══ OAUTH CALLBACK WITH ROLE VERIFICATION ═══
app.get('/auth/callback', async (req, res) => {
    const { code } = req.query;
    
    if (!code) {
        return res.redirect(`${FRONTEND_URL}?error=no_code`);
    }
    
    try {
        console.log('📥 Staff login attempt...');
        
        // Exchange code for token
        const tokenResponse = await axios.post('https://discord.com/api/oauth2/token',
            new URLSearchParams({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: REDIRECT_URI
            }),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        
        const { access_token, token_type } = tokenResponse.data;
        
        // Get user info
        const userResponse = await axios.get('https://discord.com/api/users/@me', {
            headers: { Authorization: `${token_type} ${access_token}` }
        });
        
        const user = userResponse.data;
        console.log(`👤 User: ${user.username}`);
        
        // ⚠️ CRITICAL: GET USER'S ROLES IN SERVER
        const memberResponse = await axios.get(
            `https://discord.com/api/users/@me/guilds/${GUILD_ID}/member`,
            {
                headers: { Authorization: `${token_type} ${access_token}` }
            }
        );
        
        const member = memberResponse.data;
        const userRoles = member.roles || [];
        
        console.log(`🔍 User roles:`, userRoles);
        
        // Check if user has staff role
        const staffRole = getUserRole(userRoles);
        
        if (!staffRole) {
            console.log(`❌ ${user.username} is NOT staff!`);
            return res.redirect(`${FRONTEND_URL}?error=not_staff`);
        }
        
        console.log(`✅ ${user.username} is ${staffRole}!`);
        
        // Store session
        req.session.user = {
            id: user.id,
            username: `${user.username}#${user.discriminator}`,
            avatar: user.avatar 
                ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
                : `https://cdn.discordapp.com/embed/avatars/0.png`,
            role: staffRole
        };
        
        res.redirect(`${FRONTEND_URL}?login=success`);
        
    } catch (error) {
        console.error('❌ Staff OAuth error:', error.response?.data || error.message);
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

// ═══ GET MODMAIL (ALL STAFF) ═══
app.get('/api/modmail', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not logged in' });
    }
    
    // Mock data - replace with real database
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
});

// ═══ GET FEEDBACK (ALL STAFF) ═══
app.get('/api/feedback', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not logged in' });
    }
    
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
});

// ═══ GET APPEALS (ALL STAFF) ═══
app.get('/api/appeals', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not logged in' });
    }
    
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
});

// ═══ GET PROFILES (ALL STAFF) ═══
app.get('/api/profiles', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not logged in' });
    }
    
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
});

// ═══ GET CALL REPORTS (CALLING STAFF + OWNER ONLY) ═══
app.get('/api/call-reports', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not logged in' });
    }
    
    // Check role
    if (req.session.user.role === 'helper' || req.session.user.role === 'support_staff') {
        return res.status(403).json({ 
            error: 'Helpers and Support Staff cannot view call reports',
            requiredRole: 'calling_staff or owner'
        });
    }
    
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
});

// ═══ START SERVER ═══
app.listen(PORT, () => {
    console.log('═══════════════════════════════════════');
    console.log('✅ Staff Dashboard Backend RUNNING');
    console.log(`📡 Port: ${PORT}`);
    console.log(`🔗 Redirect: ${REDIRECT_URI}`);
    console.log(`🌐 Frontend: ${FRONTEND_URL}`);
    console.log(`🏢 Guild ID: ${GUILD_ID}`);
    console.log('');
    console.log('⚠️  ROLE VERIFICATION ENABLED!');
    console.log('   Users MUST have staff roles to login');
    console.log('═══════════════════════════════════════');
});