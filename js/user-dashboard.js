const FLOORS = [
    { floor: 2, label: 'Floor 2', types: ['Pool Table'] },
    { floor: 3, label: 'Floor 3', types: ['Cubicle'] },
    { floor: 4, label: 'Floor 4', types: ['Study Room'] },
    { floor: 6, label: 'Floor 6', types: ['Discussion Room'] },
];
let selectedFloor = null;
let allFacilities = [];

document.addEventListener('DOMContentLoaded', function() {
    firebase.auth().onAuthStateChanged(function(user) {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }
        // Fill in user info
        document.getElementById('userWelcome').textContent = `Welcome back, ${user.displayName || 'Student'}!`;
        // Fetch Matrix ID from Firestore, fallback to email prefix
        firebase.firestore().collection('users').doc(user.uid).get().then((doc) => {
            if (doc.exists && doc.data().matrixId) {
                document.getElementById('student-id').textContent = `StudentID: ${doc.data().matrixId}`;
            } else {
                document.getElementById('student-id').textContent = `StudentID: ${user.email ? user.email.split('@')[0].toUpperCase() : ''}`;
            }
        }).catch(() => {
            document.getElementById('student-id').textContent = `StudentID: ${user.email ? user.email.split('@')[0].toUpperCase() : ''}`;
        });
        // Optionally set avatar if you have a user photoURL
        if (user.photoURL) {
            document.getElementById('userAvatar').src = user.photoURL;
        }
        // Load bookings and stats
        loadUserStatsAndBookings(user.uid);
        renderSidebar();
        loadFacilities();
    });
});

// Patch: Safe sidebar rendering
function renderSidebar(content) {
  const sidebar = document.getElementById('bookingSidebar');
  if (sidebar) {
    sidebar.innerHTML = content;
  } else {
    console.warn('Sidebar element not found!');
  }
}

function loadFacilities() {
    firebase.firestore().collection("facilities").get()
        .then((querySnapshot) => {
            allFacilities = [];
            querySnapshot.forEach((doc) => {
                allFacilities.push({ id: doc.id, ...doc.data() });
            });
            displayFacilities(allFacilities);
        })
        .catch((error) => {
            console.error("Error fetching facilities: ", error);
        });
}

function displayFacilities(facilities) {
    const listDiv = document.getElementById("facilitiesList");
    if (!listDiv) return;
    listDiv.innerHTML = "";
    let filtered = facilities;
    if (selectedFloor !== null) {
        filtered = facilities.filter(f => f.floor === selectedFloor);
    }
    if (filtered.length === 0) {
        listDiv.innerHTML = '<p>No facilities found for this floor.</p>';
        return;
    }
    filtered.forEach(facility => {
        const item = document.createElement("div");
        item.className = "facility-item";
        item.innerHTML = `
            <strong>${facility.name}</strong> (${facility.type}, Floor ${facility.floor})<br>
            Status: ${facility.status}<br>
            <button onclick="showBookingForm('${facility.id}', '${facility.name}', ${facility.requires_payment})" ${facility.status !== 'available' ? 'disabled' : ''}>
                Book
            </button>
        `;
        listDiv.appendChild(item);
    });
}

