import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy, limit, doc, updateDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCnNymkFLnwY-_lFpPWsH9x1VjlJB2GKrk",
  authDomain: "spotsync-fb49e.firebaseapp.com",
  projectId: "spotsync-fb49e",
  storageBucket: "spotsync-fb49e.appspot.com",
  messagingSenderId: "366115063619",
  appId: "1:366115063619:web:a8dff4c728328a6b3a51f6",
  measurementId: "G-Z472S0J19Z"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function capitalizeWords(str) {
  return str.replace(/\b\w/g, c => c.toUpperCase());
}

document.addEventListener("DOMContentLoaded", () => {
  renderRecentBookings();
  setupCSVExport();
  document.addEventListener('click', handleBookingActions);
});

// =======================
// Render recent bookings
// =======================
async function renderRecentBookings() {
  try {
    const bookingsWrapper = document.querySelector('.booking-scroll-wrapper');
    if (!bookingsWrapper) return;

    bookingsWrapper.innerHTML = ''; // Clear previous bookings

    const snapshot = await getDocs(query(
      collection(db, "bookings"),
      orderBy("booking_date", "desc"),
      limit(100)
    ));

    const pendingBookings = [];
    const otherBookings = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      const status = data.status?.toLowerCase() || 'unknown';
      const timeSlot = data.time_slot || data.timeSlot || '—';
      const facilityType = data.facilityType || data.facility_type || '';

      // Only proceed if the facilityType is "Pool Table"
      if (facilityType !== "Pool Table") return;

      const bookingRow = `
        <div class="booking-row" data-doc-id="${doc.id}">
          <div class="student-info">
            <img src="assets/User_Icon.png" alt="${data.user_email || 'User'}" class="student-avatar">
            <div class="student-details">
              <div class="student-name">${data.user_email || '—'}</div>
              <div class="student-id">${data.user_name || '—'}</div>
            </div>
          </div>
          <div class="facility-name-booking">${data.facility_name || data.facilityName || '—'}</div>
          <div class="time-slot">${timeSlot}</div>
          <div>
            <span class="status-badge ${status}">${capitalizeWords(status)}</span>
          </div>
          <div class="action-buttons">
            ${
              status === "pending"
                ? `<button class="action-btn approve" title="Approve">✓</button>
                   <button class="action-btn reject" title="Reject">✗</button>`
                : `<button class="action-btn view" title="View Details">👁</button>`
            }
          </div>
        </div>
      `;

      if (status === 'pending') {
        pendingBookings.push(bookingRow);
      } else {
        otherBookings.push(bookingRow);
      }
    });

    // Insert pending first
    pendingBookings.forEach(row => bookingsWrapper.insertAdjacentHTML('beforeend', row));

    // Then paid and rejected
    otherBookings.forEach(row => bookingsWrapper.insertAdjacentHTML('beforeend', row));

  } catch (error) {
    console.error("❌ Failed to fetch bookings:", error);
    showNotification("Could not load recent bookings", "error");
  }
}


// =======================
// Handle booking actions (approve, reject, view)
// =======================
function handleBookingActions(e) {
  if (!e.target.classList.contains('action-btn')) return;

  const row = e.target.closest('.booking-row');
  if (!row) return;

  const bookingData = extractBookingData(row);
  if (!bookingData) {
    showNotification('Unable to process booking data', 'error');
    return;
  }

  if (e.target.classList.contains('approve')) {
    handleApproveBooking(row, bookingData);
  } else if (e.target.classList.contains('reject')) {
    handleRejectBooking(row, bookingData);
  } else if (e.target.classList.contains('view')) {
    handleViewBooking(bookingData);
  }
}

// =======================
// Extract booking data from the row      
// =======================
function extractBookingData(row) {
  try {
    return {
      studentName: row.querySelector('.student-name')?.textContent?.trim(),
      studentId: row.querySelector('.student-id')?.textContent?.trim(),
      facility: row.querySelector('.facility-name-booking')?.textContent?.trim(),
      timeSlot: row.querySelector('.time-slot')?.textContent?.trim(),
      currentStatus: row.querySelector('.status-badge')?.textContent?.trim()
    };
  } catch (error) {
    console.error('Error extracting booking data:', error);
    return null;
  }
}

