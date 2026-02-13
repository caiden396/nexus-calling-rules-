// Nexus Staff Dashboard - Complete System
// UPDATED WITH YOUR ROLE IDS
const OWNER_ID = "1471777621422637097";
const CALLING_STAFF_IDS = ["1471777769812918314"];
const SUPPORT_STAFF_IDS = ["1471777874645225502"];
const HELPER_IDS = ["1471778045760376984"];

// Current user
let currentUser = null;
let userRole = null;

// Staff Guides Data
const guides = {
    calling: [
        {
            title: "Handling Inappropriate Content",
            steps: [
                "Review the case number and chat log thoroughly",
                "Verify NSFW content was actually shared",
                "Check user's past infractions in database",
                "First offense: 7-day calling ban",
                "Second offense: 30-day calling ban",
                "Third offense: Permanent calling ban",
                "Document decision with case notes"
            ]
        },
        {
            title: "Harassment Reports",
            steps: [
                "Read full conversation from ncall to nreport",
                "Identify specific harassment instances",
                "Check if user admitted wrongdoing (Truth Protocol)",
                "If admitted: Reduced punishment + Quest system",
                "If denied: Standard punishment based on severity",
                "Ban duration: 1-30 days based on severity",
                "Follow up with both users"
            ]
        },
        {
            title: "Spam/Bot Abuse",
            steps: [
                "Check skip frequency in logs",
                "Verify if automated behavior",
                "Review message patterns",
                "Warning for first offense",
                "24-hour ban for second offense",
                "Permanent ban for confirmed bot usage",
                "Report to Discord if ToS violation"
            ]
        },
        {
            title: "False Reports",
            steps: [
                "Compare chat log with report reason",
                "Check if report was malicious",
                "Warning to reporter if false",
                "Report abuse = 7-day ban from reporting",
                "Repeated false reports = calling ban",
                "Document false report incidents",
                "No punishment if honest mistake"
            ]
        },
        {
            title: "Truth Protocol Application",
            steps: [
                "User must voluntarily admit wrongdoing",
                "Reduce ban by 50% if truthful",
                "Assign Quest to earn back NEX",
                "User protected from theft/robbery during Quest",
                "Monitor Quest completion",
                "Full privileges restored after Quest complete",
                "Mark case as 'Truth Protocol Applied'"
            ]
        }
    ],
    support: [
        {
            title: "Modmail Response Protocol",
            steps: [
                "Read ticket within 2 hours of submission",
                "Respond with 'Nexus Support Team' signature",
                "Use professional, friendly tone",
                "Ask clarifying questions if needed",
                "Provide step-by-step solutions",
                "Follow up within 24 hours",
                "Close ticket only after user confirms resolution"
            ]
        },
        {
            title: "Technical Issues",
            steps: [
                "Ask user for error message/screenshot",
                "Check if command is working for others",
                "Test command in test server",
                "If bot issue: Report to owner immediately",
                "If user error: Guide them step-by-step",
                "Provide alternative solutions",
                "Document issue for knowledge base"
            ]
        },
        {
            title: "Feature Requests",
            steps: [
                "Thank user for feedback",
                "Add to feedback database",
                "Check if already planned",
                "Explain if feature not possible",
                "Set realistic expectations",
                "Follow up if feature gets added",
                "Mark as 'Reviewed'"
            ]
        },
        {
            title: "Billing/Premium Issues",
            steps: [
                "Verify purchase in payment system",
                "Check premium status in database",
                "If payment confirmed but no premium: Escalate to owner",
                "If refund requested: Check 7-day window",
                "Process refunds within 24 hours",
                "Cancel subscription if requested",
                "Confirm action with user"
            ]
        },
        {
            title: "Ban Appeal Review",
            steps: [
                "Read original ban reason",
                "Review evidence/logs",
                "Check ban duration and severity",
                "If reasonable appeal: Discuss with team",
                "If malicious appeal: Deny with explanation",
                "Response time: Within 24 hours",
                "Document decision rationale"
            ]
        }
    ],
    helper: [
        {
            title: "Welcoming New Users",
            steps: [
                "Greet new members within 5 minutes",
                "Use friendly, welcoming tone",
                "Direct to #rules and #commands channels",
                "Offer to answer questions",
                "Encourage registration with bot",
                "Share helpful resources",
                "Follow up if they seem confused"
            ]
        },
        {
            title: "Channel Direction",
            steps: [
                "Politely redirect off-topic messages",
                "Explain channel purposes clearly",
                "Link to correct channels",
                "Use helpful tone, not punitive",
                "Thank users for cooperating",
                "Monitor for repeated misuse",
                "Report serious issues to support"
            ]
        },
        {
            title: "Basic Troubleshooting",
            steps: [
                "Ask what command they're trying to use",
                "Check if they're registered (nregister)",
                "Verify command syntax",
                "Test command yourself if possible",
                "If can't solve: Tag support staff",
                "Stay with user until helped",
                "Thank them for patience"
            ]
        },
        {
            title: "Community Building",
            steps: [
                "Encourage positive interactions",
                "Highlight cool bot features",
                "Share tips and tricks",
                "Organize community events",
                "Celebrate user milestones",
                "Foster inclusive environment",
                "Report concerning behavior"
            ]
        },
        {
            title: "Escalation Protocol",
            steps: [
                "Identify when issue needs staff",
                "Gather all relevant information",
                "Tag appropriate staff role",
                "Brief staff on situation",
                "Stay available for questions",
                "Follow up on resolution",
                "Learn from the interaction"
            ]
        }
    ]
};

