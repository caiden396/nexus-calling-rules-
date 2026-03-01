/*
═══════════════════════════════════════════════════════════════
NEXUS STAFF DASHBOARD - FRONTEND LOGIC (V3)
═══════════════════════════════════════════════════════════════
*/

const API_URL = 'https://nexus-staff-dashboard.onrender.com';

let currentUser = null;
let currentView = 'dashboard';
let userRole = null;

// ════ INITIALIZATION ════

async function init() {
    // Check if login parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('login') === 'success') {
        // Logged in successfully, fetch user data
        await fetchCurrentUser();
    } else if (urlParams.get('error')) {
        handleLoginError(urlParams.get('error'));
    } else {
        // Not logged in, check session
        await checkSession();
    }
}

async function checkSession() {
    try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            loadDashboard();
        } else {
            showLoginScreen();
        }
    } catch (error) {
        console.error('Session check error:', error);
        showLoginScreen();
    }
}

async function fetchCurrentUser() {
    try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            loadDashboard();
        } else {
            showLoginScreen();
        }
    } catch (error) {
        console.error('Error fetching user:', error);
        showLoginScreen();
    }
}

function loadDashboard() {
    // Update header with user info
    document.getElementById('userAvatar').src = currentUser.avatar;
    document.getElementById('userName').textContent = currentUser.username;
    document.getElementById('userRole').textContent = currentUser.rank;

    // set userRole for logic
    userRole = currentUser.role || currentUser.rank || 'helper';

    // apply UI customizations based on role
    customizeWelcome();

    // Load dashboard data
    loadDashboardStats();
    loadRecentCases();
}

function showLoginScreen() {
    // Direct OAuth link (fixed redirect URI)
    const loginUrl = "https://discord.com/oauth2/authorize?client_id=1462605560884101130&redirect_uri=https%3A%2F%2Fnexus-staff-dashboard.onrender.com%2Fauth%2Fcallback&response_type=code&scope=identify%20guilds.members.read";
    window.location.href = loginUrl;
}

function handleLoginError(error) {
    alert(`Login failed: ${error}`);
    showLoginScreen();
}

// ════ DASHBOARD ════

