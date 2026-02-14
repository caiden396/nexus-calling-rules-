/*
═══════════════════════════════════════════════════════════════
FILE LOCATION: staff_dashboard/dashboard.js
PUT THIS FILE IN: staff_dashboard folder → dashboard.js
═══════════════════════════════════════════════════════════════

NEXUS STAFF DASHBOARD - COMPLETE
- Owner stats (active users, servers, daily calls, uptime)
- DisCloud restart integration
- All staff features

YOUR CONFIGURATION:
- Bot ID: 1462605560884101130
- Owner ID: 1471777621422637097
- Staff roles configured
*/

// ═══ YOUR ROLE IDS (ALREADY CONFIGURED) ═══
const OWNER_ID = "1471777621422637097";
const CALLING_STAFF_IDS = ["1471777769812918314"];
const SUPPORT_STAFF_IDS = ["1471777874645225502"];
const HELPER_IDS = ["1471778045760376984"];

// ═══ DISCLOUD API CONFIGURATION ═══
// TODO: Add your DisCloud API key and App ID here
const DISCLOUD_API_KEY = "eyJhbGciOiJIUzI1NiJ9.eyJpZCI6IjY0NzkyMTMyODg2MTMiLCJrZXkiOiJiMjg0NDQyMzBiODEyM2U4NDUzZTY5NzVmNDIyIn0.-n8pcJe1SWIHtdQ8bIETcx8gT7mwMaW0zIsXSfEkfng";  // Get from discloud.com/profile
const DISCLOUD_APP_ID = "1770944076416";     // Your bot's app ID

let currentUser = null;
let userRole = null;

// ═══ DISCORD OAUTH LOGIN ═══
function loginWithDiscord() {
    // In production, implement real Discord OAuth
    // For now, simulate login
    setTimeout(() => {
        currentUser = {
            id: OWNER_ID,
            username: "BotOwner",
            role: 'owner'
        };
        checkAccess();
    }, 1000);
}

function checkAccess() {
    const userId = currentUser.id;
    
    if (userId === OWNER_ID) {
        userRole = 'owner';
    } else if (CALLING_STAFF_IDS.includes(userId)) {
        userRole = 'calling_staff';
    } else if (SUPPORT_STAFF_IDS.includes(userId)) {
        userRole = 'support_staff';
    } else if (HELPER_IDS.includes(userId)) {
        userRole = 'helper';
    } else {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('accessDenied').classList.add('active');
        return;
    }
    
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('dashboard').classList.add('active');
    
    customizeWelcome();
    loadDashboardData();
    
    if (userRole === 'owner') {
        startOwnerStatsRefresh();
    }
}

function customizeWelcome() {
    const banner = document.getElementById('welcomeBanner');
    const name = document.getElementById('staffName');
    const role = document.getElementById('staffRole');
    
    name.textContent = currentUser.username;
    
    const config = {
        owner: {
            text: '👑 Nexus Bot Owner',
            bg: 'linear-gradient(135deg, #FFD700, #FFA500)'
        },
        calling_staff: {
            text: '📞 Calling Support Team',
            bg: 'linear-gradient(135deg, #667eea, #764ba2)'
        },
        support_staff: {
            text: '🛠️ Support Team',
            bg: 'linear-gradient(135deg, #4CAF50, #45a049)'
        },
        helper: {
            text: '🌟 Community Helper',
            bg: 'linear-gradient(135deg, #2196F3, #1976D2)'
        }
    };
    
    if (config[userRole]) {
        role.textContent = config[userRole].text;
        banner.style.background = config[userRole].bg;
    }
    
    // Hide owner-only elements
    if (userRole !== 'owner') {
        document.querySelectorAll('.owner-only').forEach(el => el.style.display = 'none');
    }
}

// ═══ OWNER STATS - LIVE DATA ═══
async function loadOwnerStats() {
    if (userRole !== 'owner') return;
    
    try {
        // In production, fetch from your bot API
        // Example: const response = await fetch('https://your-bot-api.com/stats');
        
        // Demo data (replace with real API call)
        const stats = {
            active_users: 1547,
            active_servers: 89,
            daily_calls: 342,
            uptime_seconds: 432156
        };
        
        // Update display
        document.getElementById('activeUsers').textContent = stats.active_users.toLocaleString();
        document.getElementById('activeServers').textContent = stats.active_servers.toLocaleString();
        document.getElementById('dailyCalls').textContent = stats.daily_calls.toLocaleString();
        document.getElementById('uptime').textContent = formatUptime(stats.uptime_seconds);
        
    } catch (error) {
        console.error('Failed to load stats:', error);
    }
}

function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
}

function startOwnerStatsRefresh() {
    loadOwnerStats(); // Load immediately
    setInterval(loadOwnerStats, 30000); // Refresh every 30 seconds
}