// =======================
// Handle booking approval and rejection
// =======================
function handleApproveBooking(row, bookingData) {
  const docId = row.getAttribute("data-doc-id");
  const { studentName, facility, timeSlot } = bookingData;

  if (confirm(`Approve booking for ${studentName}?\nFacility: ${facility}\nTime: ${timeSlot}`)) {
    updateDoc(doc(db, "bookings", docId), { status: "paid" }).then(() => {
      const statusBadge = row.querySelector('.status-badge');
      if (statusBadge) {
        statusBadge.textContent = 'Paid';
        statusBadge.className = 'status-badge paid';
      }

      const actionButtons = row.querySelector('.action-buttons');
      if (actionButtons) {
        actionButtons.innerHTML = '<button class="action-btn view" title="View Details">👁</button>';
      }

      showNotification(`Booking marked as paid for ${studentName}`, 'success');
    }).catch(err => {
      console.error("Error updating to paid:", err);
      showNotification("Failed to approve booking", "error");
    });
  }
}

//  ======================= 
// Handle booking rejection
// =======================
function handleRejectBooking(row, bookingData) {
  const docId = row.getAttribute("data-doc-id");
  const { studentName, facility, timeSlot } = bookingData;

  if (confirm(`Reject booking for ${studentName}?\nFacility: ${facility}\nTime: ${timeSlot}`)) {
    updateDoc(doc(db, "bookings", docId), { status: "rejected" }).then(() => {
      const statusBadge = row.querySelector('.status-badge');
      if (statusBadge) {
        statusBadge.textContent = 'Rejected';
        statusBadge.className = 'status-badge rejected';
      }

      const actionButtons = row.querySelector('.action-buttons');
      if (actionButtons) {
        actionButtons.innerHTML = '<button class="action-btn view" title="View Details">👁</button>';
      }

      showNotification(`Booking rejected for ${studentName}`, 'warning');
    }).catch(err => {
      console.error("Error updating to rejected:", err);
      showNotification("Failed to reject booking", "error");
    });
  }
}

// =======================
// Handle viewing booking details
// =======================
function handleViewBooking(bookingData) {
  const { studentName, studentId, facility, timeSlot, currentStatus } = bookingData;

  const details = `Booking Details:\n\nStudent: ${studentName}\nStudent ID: ${studentId}\nFacility: ${facility}\nTime Slot: ${timeSlot}\nStatus: ${currentStatus}`;
  alert(details);
}

// =======================
// Setup CSV export for recent bookings
// =======================
function setupCSVExport() {
  document.getElementById("exportCSV")?.addEventListener("click", async () => {
    try {
      const snapshot = await getDocs(query(
        collection(db, "bookings"),
        orderBy("bookingDate", "desc"),
        limit(100)
      ));

      const rows = [["User Email", "User ID", "Facility Name", "Time Slot", "Status", "Booking Date"]];
      snapshot.forEach(doc => {
        const data = doc.data();
        rows.push([
          data.userEmail || '',
          data.userId || '',
          data.facilityName || '',
          data.timeSlot || '',
          data.status || '',
          data.bookingDate || ''
        ]);
      });

      const csvContent = rows.map(row => row.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `recent_bookings_${new Date().toISOString().split("T")[0]}.csv`;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("❌ Failed to export CSV:", err);
      showNotification("CSV export failed", "error");
    }
  });
}

// =======================
// Show notification with slide-in and slide-out effect
// =======================
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = 'notification slide-in';
  notification.style.position = 'fixed';
  notification.style.top = '24px';
  notification.style.left = '24px'; // 👈 top-left corner
  notification.style.zIndex = '9999';
  notification.style.padding = '16px 24px';
  notification.style.borderRadius = '12px';
  notification.style.color = '#fff';
  notification.style.fontSize = '15px';
  notification.style.boxShadow = '0 4px 24px rgba(0,0,0,0.1)';
  notification.style.backgroundColor = {
    success: '#48bb78',
    error: '#f56565',
    warning: '#ed8936',
    info: '#4299e1'
  }[type] || '#4299e1';

  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.add('slide-out');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