async function loadDashboardStats() {
    try {
        const response = await fetch(`${API_URL}/api/analytics/dashboard`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            document.getElementById('totalCases').textContent = data.stats.total_cases;
            document.getElementById('pendingCases').textContent = data.stats.pending_cases;
            document.getElementById('pendingAppeals').textContent = data.stats.pending_appeals;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// ════ UI CUSTOMIZATION ════
function customizeWelcome() {
    const banner = document.getElementById('welcomeBanner');
    const roleEl = document.getElementById('userRole');
    const config = {
        owner: { text: '👑 Platform Director', bg: 'linear-gradient(135deg, #FFD700, #FFA500)' },
        calling_staff: { text: '📞 Calling Staff', bg: 'linear-gradient(135deg, #667eea, #764ba2)' },
        support_staff: { text: '🛠️ Support Staff', bg: 'linear-gradient(135deg, #4CAF50, #45a049)' },
        helper: { text: '🌟 Calling Associate', bg: 'linear-gradient(135deg, #2196F3, #1976D2)' }
    };

    if (config[userRole]) {
        roleEl.textContent = config[userRole].text;
        if (banner) banner.style.background = config[userRole].bg;
    }

    // hide owner-only UI
    if (userRole !== 'owner') {
        document.querySelectorAll('.owner-only').forEach(el => el.style.display = 'none');
    }
}

async function loadRecentCases() {
    try {
        const response = await fetch(`${API_URL}/api/calling/cases`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            populateCasesTable(data.cases.slice(0, 5), 'recentCasesTable');
            populateAllCasesTable(data.cases, 'allCasesTable');
        }
    } catch (error) {
        console.error('Error loading cases:', error);
    }
}

function populateCasesTable(cases, tableId) {
    const tbody = document.getElementById(tableId);
    
    if (cases.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #666;">No cases found</td></tr>';
        return;
    }
    
    tbody.innerHTML = cases.map(c => `
        <tr onclick="viewCase('${c.id}')">
            <td><span class="case-id">${c.case_number}</span></td>
            <td>${c.reported_id}</td>
            <td>${c.reason}</td>
            <td><span class="priority-${c.priority}">${c.priority.toUpperCase()}</span></td>
            <td><span class="status-badge status-${c.status}">${c.status.toUpperCase()}</span></td>
            <td>${new Date(c.created_at).toLocaleDateString()}</td>
        </tr>
    `).join('');
}

function populateAllCasesTable(cases, tableId) {
    const tbody = document.getElementById(tableId);
    
    if (cases.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #666;">No cases found</td></tr>';
        return;
    }
    
    tbody.innerHTML = cases.map(c => `
        <tr>
            <td><span class="case-id">${c.case_number}</span></td>
            <td>${c.reported_id}</td>
            <td>${c.reason}</td>
            <td><span class="priority-${c.priority}">${c.priority.toUpperCase()}</span></td>
            <td><span class="status-badge status-${c.status}">${c.status.toUpperCase()}</span></td>
            <td>${c.assigned_to || 'Unassigned'}</td>
            <td><button onclick="viewCase('${c.id}')" style="padding: 5px 10px; background: #8bc34a; color: #000; border: none; border-radius: 4px; cursor: pointer;">View</button></td>
        </tr>
    `).join('');
}

async function viewCase(caseId) {
    try {
        const response = await fetch(`${API_URL}/api/calling/cases/${caseId}`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            // Show case details modal
            alert(`Case: ${data.case.case_number}\nStatus: ${data.case.status}\nNotes: ${data.notes.length} internal notes`);
        }
    } catch (error) {
        console.error('Error viewing case:', error);
    }
}

// ════ APPEALS ════

async function loadAppeals() {
    try {
        const response = await fetch(`${API_URL}/api/appeals`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            populateAppealsTable(data.appeals);
        }
    } catch (error) {
        console.error('Error loading appeals:', error);
    }
}

function populateAppealsTable(appeals) {
    const tbody = document.getElementById('appealsTable');
    
    if (appeals.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #666;">No pending appeals</td></tr>';
        return;
    }
    
    tbody.innerHTML = appeals.map(a => `
        <tr>
            <td>${a.id.slice(0, 8)}</td>
            <td>${a.user_id}</td>
            <td>${a.appeal_type}</td>
            <td>${a.message.substring(0, 40)}...</td>
            <td><span class="status-badge status-pending">${a.status.toUpperCase()}</span></td>
            <td><button onclick="reviewAppeal('${a.id}')" style="padding: 5px 10px; background: #8bc34a; color: #000; border: none; border-radius: 4px; cursor: pointer;">Review</button></td>
        </tr>
    `).join('');
}

// ════ ENFORCEMENT ════

async function loadEnforcement() {
    try {
        const response = await fetch(`${API_URL}/api/enforcement`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            populateEnforcementTable(data.records);
        }
    } catch (error) {
        console.error('Error loading enforcement:', error);
    }
}

function populateEnforcementTable(records) {
    const tbody = document.getElementById('enforcementTable');
    
    if (records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #666;">No enforcement actions</td></tr>';
        return;
    }
    
    tbody.innerHTML = records.map(r => `
        <tr>
            <td>${r.user_id}</td>
            <td>${r.type.toUpperCase()}</td>
            <td>${r.reason}</td>
            <td>${r.issued_by}</td>
            <td>${new Date(r.issued_at).toLocaleDateString()}</td>
            <td>${r.expires_at ? new Date(r.expires_at).toLocaleDateString() : 'Permanent'}</td>
        </tr>
    `).join('');
}

// ════ MODALS ════

function openNewCaseModal() {
    document.getElementById('newCaseModal').classList.add('active');
}

function openEnforcementModal() {
    document.getElementById('enforcementModal').classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

async function submitNewCase(event) {
    event.preventDefault();
    
    const reporterId = document.getElementById('reporterId').value;
    const reportedId = document.getElementById('reportedId').value;
    const reason = document.getElementById('caseReason').value;
    const priority = document.getElementById('casePriority').value;
    const callDuration = parseInt(document.getElementById('callDuration').value) || 0;
    
    try {
        const response = await fetch(`${API_URL}/api/calling/cases`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                reporter_id: reporterId,
                reported_id: reportedId,
                reason: reason,
                priority: priority,
                call_duration: callDuration
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            alert(`Case created: ${data.case.case_number}`);
            closeModal('newCaseModal');
            loadRecentCases();
            loadDashboardStats();
        } else {
            const error = await response.json();
            alert(`Error: ${error.error}`);
        }
    } catch (error) {
        console.error('Error creating case:', error);
        alert('Failed to create case');
    }
}

async function submitEnforcement(event) {
    event.preventDefault();
    
    const userId = document.getElementById('enforcementUserId').value;
    const type = document.getElementById('enforcementType').value;
    const reason = document.getElementById('enforcementReason').value;
    const duration = parseInt(document.getElementById('enforcementDuration').value) || 0;
    
    try {
        const response = await fetch(`${API_URL}/api/enforcement`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                type: type,
                reason: reason,
                duration: duration
            })
        });
        
        if (response.ok) {
            alert('Enforcement action issued');
            closeModal('enforcementModal');
            loadEnforcement();
        } else {
            const error = await response.json();
            alert(`Error: ${error.error}`);
        }
    } catch (error) {
        console.error('Error issuing enforcement:', error);
        alert('Failed to issue enforcement');
    }
}

async function reviewAppeal(appealId) {
    const decision = prompt('Review decision (approved/denied):');
    const reason = prompt('Reason for decision:');
    
    if (!decision || !reason) return;
    
    try {
        const response = await fetch(`${API_URL}/api/appeals/${appealId}/review`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                decision: decision,
                reason: reason
            })
        });
        
        if (response.ok) {
            alert('Appeal reviewed');
            loadAppeals();
        } else {
            const error = await response.json();
            alert(`Error: ${error.error}`);
        }
    } catch (error) {
        console.error('Error reviewing appeal:', error);
        alert('Failed to review appeal');
    }
}