function loadUserStatsAndBookings(userId) {
    firebase.firestore().collection("bookings")
        .where("user_id", "==", userId)
        .get()
        .then((querySnapshot) => {
            let active = 0, pending = 0, past = 0, totalSpent = 0;
            const now = new Date();
            const activeBookings = [];
            const recentActivity = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const start = data.start_time && data.start_time.toDate ? data.start_time.toDate() : new Date(data.start_time);
                const end = data.end_time && data.end_time.toDate ? data.end_time.toDate() : new Date(data.end_time);
                // Status logic
                if (data.status === 'active' || (data.status === 'upcoming' && start > now)) {
                    active++;
                    activeBookings.push({ ...data, id: doc.id });
                } else if (data.status === 'pending') {
                    pending++;
                } else if (end < now) {
                    past++;
                }
                // Total spent (example: $5 per booking with payment)
                if (data.payment_receipt_url || data.requires_payment) {
                    totalSpent += 5;
                }
                // Recent activity (show last 5)
                if (recentActivity.length < 5) {
                    let icon = '🟢', color = 'activity-green', title = 'Booking Completed';
                    // Parse and format booking time from time_slot
                    let desc = '';
                    if (data.time_slot) {
                        // Expecting format: 'YYYY-MM-DD HH:MM - HH:MM'
                        const [datePart, ...timeParts] = data.time_slot.split(' ');
                        let dateStr = '';
                        try {
                            const d = new Date(datePart);
                            dateStr = d.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric', weekday: 'short' });
                        } catch {
                            dateStr = datePart;
                        }
                        desc = `${dateStr} • ${timeParts.join(' ')}`;
                    } else {
                        desc = '';
                    }
                    if (data.status === 'pending') {
                        icon = '🟡'; color = 'activity-yellow'; title = 'Booking Request Submitted';
                    } else if (data.status === 'active') {
                        icon = '🔵'; color = 'activity-blue'; title = 'Payment Successful';
                    }
                    recentActivity.push({ icon, color, title, desc });
                }
            });
            // Update stats
            document.getElementById('activeBookingsCount').textContent = active;
            document.getElementById('pendingBookingsCount').textContent = pending;
            document.getElementById('pastBookingsCount').textContent = past;
            document.getElementById('totalSpent').textContent = `RM${totalSpent}`;
            // Render active bookings
            renderActiveBookings(activeBookings);
            // Render recent activity
            renderRecentActivity(recentActivity);
        })
        .catch((error) => {
            console.error("Error fetching user bookings: ", error);
        });
}

function renderActiveBookings(bookings) {
    const listDiv = document.getElementById("activeBookingsList");
    listDiv.innerHTML = '';
    if (!bookings.length) {
        listDiv.innerHTML = '<div style="color:#64748b;">No active bookings.</div>';
        return;
    }
    bookings.forEach(b => {
        let icon = '🎱', color = 'active-booking-icon';
        if (b.facility_id && b.facility_id.toLowerCase().includes('discussion')) icon = '🗣️';
        if (b.facility_id && b.facility_id.toLowerCase().includes('cubicle')) icon = '💼';
        if (b.facility_id && b.facility_id.toLowerCase().includes('study')) icon = '📚';
        let statusClass = 'active-booking-status';
        if (b.status === 'pending') statusClass += ' pending';
        if (b.status === 'cancelled') statusClass += ' cancelled';
        listDiv.innerHTML += `
            <div class="active-booking-card">
                <div class="${color}">${icon}</div>
                <div class="active-booking-info">
                    <div class="active-booking-title">${b.facility_id.replace(/_/g, ' ')}</div>
                    <div class="active-booking-time">${formatBookingTime(b.start_time, b.end_time)}</div>
                </div>
                <div class="${statusClass}">${capitalize(b.status)}</div>
            </div>
        `;
    });
}

function renderRecentActivity(activities) {
    const listDiv = document.getElementById("recentActivityList");
    listDiv.innerHTML = '';
    if (!activities.length) {
        listDiv.innerHTML = '<div style="color:#64748b;">No recent activity.</div>';
        return;
    }
    activities.forEach(a => {
        listDiv.innerHTML += `
            <div class="recent-activity-item">
                <div class="recent-activity-icon ${a.color}">${a.icon}</div>
                <div class="recent-activity-content">
                    <div class="recent-activity-title">${a.title}</div>
                    <div class="recent-activity-desc">${a.desc}</div>
                </div>
            </div>
        `;
    });
}

function formatBookingTime(start, end) {
    const s = start && start.toDate ? start.toDate() : new Date(start);
    const e = end && end.toDate ? end.toDate() : new Date(end);
    const options = { hour: '2-digit', minute: '2-digit' };
    const today = new Date();
    let dayLabel = '';
    if (s.toDateString() === today.toDateString()) dayLabel = 'Today';
    else if (s > today) dayLabel = 'Tomorrow';
    else dayLabel = s.toLocaleDateString();
    return `${dayLabel} • ${s.toLocaleTimeString([], options)} - ${e.toLocaleTimeString([], options)}`;
}

