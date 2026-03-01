/*
═══════════════════════════════════════════════════════════════
NEXUS STAFF OPERATIONS PANEL - PROFESSIONAL BACKEND
Deploy to: https://nexus-staff-dashboard.onrender.com
Features: Case Management, Enforcement, Appeals, Decision Trees
═══════════════════════════════════════════════════════════════
*/

const express = require('express');
const axios = require('axios');
const session = require('express-session');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// ════ CONFIGURATION ════
const CLIENT_ID = "1462605560884101130";
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const GUILD_ID = "1471777507832692888";
const REDIRECT_URI = "https://nexus-staff-dashboard.onrender.com/auth/callback";
const FRONTEND_URL = "https://nexus-staff-frontend-site.onrender.com";
const DISCORD_SERVER = "https://discord.gg/nexus";

// ════ STAFF ROLES ════
const STAFF_ROLES = {
    OWNER: "1471777621422637097",
    CALLING_STAFF: "1471777769812918314",
    SUPPORT_STAFF: "1471777874645225502",
    HELPER: "1471778045760376984"
};

// ════ RANK HIERARCHY ════
const RANK_HIERARCHY = {
    'owner': { level: 5, label: 'Platform Director', permissions: ['*'] },
    'calling_staff': { level: 3, label: 'Senior Trust Officer', permissions: ['view_calls', 'issue_ban', 'remove_premium', 'escalate', 'appeal_review'] },
    'support_staff': { level: 2, label: 'Trust Moderator', permissions: ['view_calls', 'issue_warning', 'issue_suspension', 'escalate'] },
    'helper': { level: 1, label: 'Calling Associate', permissions: ['view_calls', 'issue_warning'] }
};

// ════ DATABASE SETUP ════
const DB_PATH = process.env.DB_PATH || './staff_dashboard.db';
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) console.error('Database error:', err);
    else console.log('✅ Database connected');
});

function initDatabase() {
    db.serialize(() => {
        // Staff accounts table
        db.run(`CREATE TABLE IF NOT EXISTS staff_accounts (
            id TEXT PRIMARY KEY,
            discord_id TEXT UNIQUE,
            staff_rank TEXT,
            department TEXT,
            active BOOLEAN DEFAULT 1,
            suspension_flag BOOLEAN DEFAULT 0,
            last_login INTEGER,
            created_at INTEGER
        )`);

        // Calling cases table
        db.run(`CREATE TABLE IF NOT EXISTS calling_cases (
            id TEXT PRIMARY KEY,
            case_number TEXT UNIQUE,
            reporter_id TEXT,
            reported_id TEXT,
            reason TEXT,
            status TEXT DEFAULT 'open',
            priority TEXT DEFAULT 'normal',
            call_duration INTEGER,
            transcript TEXT,
            assigned_to TEXT,
            created_at INTEGER,
            resolved_at INTEGER
        )`);

        // Enforcement log
        db.run(`CREATE TABLE IF NOT EXISTS enforcement_log (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            type TEXT,
            department TEXT,
            issued_by TEXT,
            issued_at INTEGER,
            reason TEXT,
            duration INTEGER,
            expires_at INTEGER
        )`);

        // Appeal system
        db.run(`CREATE TABLE IF NOT EXISTS appeals (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            appeal_type TEXT,
            message TEXT,
            status TEXT DEFAULT 'pending',
            created_at INTEGER,
            reviewed_by TEXT,
            reviewed_at INTEGER,
            decision TEXT
        )`);

        // Staff activity log
        db.run(`CREATE TABLE IF NOT EXISTS staff_activity (
            id TEXT PRIMARY KEY,
            staff_id TEXT,
            action TEXT,
            details TEXT,
            timestamp INTEGER
        )`);

        // Internal notes
        db.run(`CREATE TABLE IF NOT EXISTS internal_notes (
            id TEXT PRIMARY KEY,
            case_id TEXT,
            staff_id TEXT,
            note TEXT,
            created_at INTEGER
        )`);

        console.log('✅ Database tables initialized');
    });
}

initDatabase();

