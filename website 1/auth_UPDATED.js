/*
═══════════════════════════════════════════════════════════════
FILE LOCATION: websites/main_site/auth.js (UPDATED)
REPLACE YOUR EXISTING auth.js WITH THIS VERSION
═══════════════════════════════════════════════════════════════

FRONTEND AUTH - WORKS WITH BACKEND SERVER
*/

// ═══ CONFIGURATION ═══
const DISCORD_CLIENT_ID = "1462605560884101130";
const BACKEND_URL = "https://nexus-oauth-backend.onrender.com";  // Your backend URL
const REDIRECT_URI = "https://nexus-site-hv2f.onrender.com/auth/callback";

// OAuth URL - sends user to Discord
const OAUTH_URL = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify`;

// ═══ LOGIN FUNCTION ═══
function loginWithDiscord() {
    console.log('🔐 Redirecting to Discord OAuth...');
    window.location.href = OAUTH_URL;
}

// ═══ CHECK LOGIN STATUS ═══
async function checkLoginStatus() {
    // Check URL params for login success/error
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.has('login') && urlParams.get('login') === 'success') {
        console.log('✅ Login successful!');
        // Clean URL
        window.history.replaceState({}, document.title, '/');
    }
    
    if (urlParams.has('error')) {
        console.error('❌ Login error:', urlParams.get('error'));
        alert('Login failed. Please try again.');
        // Clean URL
        window.history.replaceState({}, document.title, '/');
        showLoggedOut();
        return null;
    }
    
    // Check session with backend
    try {
        const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
            credentials: 'include'  // Important: sends cookies
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ User logged in:', data.user.username);
            showLoggedIn(data.user);
            return data.user;
        } else {
            console.log('ℹ️ Not logged in');
            showLoggedOut();
            return null;
        }
    } catch (error) {
        console.error('❌ Session check failed:', error);
        showLoggedOut();
        return null;
    }
}

// ═══ LOGOUT ═══
async function logout() {
    try {
        await fetch(`${BACKEND_URL}/api/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        console.log('✅ Logged out');
    } catch (error) {
        console.error('❌ Logout error:', error);
    }
    
    showLoggedOut();
    window.location.reload();
}

// ═══ UI FUNCTIONS ═══
function showLoggedIn(user) {
    // Hide login button
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) loginBtn.style.display = 'none';
    
    // Show user info
    const userInfo = document.getElementById('userInfo');
    if (userInfo) {
        userInfo.classList.add('active');
        
        const username = document.getElementById('username');
        if (username) username.textContent = user.username;
        
        const avatar = document.getElementById('userAvatar');
        if (avatar) avatar.src = user.avatar;
        
        const balance = document.getElementById('nexBalance');
        if (balance) {
            // TODO: Fetch real balance from bot database
            balance.textContent = `💎 ${user.balance || 0} NEX`;
        }
    }
    
    console.log('✅ UI updated for logged in user');
}

function showLoggedOut() {
    // Show login button
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) loginBtn.style.display = 'block';
    
    // Hide user info
    const userInfo = document.getElementById('userInfo');
    if (userInfo) userInfo.classList.remove('active');
    
    console.log('ℹ️ UI updated for logged out state');
}

// ═══ REFRESH BALANCE ═══
async function refreshBalance() {
    try {
        const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            
            const balance = document.getElementById('nexBalance');
            if (balance) {
                balance.textContent = `💎 ${data.user.balance || 0} NEX`;
            }
        }
    } catch (error) {
        console.error('❌ Balance refresh error:', error);
    }
}

// Auto-refresh balance every 30 seconds
setInterval(refreshBalance, 30000);

// ═══ INITIALIZE ON PAGE LOAD ═══
window.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initializing auth...');
    await checkLoginStatus();
});

// ═══ EXPORT FUNCTIONS ═══
window.nexusAuth = {
    login: loginWithDiscord,
    logout: logout,
    checkStatus: checkLoginStatus,
    refreshBalance: refreshBalance
};

console.log('✅ Auth module loaded');