// ════ NAVIGATION ════

function switchView(view, evt) {
    // Hide all views
    document.querySelectorAll('.content-view').forEach(v => v.classList.add('hidden'));
    
    // Remove active from nav items
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    
    // Show selected view
    const viewElement = document.getElementById(`${view}-view`);
    if (viewElement) {
        viewElement.classList.remove('hidden');
    }
    
    // Mark nav item as active (use passed event)
    if (evt && evt.target) {
        const nav = evt.target.closest('.nav-item');
        if (nav) nav.classList.add('active');
    }
    
    // Update page title
    const titles = {
        'dashboard': 'Dashboard',
        'calling-cases': 'Calling Cases',
        'appeals': 'Appeals',
        'enforcement': 'Enforcement',
        'guides': 'Rule Guides',
        'notes': 'Internal Notes',
        'staff-analytics': 'Staff Performance'
    };
    
    document.getElementById('pageTitle').textContent = titles[view] || 'Dashboard';
    
    // Load data for specific views
    switch(view) {
        case 'calling-cases':
            loadRecentCases();
            break;
        case 'appeals':
            loadAppeals();
            break;
        case 'enforcement':
            loadEnforcement();
            break;
        case 'dashboard':
            loadDashboardStats();
            loadRecentCases();
            break;
    }
    
    currentView = view;
}

// ════ AUTHENTICATION ════

async function logout() {
    try {
        const response = await fetch(`${API_URL}/api/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        
        if (response.ok) {
            window.location.href = '/';
        }
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Update time display
function updateTime() {
    const now = new Date();
    document.getElementById('statusTime').textContent = now.toLocaleTimeString();
}

// ════ STARTUP ════

document.addEventListener('DOMContentLoaded', () => {
    init();
    updateTime();
    setInterval(updateTime, 1000);
    
    // Auto-refresh data every 30 seconds
    setInterval(() => {
        if (currentView === 'dashboard') {
            loadDashboardStats();
            loadRecentCases();
        }
    }, 30000);
    
    // Close modal when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
});

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