// Simulate Discord OAuth login
function loginWithDiscord() {
    // In production, this would redirect to Discord OAuth
    // For now, simulate login
    
    // Simulate getting user data
    setTimeout(() => {
        // DEMO: Randomly assign role for testing
        // REMOVE THIS IN PRODUCTION - Replace with actual OAuth
        const roles = ['owner', 'calling_staff', 'support_staff', 'helper', 'none'];
        const randomRole = roles[Math.floor(Math.random() * roles.length)];
        
        // In production, check actual Discord user ID and roles
        currentUser = {
            id: "123456789",
            username: "StaffMember#1234",
            role: randomRole
        };
        
        checkAccess();
    }, 1000);
}

function checkAccess() {
    const role = currentUser.role;
    
    if (role === 'none') {
        // Access denied
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('accessDenied').classList.add('active');
        return;
    }
    
    // Grant access
    userRole = role;
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('dashboard').classList.add('active');
    
    // Customize welcome
    customizeWelcome();
    
    // Load appropriate data
    loadDashboardData();
}

function customizeWelcome() {
    const bannerEl = document.getElementById('welcomeBanner');
    const nameEl = document.getElementById('staffName');
    const roleEl = document.getElementById('staffRole');
    
    nameEl.textContent = currentUser.username;
    
    switch(userRole) {
        case 'owner':
            roleEl.textContent = '👑 Nexus Bot Owner';
            bannerEl.style.background = 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)';
            break;
        case 'calling_staff':
            roleEl.textContent = '📞 Calling Support Team';
            bannerEl.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            document.querySelectorAll('.owner-only').forEach(el => el.style.display = 'none');
            break;
        case 'support_staff':
            roleEl.textContent = '🛠️ Support Team Member';
            bannerEl.style.background = 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)';
            document.querySelectorAll('.owner-only').forEach(el => el.style.display = 'none');
            break;
        case 'helper':
            roleEl.textContent = '🌟 Community Helper';
            bannerEl.style.background = 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)';
            document.querySelectorAll('.owner-only').forEach(el => el.style.display = 'none');
            document.querySelector('[onclick="showTab(\'call-reports\')"]').style.display = 'none';
            document.querySelector('[onclick="showTab(\'appeals\')"]').style.display = 'none';
            break;
    }
}

function loadDashboardData() {
    loadModmail();
    loadFeedback();
    loadAppeals();
    loadCallReports();
    loadGuides();
}