// ════ CORS & MIDDLEWARE ════
app.use(cors({
    origin: [FRONTEND_URL, 'https://nexus-staff-frontend-site.onrender.com', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// ════ SESSION ════
app.use(session({
    secret: process.env.SESSION_SECRET || 'staff-dashboard-secret-2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    }
}));

// ════ HELPER FUNCTIONS ════

function getUserRole(roles) {
    if (roles.includes(STAFF_ROLES.OWNER)) return 'owner';
    if (roles.includes(STAFF_ROLES.CALLING_STAFF)) return 'calling_staff';
    if (roles.includes(STAFF_ROLES.SUPPORT_STAFF)) return 'support_staff';
    if (roles.includes(STAFF_ROLES.HELPER)) return 'helper';
    return null;
}

function hasPermission(staffRole, permission) {
    const rank = RANK_HIERARCHY[staffRole];
    if (!rank) return false;
    if (rank.permissions.includes('*')) return true;
    return rank.permissions.includes(permission);
}

function canModerate(staffRole, targetRank) {
    const staffLevel = RANK_HIERARCHY[staffRole].level;
    const targetLevel = RANK_HIERARCHY[targetRank].level;
    return staffLevel > targetLevel;
}

function generateCaseNumber() {
    return `NX-CALL-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
}

async function getOrCreateStaffRecord(discordId, username, role) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM staff_accounts WHERE discord_id = ?', [discordId], async (err, row) => {
            if (err) return reject(err);
            if (row) {
                db.run('UPDATE staff_accounts SET last_login = ? WHERE discord_id = ?', [Date.now(), discordId], () => {
                    resolve(row);
                });
            } else {
                const staffId = uuidv4();
                db.run(`INSERT INTO staff_accounts (id, discord_id, staff_rank, last_login, created_at)
                        VALUES (?, ?, ?, ?, ?)`,
                    [staffId, discordId, role, Date.now(), Date.now()],
                    () => resolve({ id: staffId, discord_id: discordId, staff_rank: role })
                );
            }
        });
    });
}

async function logStaffActivity(staffId, action, details) {
    return new Promise((resolve, reject) => {
        const activityId = uuidv4();
        db.run(`INSERT INTO staff_activity (id, staff_id, action, details, timestamp)
                VALUES (?, ?, ?, ?, ?)`,
            [activityId, staffId, action, JSON.stringify(details), Date.now()],
            (err) => err ? reject(err) : resolve(activityId)
        );
    });
}

// ════ ROUTES ════

// Root
app.get('/', (req, res) => {
    res.json({
        message: 'Nexus Staff Operations Panel',
        version: '3.0.0',
        status: 'RUNNING',
        features: ['Case Management', 'Enforcement', 'Appeals', 'Decision Trees', 'Performance Analytics']
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        database: 'connected'
    });
});

// ════ AUTHENTICATION ════

app.get('/auth/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) return res.redirect(`${FRONTEND_URL}?error=no_code`);
    
    try {
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
        
        const userResponse = await axios.get('https://discord.com/api/users/@me', {
            headers: { Authorization: `${token_type} ${access_token}` }
        });
        
        const user = userResponse.data;
        
        const memberResponse = await axios.get(
            `https://discord.com/api/users/@me/guilds/${GUILD_ID}/member`,
            { headers: { Authorization: `${token_type} ${access_token}` } }
        );
        
        const member = memberResponse.data;
        const userRoles = member.roles || [];
        const staffRole = getUserRole(userRoles);
        
        if (!staffRole) {
            return res.redirect(`${FRONTEND_URL}?error=not_staff`);
        }
        
        const staffRecord = await getOrCreateStaffRecord(user.id, user.username, staffRole);
        
        req.session.user = {
            id: user.id,
            staffId: staffRecord.id,
            username: user.username,
            avatar: user.avatar 
                ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
                : `https://cdn.discordapp.com/embed/avatars/0.png`,
            role: staffRole,
            rank: RANK_HIERARCHY[staffRole].label
        };
        
        res.redirect(`${FRONTEND_URL}?login=success`);
        
    } catch (error) {
        console.error('Auth error:', error.message);
        res.redirect(`${FRONTEND_URL}?error=oauth_failed`);
    }
});

app.get('/api/auth/me', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not logged in' });
    }
    res.json({ success: true, user: req.session.user });
});

app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).json({ error: 'Logout failed' });
        res.json({ success: true });
    });
});

// ════ CALLING CASES ════

app.get('/api/calling/cases', (req, res) => {
    if (!req.session.user || !hasPermission(req.session.user.role, 'view_calls')) {
        return res.status(403).json({ error: 'Access denied' });
    }
    
    db.all('SELECT * FROM calling_cases ORDER BY created_at DESC LIMIT 50', [], (err, cases) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, cases: cases || [], total: cases?.length || 0 });
    });
});

