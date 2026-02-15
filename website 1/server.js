/*
═══════════════════════════════════════════════════════════════
FILE LOCATION: oauth_server/server_COMPLETE.js
COMPLETE BACKEND WITH LIVE SHOP SYNC
Your redirect: https://nexus-backend-of9x.onrender.com/auth/callback
═══════════════════════════════════════════════════════════════

FEATURES:
- OAuth with NEX balance
- Live pet shop API
- Hourly rotation
- Inventory sync with Discord
- Purchase handling
*/

const express = require('express');
const axios = require('axios');
const session = require('express-session');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { promisify } = require('util');

const app = express();
const PORT = process.env.PORT || 3000;

// ═══ CONFIGURATION ═══
const CLIENT_ID = "1462605560884101130";
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = "https://nexus-backend-of9x.onrender.com/auth/callback";
const FRONTEND_URL = process.env.FRONTEND_URL || "https://nexus-site.com";

// ═══ DATABASE ═══
const dbPath = process.env.BOT_DB_PATH || './nexus.db';
const db = new sqlite3.Database(dbPath);

const dbRun = promisify(db.run.bind(db));
const dbGet = promisify(db.get.bind(db));
const dbAll = promisify(db.all.bind(db));

// ═══ PET SHOP ROTATIONS (Changes every hour) ═══
const PET_POOLS = {
    common: [
        { id: 'dog', name: 'Loyal Dog', emoji: '🐕', rarity: 'Common', description: 'A faithful companion', price: 500 },
        { id: 'cat', name: 'Cute Cat', emoji: '🐈', rarity: 'Common', description: 'Independent and playful', price: 500 },
        { id: 'rabbit', name: 'Fluffy Rabbit', emoji: '🐇', rarity: 'Common', description: 'Soft and cuddly', price: 600 },
        { id: 'hamster', name: 'Tiny Hamster', emoji: '🐹', rarity: 'Common', description: 'Small and adorable', price: 400 }
    ],
    rare: [
        { id: 'wolf', name: 'Wild Wolf', emoji: '🐺', rarity: 'Rare', description: 'Fierce and loyal', price: 2000 },
        { id: 'fox', name: 'Clever Fox', emoji: '🦊', rarity: 'Rare', description: 'Smart and cunning', price: 2500 },
        { id: 'panda', name: 'Rare Panda', emoji: '🐼', rarity: 'Rare', description: 'Endangered species', price: 3000 },
        { id: 'koala', name: 'Sleepy Koala', emoji: '🐨', rarity: 'Rare', description: 'Peaceful creature', price: 2800 }
    ],
    legendary: [
        { id: 'dragon', name: 'Fire Dragon', emoji: '🐉', rarity: 'Legendary', description: 'Mythical beast!', price: 10000 },
        { id: 'unicorn', name: 'Mystical Unicorn', emoji: '🦄', rarity: 'Legendary', description: 'Magical creature', price: 15000 },
        { id: 'phoenix', name: 'Phoenix', emoji: '🔥', rarity: 'Legendary', description: 'Reborn from ashes', price: 20000 }
    ]
};

function getHourlyShop() {
    const hour = new Date().getHours();
    const seed = hour; // Changes every hour
    
    // Random selection based on hour
    const rng = (s) => {
        const x = Math.sin(s++) * 10000;
        return x - Math.floor(x);
    };
    
    const shop = [];
    
    // 2 common pets
    for (let i = 0; i < 2; i++) {
        const index = Math.floor(rng(seed + i) * PET_POOLS.common.length);
        shop.push(PET_POOLS.common[index]);
    }
    
    // 1 rare pet
    const rareIndex = Math.floor(rng(seed + 10) * PET_POOLS.rare.length);
    shop.push(PET_POOLS.rare[rareIndex]);
    
    // 1 legendary pet (30% chance)
    if (rng(seed + 20) < 0.3) {
        const legIndex = Math.floor(rng(seed + 21) * PET_POOLS.legendary.length);
        shop.push(PET_POOLS.legendary[legIndex]);
    }
    
    return shop;
}

// ═══ HELPER FUNCTIONS ═══
async function getBalanceFromDB(userId) {
    try {
        const result = await dbGet(
            'SELECT balance, bank FROM economy WHERE user_id = ?',
            [userId]
        );
        return result ? result.balance + result.bank : 0;
    } catch (error) {
        console.error('Balance fetch error:', error);
        return 0;
    }
}

