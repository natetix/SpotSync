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
    const bookingsWrapper = document.querySelector('.booking-scroll-wrapper');  // Select the wrapper for bookings
    if (!bookingsWrapper) return;

    bookingsWrapper.innerHTML = ''; // Clear previous bookings

    const snapshot = await getDocs(query( // Fetch the most recent 100 bookings from Firestore
      collection(db, "bookings"),
      orderBy("bookingDate", "desc"),
      limit(100)
    ));

    const topBookings = []; // Array to hold pending or processing bookings
    const bottomBookings = [];    // Array to hold final bookings (approved, rejected, paid)

    snapshot.forEach(doc => { // Process each booking document
      const data = doc.data();  // Extract booking data
      const status = data.status?.toLowerCase() || 'unknown'; // Normalize status to lowercase
      const isPending = ['pending', 'processing'].includes(status); // Check if the booking is pending or processing
      const isFinal = ['approved', 'rejected', 'paid'].includes(status);  // Check if the booking is final

      const bookingRow = `  
        <div class="booking-row" data-doc-id="${doc.id}">
          <div class="student-info">
            <img src="https://via.placeholder.com/100" alt="${data.userEmail}" class="student-avatar">
            <div class="student-details">
              <div class="student-name">${data.userEmail}</div>
              <div class="student-id">${data.userId}</div>
            </div>
          </div>
          <div class="facility-name-booking">${data.facilityName || '—'}</div>
          <div class="time-slot">${data.timeSlot || '—'}</div>
          <div>
            <span class="status-badge ${status}">${capitalizeWords(status)}</span>
          </div>
          <div class="action-buttons">
            ${isPending ? `
              <button class="action-btn approve" title="Approve">✓</button>
              <button class="action-btn reject" title="Reject">✗</button>
            ` : `
              <button class="action-btn view" title="View Details">👁</button>
            `}
          </div>
        </div>
      `;

      if (isPending) {  // check if the booking is pending or processing, add to top bookings
        topBookings.push(bookingRow);
      } else {
        bottomBookings.push(bookingRow);
      }
    });

    [...topBookings, ...bottomBookings].forEach(row => {  // Combine top and bottom bookings
      bookingsWrapper.insertAdjacentHTML('beforeend', row); // Append each booking row to the wrapper
    });

  } catch (error) {
    console.error("❌ Failed to fetch bookings:", error); // Log error if fetching bookings fails
    showNotification("Could not load recent bookings", "error");  // Show error notification if fetching fails
  }
}

// =======================
// Handle booking actions (approve, reject, view)
// =======================
function handleBookingActions(e) {  // Handle click events on booking action buttons
  if (!e.target.classList.contains('action-btn')) return; // Only handle clicks on action buttons

  const row = e.target.closest('.booking-row'); // Find the closest booking row
  if (!row) return; // If no row is found, exit

  const bookingData = extractBookingData(row);  // Extract booking data from the row
  if (!bookingData) {
    showNotification('Unable to process booking data', 'error');  // Show error if booking data is not found
    return; // Exit if booking data is invalid
  }

  if (e.target.classList.contains('approve')) { // Handle approve button click
    handleApproveBooking(row, bookingData);
  } else if (e.target.classList.contains('reject')) { // Handle reject button click
    handleRejectBooking(row, bookingData);
  } else if (e.target.classList.contains('view')) { // Handle view button click
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
function handleApproveBooking(row, bookingData) { // Handle booking approval
  const docId = row.getAttribute("data-doc-id");  // Get the document ID from the row
  const { studentName, facility, timeSlot } = bookingData;

  if (confirm(`Approve booking for ${studentName}?\nFacility: ${facility}\nTime: ${timeSlot}`)) { // Confirm approval
    updateDoc(doc(db, "bookings", docId), { status: "paid" }).then(() => {  // Update booking status to paid in Firestore
      const statusBadge = row.querySelector('.status-badge'); // Find the status badge element in the row
      if (statusBadge) {  // If the status badge exists, update its text and class
        statusBadge.textContent = 'Paid';
        statusBadge.className = 'status-badge paid';
      }

      const actionButtons = row.querySelector('.action-buttons'); // Find the action buttons container
      if (actionButtons) {
        actionButtons.innerHTML = '<button class="action-btn view" title="View Details">👁</button>';
      }

      showNotification(`Booking marked as paid for ${studentName}`, 'success'); // Show success notification
    }).catch(err => { // Handle any errors during the update
      console.error("Error updating to paid:", err);
      showNotification("Failed to approve booking", "error"); // Show error notification
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
  document.getElementById("exportCSV")?.addEventListener("click", async () => {   // Add click event listener to the export button
    try { // Fetch the most recent 100 bookings from Firestore
      const snapshot = await getDocs(query( // Fetch bookings collection
        collection(db, "bookings"),
        orderBy("bookingDate", "desc"),
        limit(100)
      ));

      const rows = [["User Email", "User ID", "Facility Name", "Time Slot", "Status", "Booking Date"]]; // Initialize CSV rows with headers
      snapshot.forEach(doc => { // Iterate through each booking document
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

      const csvContent = rows.map(row => row.join(",")).join("\n"); // Convert rows to CSV format
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" }); // Create a Blob from the CSV content
      const link = document.createElement("a"); // Create an anchor element for download
      link.href = URL.createObjectURL(blob);  // Create a URL for the Blob
      link.download = `recent_bookings_${new Date().toISOString().split("T")[0]}.csv`;    // Set the file name for download
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