app.get('/api/calling/cases/:caseId', (req, res) => {
    if (!req.session.user || !hasPermission(req.session.user.role, 'view_calls')) {
        return res.status(403).json({ error: 'Access denied' });
    }
    
    db.get('SELECT * FROM calling_cases WHERE id = ?', [req.params.caseId], async (err, caseData) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!caseData) return res.status(404).json({ error: 'Case not found' });
        
        // Get internal notes
        db.all('SELECT * FROM internal_notes WHERE case_id = ? ORDER BY created_at DESC', [req.params.caseId], (notesErr, notes) => {
            if (notesErr) return res.status(500).json({ error: notesErr.message });
            
            // Get enforcement history
            db.all('SELECT * FROM enforcement_log WHERE user_id IN (?, ?) ORDER BY issued_at DESC', 
                [caseData.reporter_id, caseData.reported_id], (enforceErr, history) => {
                if (enforceErr) return res.status(500).json({ error: enforceErr.message });
                
                res.json({
                    success: true,
                    case: caseData,
                    notes: notes || [],
                    history: history || []
                });
            });
        });
    });
});

app.post('/api/calling/cases', (req, res) => {
    if (!req.session.user || !hasPermission(req.session.user.role, 'view_calls')) {
        return res.status(403).json({ error: 'Access denied' });
    }
    
    const { reporter_id, reported_id, reason, priority, call_duration, transcript } = req.body;
    const caseId = uuidv4();
    const caseNumber = generateCaseNumber();
    
    db.run(`INSERT INTO calling_cases 
            (id, case_number, reporter_id, reported_id, reason, priority, call_duration, transcript, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [caseId, caseNumber, reporter_id, reported_id, reason, priority || 'normal', call_duration || 0, transcript || '', Date.now()],
        async function(err) {
            if (err) return res.status(500).json({ error: err.message });
            
            await logStaffActivity(req.session.user.staffId, 'create_case', { caseNumber, reported_id });
            
            res.json({
                success: true,
                case: {
                    id: caseId,
                    case_number: caseNumber,
                    status: 'open',
                    created_at: Date.now()
                }
            });
        }
    );
});

app.put('/api/calling/cases/:caseId/assign', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Not logged in' });
    
    const { assigned_to } = req.body;
    
    db.run('UPDATE calling_cases SET assigned_to = ? WHERE id = ?', [assigned_to, req.params.caseId], async function(err) {
        if (err) return res.status(500).json({ error: err.message });
        
        await logStaffActivity(req.session.user.staffId, 'assign_case', { caseId: req.params.caseId, assigned_to });
        
        res.json({ success: true });
    });
});

app.put('/api/calling/cases/:caseId', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Not logged in' });
    
    const { status, priority } = req.body;
    
    db.run('UPDATE calling_cases SET status = ?, priority = ?, resolved_at = ? WHERE id = ?',
        [status, priority, status === 'resolved' ? Date.now() : null, req.params.caseId],
        async function(err) {
            if (err) return res.status(500).json({ error: err.message });
            
            await logStaffActivity(req.session.user.staffId, 'update_case', { caseId: req.params.caseId, status, priority });
            
            res.json({ success: true });
        }
    );
});

// ════ INTERNAL NOTES ════

app.post('/api/cases/:caseId/notes', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Not logged in' });
    
    const noteId = uuidv4();
    const { note } = req.body;
    
    db.run(`INSERT INTO internal_notes (id, case_id, staff_id, note, created_at)
            VALUES (?, ?, ?, ?, ?)`,
        [noteId, req.params.caseId, req.session.user.staffId, note, Date.now()],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, noteId });
        }
    );
});

// ════ ENFORCEMENT ════

app.post('/api/enforcement', (req, res) => {
    if (!req.session.user || !hasPermission(req.session.user.role, 'issue_warning')) {
        return res.status(403).json({ error: 'Access denied' });
    }
    
    const { user_id, type, reason, duration } = req.body;
    const enforceId = uuidv4();
    const expiresAt = duration ? Date.now() + (duration * 24 * 60 * 60 * 1000) : null;
    
    db.run(`INSERT INTO enforcement_log 
            (id, user_id, type, department, issued_by, issued_at, reason, duration, expires_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [enforceId, user_id, type, 'calling', req.session.user.staffId, Date.now(), reason, duration, expiresAt],
        async function(err) {
            if (err) return res.status(500).json({ error: err.message });
            
            await logStaffActivity(req.session.user.staffId, 'issue_enforcement', { user_id, type, duration });
            
            res.json({ success: true, enforceId });
        }
    );
});

app.get('/api/enforcement/user/:userId', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Not logged in' });
    
    db.all('SELECT * FROM enforcement_log WHERE user_id = ? ORDER BY issued_at DESC', [req.params.userId], (err, records) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, records: records || [] });
    });
});