function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Enhanced booking modal logic
function createBookingModal(facilityName, facilityId, requiresPayment) {
    if (document.getElementById('bookingModal')) return; // Only one modal
    const modal = document.createElement('div');
    modal.id = 'bookingModal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(0,0,0,0.35)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '9999';
    modal.innerHTML = `
      <div style="background: #fff; border-radius: 16px; padding: 36px 32px; min-width: 350px; max-width: 95vw; box-shadow: 0 8px 32px rgba(0,0,0,0.18); position: relative; width: 480px;">
        <button id="closeBookingModal" style="position:absolute;top:12px;right:16px;background:none;border:none;font-size:22px;cursor:pointer;">&times;</button>
        <div style="display:flex;align-items:center;justify-content:center;margin-bottom:24px;gap:16px;">
          <div style="display:flex;align-items:center;gap:6px;">
            <div style="width:28px;height:28px;border-radius:50%;background:#3b82f6;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;">1</div>
            <span style="font-weight:600;color:#3b82f6;">Details</span>
          </div>
          <div style="height:2px;width:32px;background:#cbd5e1;"></div>
          <div style="display:flex;align-items:center;gap:6px;">
            <div style="width:28px;height:28px;border-radius:50%;background:#e0e7ef;color:#64748b;display:flex;align-items:center;justify-content:center;font-weight:700;">2</div>
            <span style="font-weight:600;color:#64748b;">Payment</span>
          </div>
          <div style="height:2px;width:32px;background:#cbd5e1;"></div>
          <div style="display:flex;align-items:center;gap:6px;">
            <div style="width:28px;height:28px;border-radius:50%;background:#e0e7ef;color:#64748b;display:flex;align-items:center;justify-content:center;font-weight:700;">3</div>
            <span style="font-weight:600;color:#64748b;">Confirmation</span>
          </div>
        </div>
        <h2 style="margin-bottom: 8px; color: #4f46e5;">${facilityName} Booking</h2>
        <form id="bookingForm">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
            <div>
              <label for="fullName">Full Name</label>
              <input type="text" id="fullName" name="fullName" required placeholder="Enter your full name" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid #e2e8f0;">
            </div>
            <div>
              <label for="studentId">Student ID</label>
              <input type="text" id="studentId" name="studentId" required placeholder="Enter your student ID" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid #e2e8f0;">
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px;align-items:end;">
            <div>
              <label for="startTime">Time Slot</label>
              <input type="time" id="startTime" name="startTime" required style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid #e2e8f0;">
            </div>
            <div>
              <label for="duration">Duration</label>
              <select id="duration" name="duration" required style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid #e2e8f0;">
                <option value="1">1 hour</option>
                <option value="2">2 hours</option>
              </select>
            </div>
            <div>
              <label for="numPlayers">Number of Players</label>
              <select id="numPlayers" name="numPlayers" required style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid #e2e8f0;">
                <option value="1">1 Player</option>
                <option value="2">2 Players</option>
                <option value="3">3 Players</option>
                <option value="4">4 Players</option>
              </select>
            </div>
          </div>
          <div style="margin-bottom:12px;">
            <label>Payment Method</label>
            <div style="display:flex;gap:12px;margin-top:6px;">
              <button type="button" id="qrPaymentBtn" class="btn btn-secondary" style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;">
                <span style="font-size:20px;">💳</span>QR Payment
                <span style="font-size:12px;color:#64748b;">Pay now via QR code</span>
              </button>
              <button type="button" id="deskPaymentBtn" class="btn btn-secondary" style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;">
                <span style="font-size:20px;">🧾</span>Pay at Desk
                <span style="font-size:12px;color:#64748b;">Pay when you arrive</span>
              </button>
            </div>
          </div>
          <div style="margin-bottom:12px;text-align:right;font-size:18px;font-weight:600;color:#4f46e5;">
            Total Amount: <span id="totalAmount">RM5.00</span>
          </div>
          <div id="bookingError" style="color:#e53e3e;margin-bottom:10px;display:none;"></div>
          <div style="display:flex;gap:12px;justify-content:flex-end;">
            <button type="button" class="btn btn-secondary" id="cancelBookingBtn">Cancel</button>
            <button type="submit" class="btn btn-primary">Proceed to Payment</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('closeBookingModal').onclick = () => modal.remove();
    document.getElementById('cancelBookingBtn').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

    // Payment method selection logic
    let selectedPayment = 'qr';
    const qrBtn = document.getElementById('qrPaymentBtn');
    const deskBtn = document.getElementById('deskPaymentBtn');
    qrBtn.classList.add('btn-primary');
    qrBtn.onclick = () => {
        selectedPayment = 'qr';
        qrBtn.classList.add('btn-primary');
        qrBtn.classList.remove('btn-secondary');
        deskBtn.classList.remove('btn-primary');
        deskBtn.classList.add('btn-secondary');
    };
    deskBtn.onclick = () => {
        selectedPayment = 'desk';
        deskBtn.classList.add('btn-primary');
        deskBtn.classList.remove('btn-secondary');
        qrBtn.classList.remove('btn-primary');
        qrBtn.classList.add('btn-secondary');
    };

    // Booking form submission
    const form = document.getElementById('bookingForm');
    const errorDiv = document.getElementById('bookingError');
    form.onsubmit = async function(e) {
        e.preventDefault();
        errorDiv.style.display = 'none';
        const fullName = form.fullName.value.trim();
        const studentId = form.studentId.value.trim();
        const startTime = form.startTime.value;
        const duration = form.duration.value;
        const numPlayers = form.numPlayers.value;
        if (!fullName || !studentId || !startTime || !duration || !numPlayers) {
            errorDiv.textContent = 'Please fill in all fields.';
            errorDiv.style.display = 'block';
            return;
        }
        const user = firebase.auth().currentUser;
        if (!user) {
            errorDiv.textContent = 'You must be logged in to book.';
            errorDiv.style.display = 'block';
            return;
        }
        // Calculate start and end time
        const startDate = new Date();
        const [hours, minutes] = startTime.split(":");
        startDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        const endDate = new Date(startDate.getTime() + parseInt(duration) * 60 * 60 * 1000);
        
        // --- Reservation limit check ---
        try {
            // Query for user's bookings that overlap with the requested time
            const bookingsSnapshot = await firebase.firestore().collection("bookings")
                .where("user_id", "==", user.uid)
                .get();
            let conflict = false;
            bookingsSnapshot.forEach(doc => {
                const data = doc.data();
                // Only check for active, upcoming, or processing bookings
                if (["active", "upcoming", "processing", "paid", "pending"].includes((data.status||"").toLowerCase())) {
                    const existingStart = data.start_time && data.start_time.toDate ? data.start_time.toDate() : new Date(data.start_time);
                    const existingEnd = data.end_time && data.end_time.toDate ? data.end_time.toDate() : new Date(data.end_time);
                    // Check for overlap in the same hour
                    if ((startDate < existingEnd) && (endDate > existingStart)) {
                        conflict = true;
                    }
                }
            });
            if (conflict) {
                errorDiv.textContent = 'You already have a booking that overlaps with this time slot. Please choose a different time.';
                errorDiv.style.display = 'block';
                return;
            }
        } catch (err) {
            errorDiv.textContent = 'Error checking your existing bookings. Please try again.';
            errorDiv.style.display = 'block';
            return;
        }
        // --- End reservation limit check ---
        createBooking(user.uid, facilityId, startDate.toISOString(), endDate.toISOString(), requiresPayment);
        setTimeout(() => loadUserBookings(user.uid), 1000);
        document.getElementById('bookingModal').remove();
    };
}

window.showBookingForm = function(facilityId, facilityName, requiresPayment) {
    createBookingModal(facilityName, facilityId, requiresPayment);
};

// === Notification System ===

function getNotifications() {
    return JSON.parse(localStorage.getItem('userNotifications') || '[]');
}
function saveNotifications(notifs) {
    localStorage.setItem('userNotifications', JSON.stringify(notifs));
}
function addNotification(notification) {
    const notifs = getNotifications();
    notifs.unshift(notification); // newest first
    saveNotifications(notifs);
    updateNotificationBadge();
}
function markAllNotificationsRead() {
    const notifs = getNotifications().map(n => ({...n, read: true}));
    saveNotifications(notifs);
    updateNotificationBadge();
}
function clearAllNotifications() {
    saveNotifications([]);
    updateNotificationBadge();
    renderNotificationDropdown();
}
function updateNotificationBadge() {
    const notifs = getNotifications();
    const unread = notifs.filter(n => !n.read).length;
    const badge = document.getElementById('notificationBadge');
    if (badge) {
        if (unread > 0) {
            badge.style.display = 'block';
            badge.textContent = unread;
        } else {
            badge.style.display = 'none';
        }
    }
}
function renderNotificationDropdown() {
    const notifs = getNotifications();
    const list = document.getElementById('notificationList');
    if (!list) return;
    if (notifs.length === 0) {
        list.innerHTML = '<div style="padding:16px;color:#64748b;text-align:center;">No notifications.</div>';
        return;
    }
    list.innerHTML = '';
    notifs.forEach(n => {
        list.innerHTML += `<div style="padding:12px 16px;border-bottom:1px solid #f1f5f9;${n.read ? '' : 'background:#f1f5f9;'}">
            <div style="font-weight:600;font-size:15px;">${n.title}</div>
            <div style="font-size:13px;color:#64748b;">${n.message}</div>
            <div style="font-size:12px;color:#94a3b8;margin-top:2px;">${new Date(n.time).toLocaleString()}</div>
        </div>`;
    });
}
// Toggle dropdown
const notifBtn = document.getElementById('notificationsBtn');
const notifDropdown = document.getElementById('notificationDropdown');
if (notifBtn && notifDropdown) {
    notifBtn.onclick = function(e) {
        notifDropdown.style.display = notifDropdown.style.display === 'none' ? 'block' : 'none';
        if (notifDropdown.style.display === 'block') {
            markAllNotificationsRead();
            renderNotificationDropdown();
        }
        updateNotificationBadge();
        e.stopPropagation();
    };
    document.body.addEventListener('click', function() {
        notifDropdown.style.display = 'none';
    });
    notifDropdown.onclick = function(e) { e.stopPropagation(); };
    const clearBtn = document.getElementById('clearNotificationsBtn');
    if (clearBtn) clearBtn.onclick = clearAllNotifications;
}
updateNotificationBadge();
renderNotificationDropdown();
// --- Add confirmation notification after booking ---
const origCreateBooking = window.createBooking;
window.createBooking = function(...args) {
    origCreateBooking.apply(this, args);
    // Add notification
    addNotification({
        title: 'Booking Confirmed',
        message: 'Your booking was successful. Check Active Bookings for details.',
        time: Date.now(),
        read: false
    });
};
// --- Remove confirmation notification from booking creation ---
// (Restore original createBooking)
if (window.origCreateBooking) {
    window.createBooking = window.origCreateBooking;
}
// --- Add confirmed booking notifications on dashboard load ---
function checkConfirmedBookingNotifications() {
    const user = firebase.auth().currentUser;
    if (!user) return;
    firebase.firestore().collection('bookings')
        .where('user_id', '==', user.uid)
        .get()
        .then(snapshot => {
            const now = new Date();
            snapshot.forEach(doc => {
                const data = doc.data();
                const status = (data.status||"").toLowerCase();
                const start = data.start_time && data.start_time.toDate ? data.start_time.toDate() : new Date(data.start_time);
                // Only notify for confirmed, future bookings
                if (["paid", "active", "upcoming"].includes(status) && start > now) {
                    const notifs = getNotifications();
                    const already = notifs.some(n => n.title === 'Booking Confirmed' && n.message.includes(doc.id));
                    if (!already) {
                        addNotification({
                            title: 'Booking Confirmed',
                            message: `Your booking for ${data.facility_id || 'a facility'} at ${start.toLocaleString()} is confirmed. [Ref: ${doc.id}]`,
                            time: Date.now(),
                            read: false
                        });
                    }
                }
            });
        });
}
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(checkConfirmedBookingNotifications, 1500); // check after login
    setTimeout(checkUpcomingBookingReminders, 2000); // keep reminders
});
// --- Reminder notifications for upcoming bookings ---
function checkUpcomingBookingReminders() {
    const user = firebase.auth().currentUser;
    if (!user) return;
    firebase.firestore().collection('bookings')
        .where('user_id', '==', user.uid)
        .get()
        .then(snapshot => {
            const now = new Date();
            snapshot.forEach(doc => {
                const data = doc.data();
                if (["active", "upcoming", "processing", "paid", "pending"].includes((data.status||"").toLowerCase())) {
                    const start = data.start_time && data.start_time.toDate ? data.start_time.toDate() : new Date(data.start_time);
                    const diff = (start - now) / 60000; // minutes
                    if (diff > 0 && diff <= 10) { // within next 10 minutes
                        // Check if already notified
                        const notifs = getNotifications();
                        const already = notifs.some(n => n.title === 'Booking Reminder' && n.message.includes(start.toLocaleString()));
                        if (!already) {
                            addNotification({
                                title: 'Booking Reminder',
                                message: `You have a booking at ${start.toLocaleString()}.`,
                                time: Date.now(),
                                read: false
                            });
                        }
                    }
                }
            });
        });
}

// Patch: Global logout function
function logout() {
  if (window.firebase && firebase.auth) {
    firebase.auth().signOut().then(() => {
      window.location.href = 'index.html';
    });
  } else {
    window.location.href = 'index.html';
  }
}
window.logout = logout; 