function loadModmail() {
    const modmailList = document.getElementById('modmailList');
    
    const tickets = [
        {
            id: 1,
            user: "User123",
            user_id: "987654321",
            message: "I can't use the bot after being banned. How do I appeal?",
            status: "open",
            time: "2 hours ago"
        },
        {
            id: 2,
            user: "CoolGamer",
            user_id: "123123123",
            message: "The slots command isn't working for me.",
            status: "open",
            time: "5 hours ago"
        }
    ];
    
    modmailList.innerHTML = tickets.map(ticket => `
        <div class="ticket-item ${ticket.status}" onclick="openModmailTicket(${ticket.id})">
            <h4>Ticket #${ticket.id} - ${ticket.user}</h4>
            <p>${ticket.message}</p>
            <small>User ID: ${ticket.user_id} • ${ticket.time}</small>
        </div>
    `).join('');
}

function loadFeedback() {
    const feedbackList = document.getElementById('feedbackList');
    
    const feedback = [
        {
            id: 1,
            user: "HappyUser",
            server: "Gaming Central",
            feedback: "Love the calling feature! Would be cool to have group calls.",
            time: "1 day ago"
        }
    ];
    
    feedbackList.innerHTML = feedback.map(f => `
        <div class="card">
            <h4>Feedback #${f.id}</h4>
            <p><strong>From:</strong> ${f.user}</p>
            <p><strong>Server:</strong> ${f.server}</p>
            <p><strong>Feedback:</strong> ${f.feedback}</p>
            <small>${f.time}</small>
            <br><br>
            <button class="btn btn-success" onclick="markReviewed(${f.id})">Mark as Reviewed</button>
        </div>
    `).join('');
}

function loadAppeals() {
    const appealsList = document.getElementById('appealsList');
    
    const appeals = [
        {
            id: 1,
            user: "BannedUser",
            user_id: "555555555",
            reason: "I was banned for NSFW content but it was a misunderstanding. The image was actually from a game.",
            status: "pending",
            time: "3 hours ago"
        }
    ];
    
    appealsList.innerHTML = appeals.map(appeal => `
        <div class="ticket-item ${appeal.status}">
            <h4>Appeal #${appeal.id} - ${appeal.user}</h4>
            <p><strong>User ID:</strong> ${appeal.user_id}</p>
            <p><strong>Reason:</strong> ${appeal.reason}</p>
            <small>${appeal.time}</small>
            <br><br>
            <button class="btn btn-success" onclick="acceptAppeal(${appeal.id})">✅ Accept</button>
            <button class="btn btn-danger" onclick="denyAppeal(${appeal.id})">❌ Deny</button>
        </div>
    `).join('');
}

function loadCallReports() {
    if (userRole === 'helper') return;
    
    const reportsList = document.getElementById('callReportsList');
    
    const reports = [
        {
            case: 1,
            reporter: "User456",
            reported: "BadUser789",
            reason: "Harassment and inappropriate language",
            time: "1 hour ago"
        }
    ];
    
    reportsList.innerHTML = reports.map(report => `
        <div class="ticket-item" onclick="openCallReport(${report.case})">
            <h4>Case #${report.case}</h4>
            <p><strong>Reporter:</strong> ${report.reporter}</p>
            <p><strong>Reported:</strong> ${report.reported}</p>
            <p><strong>Reason:</strong> ${report.reason}</p>
            <small>${report.time}</small>
        </div>
    `).join('');
}

function loadGuides() {
    const guidesList = document.getElementById('guidesList');
    let guidesToShow = [];
    
    switch(userRole) {
        case 'calling_staff':
            guidesToShow = guides.calling;
            break;
        case 'support_staff':
            guidesToShow = guides.support;
            break;
        case 'helper':
            guidesToShow = guides.helper;
            break;
        case 'owner':
            guidesToShow = [...guides.calling, ...guides.support, ...guides.helper];
            break;
    }
    
    guidesList.innerHTML = guidesToShow.map((guide, index) => `
        <div class="guide">
            <h4>${guide.title}</h4>
            <ol>
                ${guide.steps.map(step => `<li>${step}</li>`).join('')}
            </ol>
        </div>
    `).join('');
}

