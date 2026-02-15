/*
═══════════════════════════════════════════════════════════════
MINIMAL TEST BACKEND - GUARANTEED TO WORK
Deploy this FIRST to test if your backend works at all
═══════════════════════════════════════════════════════════════
*/

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// ═══ ENABLE CORS FOR EVERYONE (TESTING) ═══
app.use(cors());
app.use(express.json());

// ═══ ROOT - TEST IF BACKEND IS ALIVE ═══
app.get('/', (req, res) => {
    res.json({
        status: 'BACKEND IS ALIVE!',
        timestamp: new Date().toISOString(),
        message: 'If you see this, your backend is working!'
    });
});

// ═══ HEALTH CHECK ═══
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Backend is healthy!'
    });
});

// ═══ TEST SHOP API - HARDCODED DATA ═══
app.get('/api/shop/pets', (req, res) => {
    console.log('📦 Shop API called!');
    
    const pets = [
        {
            id: 'dog',
            name: 'Test Dog',
            emoji: '🐕',
            rarity: 'Common',
            description: 'This is a test pet',
            price: 500
        },
        {
            id: 'cat',
            name: 'Test Cat',
            emoji: '🐈',
            rarity: 'Common',
            description: 'This is another test pet',
            price: 500
        },
        {
            id: 'dragon',
            name: 'Test Dragon',
            emoji: '🐉',
            rarity: 'Legendary',
            description: 'This is a legendary test pet',
            price: 10000
        }
    ];
    
    res.json({
        success: true,
        pets: pets,
        message: 'Shop is working!'
    });
});

// ═══ TEST BUY API ═══
app.post('/api/shop/buy', (req, res) => {
    console.log('💰 Buy API called!');
    
    res.json({
        success: true,
        message: 'Purchase would work here!',
        newBalance: 1000
    });
});

// ═══ CATCH ALL - SHOW WHAT ROUTES EXIST ═══
app.use((req, res) => {
    res.status(404).json({
        error: 'Route not found',
        requested: req.path,
        method: req.method,
        availableRoutes: [
            'GET /',
            'GET /health',
            'GET /api/shop/pets',
            'POST /api/shop/buy'
        ]
    });
});

// ═══ START SERVER ═══
app.listen(PORT, () => {
    console.log('═══════════════════════════════════════');
    console.log('✅ TEST BACKEND RUNNING!');
    console.log(`📡 Port: ${PORT}`);
    console.log('');
    console.log('Test these URLs:');
    console.log('  GET  / ');
    console.log('  GET  /health');
    console.log('  GET  /api/shop/pets');
    console.log('  POST /api/shop/buy');
    console.log('═══════════════════════════════════════');
});