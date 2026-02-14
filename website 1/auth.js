/*
═══════════════════════════════════════════════════════════════
FILE LOCATION: websites/main_site/auth.js
PUT THIS FILE IN: websites folder → main_site folder → auth.js
═══════════════════════════════════════════════════════════════

DISCORD OAUTH - FRONTEND IMPLEMENTATION
Works with oauth_backend.py running on your server
*/

// ═══ CONFIGURATION ═══
const DISCORD_CLIENT_ID = "1462605560884101130";  // Your bot ID
const BACKEND_URL = "http://localhost:3000";  // Change for production
const REDIRECT_URI = window.location.origin + "/";

// OAuth URL
const OAUTH_URL = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify`;

// ═══ LOGIN FUNCTION ═══
function loginWithDiscord() {
    // Save return URL
    localStorage.setItem('nexus_return_url', window.location.href);
    
    // Redirect to Discord OAuth
    window.location.href = OAUTH_URL;
}

// ═══ HANDLE OAUTH CALLBACK ═══
async function handleOAuthCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (!code) return false;
    
    try {
        // Show loading
        showLoading('Logging in...');
        
        // Exchange code for session token
        const response = await fetch(`${BACKEND_URL}/api/auth/discord`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Store session token
            localStorage.setItem('nexus_session', data.session_token);
            localStorage.setItem('nexus_user', JSON.stringify(data.user));
            
            // Clean URL
            window.history.replaceState({}, document.title, "/");
            
            // Return to saved URL or reload
            const returnUrl = localStorage.getItem('nexus_return_url');
            if (returnUrl) {
                localStorage.removeItem('nexus_return_url');
                window.location.href = returnUrl;
            } else {
                window.location.reload();
            }
            
            return true;
        } else {
            throw new Error(data.error || 'Login failed');
        }
        
    } catch (error) {
        console.error('OAuth error:', error);
        alert('Login failed: ' + error.message);
        
        // Clean URL
        window.history.replaceState({}, document.title, "/");
        
        return false;
    } finally {
        hideLoading();
    }
}

// ═══ CHECK LOGIN STATUS ═══
async function checkLoginStatus() {
    const sessionToken = localStorage.getItem('nexus_session');
    
    if (!sessionToken) {
        showLoggedOut();
        return null;
    }
    
    try {
        // Verify session with backend
        const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
            headers: {
                'Authorization': `Bearer ${sessionToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Invalid session');
        }
        
        const data = await response.json();
        
        if (data.success) {
            // Update stored user data
            localStorage.setItem('nexus_user', JSON.stringify(data.user));
            
            showLoggedIn(data.user);
            return data.user;
        } else {
            throw new Error('Session expired');
        }
        
    } catch (error) {
        console.error('Session error:', error);
        
        // Clear invalid session
        localStorage.removeItem('nexus_session');
        localStorage.removeItem('nexus_user');
        
        showLoggedOut();
        return null;
    }
}

// ═══ LOGOUT ═══
async function logout() {
    const sessionToken = localStorage.getItem('nexus_session');
    
    if (sessionToken) {
        try {
            await fetch(`${BACKEND_URL}/api/auth/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${sessionToken}`
                }
            });
        } catch (error) {
            console.error('Logout error:', error);
        }
    }
    
    // Clear local storage
    localStorage.removeItem('nexus_session');
    localStorage.removeItem('nexus_user');
    
    // Reload page
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
        if (balance) balance.textContent = `💎 ${user.balance.toLocaleString()} NEX`;
    }
}

function showLoggedOut() {
    // Show login button
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) loginBtn.style.display = 'block';
    
    // Hide user info
    const userInfo = document.getElementById('userInfo');
    if (userInfo) userInfo.classList.remove('active');
}

function showLoading(message) {
    const overlay = document.getElementById('loginOverlay');
    if (overlay) {
        overlay.classList.add('active');
        const text = overlay.querySelector('p');
        if (text) text.textContent = message;
    }
}

function hideLoading() {
    const overlay = document.getElementById('loginOverlay');
    if (overlay) overlay.classList.remove('active');
}

// ═══ REFRESH BALANCE ═══
async function refreshBalance() {
    const sessionToken = localStorage.getItem('nexus_session');
    if (!sessionToken) return;
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
            headers: {
                'Authorization': `Bearer ${sessionToken}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const balance = document.getElementById('nexBalance');
            if (balance) {
                balance.textContent = `💎 ${data.user.balance.toLocaleString()} NEX`;
            }
            
            // Update stored data
            localStorage.setItem('nexus_user', JSON.stringify(data.user));
        }
        
    } catch (error) {
        console.error('Balance refresh error:', error);
    }
}

// ═══ AUTO-REFRESH BALANCE EVERY 30 SECONDS ═══
setInterval(refreshBalance, 30000);

// ═══ INITIALIZE ON PAGE LOAD ═══
window.addEventListener('DOMContentLoaded', async () => {
    // Check for OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('code')) {
        await handleOAuthCallback();
    } else {
        // Check existing session
        await checkLoginStatus();
    }
});

// ═══ EXPORT FUNCTIONS ═══
window.nexusAuth = {
    login: loginWithDiscord,
    logout: logout,
    checkStatus: checkLoginStatus,
    refreshBalance: refreshBalance
};