function showTab(tabName) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById(tabName).classList.add('active');
}

function openModmailTicket(id) {
    const modal = document.getElementById('ticketModal');
    const content = document.getElementById('modalContent');
    
    content.innerHTML = `
        <h2>Modmail Ticket #${id}</h2>
        <div class="card">
            <p><strong>User:</strong> User123 (987654321)</p>
            <p><strong>Message:</strong> I can't use the bot after being banned. How do I appeal?</p>
            <br>
            <h4>Reply:</h4>
            <textarea style="width: 100%; min-height: 100px; padding: 10px; border-radius: 5px; background: #1a1a2e; color: white; border: 1px solid #666;" placeholder="Type your response..."></textarea>
            <br><br>
            <button class="btn btn-primary" onclick="sendReply(${id})">Send Reply (as Nexus ${userRole === 'owner' ? 'Owner' : 'Support Team'})</button>
            <button class="btn btn-success" onclick="closeTicket(${id})">Close Ticket</button>
        </div>
    `;
    
    modal.classList.add('active');
}

function openCallReport(caseNum) {
    const modal = document.getElementById('ticketModal');
    const content = document.getElementById('modalContent');
    
    content.innerHTML = `
        <h2>Call Report - Case #${caseNum}</h2>
        <div class="card">
            <p><strong>Reporter:</strong> User456 (111111111)</p>
            <p><strong>Reported:</strong> BadUser789 (222222222)</p>
            <p><strong>Reason:</strong> Harassment and inappropriate language</p>
            <br>
            <h4>Call Log:</h4>
            <div style="background: #1a1a2e; padding: 15px; border-radius: 5px; font-family: monospace;">
                [2026-02-13 15:30:15] User456: Hi!<br>
                [2026-02-13 15:30:20] BadUser789: sup loser<br>
                [2026-02-13 15:30:25] User456: That's not nice...<br>
                [2026-02-13 15:30:30] BadUser789: nobody cares what you think<br>
                [2026-02-13 15:30:35] User456: [REPORTED]
            </div>
            <br>
            <h4>Actions:</h4>
            <button class="btn btn-danger" onclick="banUser(222222222, 7)">Ban 7 Days</button>
            <button class="btn btn-danger" onclick="banUser(222222222, 30)">Ban 30 Days</button>
            <button class="btn btn-danger" onclick="banUser(222222222, -1)">Permanent Ban</button>
            <button class="btn btn-primary" onclick="applyTruthProtocol(222222222)">Apply Truth Protocol</button>
        </div>
    `;
    
    modal.classList.add('active');
}

function closeModal() {
    document.getElementById('ticketModal').classList.remove('active');
}

function sendReply(ticketId) {
    alert(`Reply sent to user as "Nexus ${userRole === 'owner' ? 'Bot Owner' : 'Support Team'}"`);
    closeModal();
}

function closeTicket(ticketId) {
    alert(`Ticket #${ticketId} closed`);
    closeModal();
    loadModmail();
}

function markReviewed(feedbackId) {
    alert(`Feedback #${feedbackId} marked as reviewed`);
    loadFeedback();
}

function acceptAppeal(appealId) {
    alert(`Appeal #${appealId} accepted - User access restored`);
    loadAppeals();
}

function denyAppeal(appealId) {
    const reason = prompt("Enter denial reason:");
    if (reason) {
        alert(`Appeal #${appealId} denied - Reason sent to user`);
        loadAppeals();
    }
}

function banUser(userId, days) {
    const duration = days === -1 ? 'permanent' : `${days} days`;
    if (confirm(`Ban user ${userId} for ${duration}?`)) {
        alert(`User banned for ${duration}`);
        closeModal();
    }
}

function applyTruthProtocol(userId) {
    alert(`Truth Protocol applied to user ${userId}\n\n- Ban reduced by 50%\n- Quest assigned to earn back NEX\n- Protected from theft during quest`);
    closeModal();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Ready
    });
}