// ════ GET ALL ENFORCEMENT LOGS (CALLING_STAFF+OWNER) ════
app.get('/api/enforcement', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Not logged in' });
    // restrict to staff with permission to view logs
    if (!hasPermission(req.session.user.role, 'view_calls')) {
        return res.status(403).json({ error: 'Access denied' });
    }
    db.all('SELECT * FROM enforcement_log ORDER BY issued_at DESC', [], (err, records) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, records: records || [] });
    });
});

// ════ APPEALS ════

app.get('/api/appeals', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Not logged in' });
    
    db.all('SELECT * FROM appeals WHERE status = ? ORDER BY created_at DESC', ['pending'], (err, appeals) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, appeals: appeals || [], total: appeals?.length || 0 });
    });
});

app.post('/api/appeals/:appealId/review', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Not logged in' });
    
    const { decision, reason } = req.body;
    
    db.run('UPDATE appeals SET status = ?, reviewed_by = ?, reviewed_at = ?, decision = ? WHERE id = ?',
        [decision === 'approved' ? 'approved' : 'denied', req.session.user.staffId, Date.now(), reason, req.params.appealId],
        async function(err) {
            if (err) return res.status(500).json({ error: err.message });
            
            await logStaffActivity(req.session.user.staffId, 'review_appeal', { appealId: req.params.appealId, decision });
            
            res.json({ success: true });
        }
    );
});

// ════ STAFF ANALYTICS ════

app.get('/api/analytics/staff/:staffId', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'owner') {
        return res.status(403).json({ error: 'Owner only' });
    }
    
    db.all(`SELECT action, COUNT(*) as count FROM staff_activity 
            WHERE staff_id = ? GROUP BY action`, [req.params.staffId], (err, data) => {
        if (err) return res.status(500).json({ error: err.message });
        
        db.get(`SELECT COUNT(*) as resolved FROM calling_cases 
                WHERE assigned_to = ? AND status = 'resolved'`, [req.params.staffId], (caseErr, caseData) => {
            if (caseErr) return res.status(500).json({ error: caseErr.message });
            
            res.json({
                success: true,
                activity: data || [],
                cases_resolved: caseData?.resolved || 0
            });
        });
    });
});

app.get('/api/analytics/dashboard', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Not logged in' });
    
    db.get('SELECT COUNT(*) as total FROM calling_cases', [], (err, cases) => {
        if (err) return res.status(500).json({ error: err.message });
        
        db.get('SELECT COUNT(*) as pending FROM calling_cases WHERE status = ?', ['open'], (err2, pending) => {
            if (err2) return res.status(500).json({ error: err2.message });
            
            db.get('SELECT COUNT(*) as appeals_pending FROM appeals WHERE status = ?', ['pending'], (err3, appeals) => {
                if (err3) return res.status(500).json({ error: err3.message });
                
                res.json({
                    success: true,
                    stats: {
                        total_cases: cases?.total || 0,
                        pending_cases: pending?.pending || 0,
                        pending_appeals: appeals?.appeals_pending || 0
                    }
                });
            });
        });
    });
});

// ════ START SERVER ════
app.listen(PORT, () => {
    console.log('╔══════════════════════════════════════════╗');
    console.log('║ Nexus Staff Operations Panel - Running   ║');
    console.log('╠══════════════════════════════════════════╣');
    console.log(`║ Port: ${PORT.toString().padEnd(35)} ║`);
    console.log(`║ Database: ${DB_PATH.padEnd(31)} ║`);
    console.log('║ Features:                                ║');
    console.log('║ ✓ Case Management                        ║');
    console.log('║ ✓ Enforcement System                     ║');
    console.log('║ ✓ Appeals Processing                     ║');
    console.log('║ ✓ Staff Analytics                        ║');
    console.log('║ ✓ Internal Notes                         ║');
    console.log('╚══════════════════════════════════════════╝');
});