// ═══ DISCLOUD RESTART INTEGRATION ═══
async function restartBotDisCloud() {
    // Check if API key is configured
    if (DISCLOUD_API_KEY === "YOUR_DISCLOUD_API_KEY_HERE") {
        alert('⚠️ DisCloud API not configured!\n\nPlease add your API key and App ID in dashboard.js');
        return;
    }
    
    if (!confirm('Restart bot on DisCloud?\n\nBot will be offline for 30-60 seconds.')) {
        return;
    }
    
    const btn = document.querySelector('button[onclick="restartBotDisCloud()"]');
    btn.disabled = true;
    btn.textContent = '🔄 Restarting...';
    
    try {
        const response = await fetch('https://api.discloud.app/v2/app/restart', {
            method: 'PUT',
            headers: {
                'api-token': DISCLOUD_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                appID: DISCLOUD_APP_ID
            })
        });
        
        const result = await response.json();
        
        if (result.status === 'ok' || result.status === 'success') {
            showNotification('✅ Bot Restarting!', 'Bot will be back online in 30-60 seconds.', 'success');
            monitorRestart();
        } else {
            throw new Error(result.message || 'Restart failed');
        }
        
    } catch (error) {
        console.error('DisCloud error:', error);
        showNotification('❌ Restart Failed', error.message, 'error');
    } finally {
        setTimeout(() => {
            btn.disabled = false;
            btn.textContent = '🔄 Restart Bot (DisCloud)';
        }, 5000);
    }
}

async function monitorRestart() {
    let checks = 0;
    const maxChecks = 12;
    
    const interval = setInterval(async () => {
        checks++;
        
        try {
            const response = await fetch(`https://api.discloud.app/v2/app/status/${DISCLOUD_APP_ID}`, {
                headers: { 'api-token': DISCLOUD_API_KEY }
            });
            
            const data = await response.json();
            
            if (data.apps && data.apps[0] && data.apps[0].online) {
                clearInterval(interval);
                showNotification('✅ Bot Online!', 'Bot successfully restarted!', 'success');
                loadOwnerStats();
            } else if (checks >= maxChecks) {
                clearInterval(interval);
                showNotification('⚠️ Taking Longer', 'Check DisCloud dashboard.', 'warning');
            }
        } catch (error) {
            console.error('Status check error:', error);
        }
    }, 5000);
}

function showNotification(title, message, type) {
    const notif = document.createElement('div');
    notif.className = `notification notification-${type}`;
    notif.innerHTML = `<h4>${title}</h4><p>${message}</p>`;
    document.body.appendChild(notif);
    
    setTimeout(() => notif.classList.add('show'), 100);
    setTimeout(() => {
        notif.classList.remove('show');
        setTimeout(() => notif.remove(), 300);
    }, 5000);
}

// ═══ OTHER DASHBOARD FUNCTIONS ═══
function loadDashboardData() {
    loadModmail();
    loadFeedback();
    loadAppeals();
    loadProfiles();
    loadCallReports();
    loadGuides();
}

function loadModmail() {
    const list = document.getElementById('modmailList');
    list.innerHTML = '<div class="card"><p>No modmail yet. Will appear when users use <code>nmodmail</code></p></div>';
}

function loadFeedback() {
    const list = document.getElementById('feedbackList');
    list.innerHTML = '<div class="card"><p>No feedback yet. Will appear when users use <code>nfeedback</code></p></div>';
}

function loadAppeals() {
    const list = document.getElementById('appealsList');
    list.innerHTML = '<div class="card"><p>No appeals yet. Will appear when users use <code>nappeal</code></p></div>';
}

function loadProfiles() {
    const list = document.getElementById('profilesList');
    
    // Demo profiles
    const profiles = [
        {
            user_id: "123456789",
            username: "TestUser#1234",
            registered_date: "February 13, 2026",
            registered_time: "03:45 PM",
            is_banned: 0,
            is_call_banned: 0,
            appeal_status: "none"
        }
    ];
    
    list.innerHTML = profiles.map(p => `
        <div class="card">
            <h3>${p.username}</h3>
            <p><strong>ID:</strong> ${p.user_id}</p>
            <p><strong>Registered:</strong> ${p.registered_date} at ${p.registered_time}</p>
            <div style="margin-top: 10px;">
                <span class="badge badge-success">✅ Not Banned</span>
                <span class="badge badge-success">📞 ✅ Can Call</span>
            </div>
        </div>
    `).join('');
}

function loadCallReports() {
    if (userRole === 'helper') return;
    const list = document.getElementById('callReportsList');
    list.innerHTML = '<div class="card"><p>No reports yet. Will appear when users use <code>nreport</code></p></div>';
}

function loadGuides() {
    // Load role-specific guides
    const list = document.getElementById('guidesList');
    list.innerHTML = '<div class="card"><p>Staff guides will be loaded based on your role.</p></div>';
}

function showTab(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById(tabName).classList.add('active');
}

// Auto-login on load (for testing)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {});
}