async function addPetToInventory(userId, petId, petName) {
    try {
        // Add pet to user's inventory
        await dbRun(`
            INSERT INTO pets (user_id, pet_type, pet_name, level, xp, hunger, happiness, adopted_at)
            VALUES (?, ?, ?, 1, 0, 100, 100, ?)
        `, [userId, petId, petName, Math.floor(Date.now() / 1000)]);
        
        return true;
    } catch (error) {
        console.error('Add pet error:', error);
        return false;
    }
}

async function deductNEX(userId, amount) {
    try {
        await dbRun(`
            UPDATE economy SET balance = balance - ?
            WHERE user_id = ?
        `, [amount, userId]);
        
        return true;
    } catch (error) {
        console.error('Deduct NEX error:', error);
        return false;
    }
}

// ═══ MIDDLEWARE ═══
app.use(cors({
    origin: FRONTEND_URL,
    credentials: true
}));

app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET || 'nexus-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// ═══ OAUTH CALLBACK ═══
app.get('/auth/callback', async (req, res) => {
    const { code } = req.query;
    
    if (!code) {
        return res.redirect(`${FRONTEND_URL}?error=no_code`);
    }
    
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
        const balance = await getBalanceFromDB(user.id);
        
        req.session.user = {
            id: user.id,
            username: `${user.username}#${user.discriminator}`,
            avatar: user.avatar 
                ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
                : `https://cdn.discordapp.com/embed/avatars/0.png`,
            balance: balance
        };
        
        res.redirect(`${FRONTEND_URL}?login=success`);
        
    } catch (error) {
        console.error('OAuth error:', error);
        res.redirect(`${FRONTEND_URL}?error=oauth_failed`);
    }
});

// ═══ GET CURRENT USER ═══
app.get('/api/auth/me', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not logged in' });
    }
    
    // Refresh balance
    const freshBalance = await getBalanceFromDB(req.session.user.id);
    req.session.user.balance = freshBalance;
    
    res.json({
        success: true,
        user: req.session.user
    });
});

// ═══ GET SHOP PETS (HOURLY ROTATION) ═══
app.get('/api/shop/pets', (req, res) => {
    const pets = getHourlyShop();
    res.json({
        success: true,
        pets: pets,
        nextRotation: new Date(new Date().setHours(new Date().getHours() + 1, 0, 0, 0)).toISOString()
    });
});

// ═══ BUY PET (SYNCS WITH DISCORD) ═══
app.post('/api/shop/buy', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not logged in' });
    }
    
    const { petId } = req.body;
    
    if (!petId) {
        return res.status(400).json({ error: 'Missing petId' });
    }
    
    try {
        // Find pet in current shop
        const shop = getHourlyShop();
        const pet = shop.find(p => p.id === petId);
        
        if (!pet) {
            return res.status(404).json({ error: 'Pet not in current shop rotation' });
        }
        
        // Check balance
        const currentBalance = await getBalanceFromDB(req.session.user.id);
        
        if (currentBalance < pet.price) {
            return res.status(400).json({ 
                error: 'Insufficient NEX',
                required: pet.price,
                current: currentBalance
            });
        }
        
        // Deduct NEX
        await deductNEX(req.session.user.id, pet.price);
        
        // Add pet to inventory
        await addPetToInventory(req.session.user.id, pet.id, pet.name);
        
        // Get new balance
        const newBalance = await getBalanceFromDB(req.session.user.id);
        req.session.user.balance = newBalance;
        
        res.json({
            success: true,
            message: `${pet.name} added to your inventory!`,
            newBalance: newBalance,
            pet: pet
        });
        
    } catch (error) {
        console.error('Purchase error:', error);
        res.status(500).json({ error: 'Purchase failed' });
    }
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

// ═══ HEALTH ═══
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        redirect_uri: REDIRECT_URI,
        features: ['OAuth', 'Balance', 'Shop', 'Inventory Sync']
    });
});

// ═══ ROOT ═══
app.get('/', (req, res) => {
    res.json({
        message: 'Nexus Backend API',
        version: '3.0',
        features: {
            oauth: '/auth/callback',
            me: '/api/auth/me',
            shop: '/api/shop/pets',
            buy: '/api/shop/buy',
            logout: '/api/auth/logout'
        }
    });
});

// ═══ START SERVER ═══
app.listen(PORT, () => {
    console.log('═══════════════════════════════════════');
    console.log('✅ Nexus Backend COMPLETE');
    console.log(`📡 Port: ${PORT}`);
    console.log(`🔗 Redirect: ${REDIRECT_URI}`);
    console.log(`🌐 Frontend: ${FRONTEND_URL}`);
    console.log(`🏪 Shop: Hourly rotation active`);
    console.log(`💾 Database: ${dbPath}`);
    console.log('═══════════════════════════════════════');
});