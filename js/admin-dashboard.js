/**
 * SpotSync Admin Dashboard JavaScript
 * Enhanced version with improved functionality and error handling
 *  The  //UPDATE TODAY'S REVENUE FROM PAID BOOKINGS  (have not changed by the day yet so far is just total paid bookings * RM5) 
 */

// =================================
// GLOBAL STATE MANAGEMENT
// =================================

const DashboardState = {
    activeSessions: 12,
    pendingRequests: 8,
    todayRevenue: 245,
    totalFacilities: 15,
    realTimeUpdateInterval: null,
    revenueUpdateInterval: null,
    bookingsUpdateInterval: null,
    notifications: []
};

// =================================
// INITIALIZATION
// =================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('SpotSync Admin Dashboard loaded');
    initializeEventListeners();
    initializeDashboard();
    startRealTimeUpdates();
    showNotification('Dashboard loaded successfully!', 'success');
    loadFacilities();
    /*Jerel added */
    updatePendingRequestsFromBookings();
    updateTodayRevenueFromPaidBookings();
    /*Jerel added */
});

function initializeDashboard() {
    // Initialize any dynamic content or data fetching
    updateDashboardStats();
    validateDashboardElements();
}

function validateDashboardElements() {
    const requiredElements = [
        '.stats-grid',
        '.bookings-section',
        '.status-grid'
    ];
    
    requiredElements.forEach(selector => {
        if (!document.querySelector(selector)) {
            console.warn(`Missing dashboard element: ${selector}`);
        }
    });
}

// =================================
// EVENT LISTENERS
// =================================

function initializeEventListeners() {
    // Handle booking actions (approve, reject, view)
    document.addEventListener('click', handleBookingActions);
    
    // Handle settings button
    const settingsBtn = document.querySelector('.btn-secondary');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', handleSettings);
    }
    
    // Handle export button (already has onclick in HTML)
    
    // Handle keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Handle window resize for responsive updates
    window.addEventListener('resize', handleWindowResize);
}

function handleKeyboardShortcuts(e) {
    // Ctrl/Cmd + E for export
    if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        exportData();
    }
    
    // Ctrl/Cmd + R for refresh (override default)
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        refreshDashboard();
    }
}

function handleWindowResize() {
    // Adjust layout if needed on resize
    clearTimeout(window.resizeTimeout);
    window.resizeTimeout = setTimeout(() => {
        console.log('Window resized, adjusting layout...');
        // Add any responsive adjustments here
    }, 250);
}

function handleSettings() {
    showNotification('Settings panel would open here', 'info');
    // In a real app, this would open a settings modal
    console.log('Settings clicked');
}

// =================================
// DATA EXPORT FUNCTIONALITY
// =================================
// jerel changed
function exportData() {
    try {
        const btn = document.querySelector('.btn-primary');
        showExportLoading(btn);

        const metadata = {
            exportedAt: new Date().toISOString(),
            exportedBy: 'Admin Dashboard',
            version: '1.0.0'
        };

        const statistics = {
            activeSessions: getDashboardStat(1),
            pendingRequests: getDashboardStat(2),
            todayRevenue: getDashboardStat(3),
            totalFacilities: getDashboardStat(4)
        };

        const facilityStatus = getFacilityStatusData(); // assumed to return an array of facility objects
        const recentBookings = getBookingsData(); // assumed to return an array of booking objects

        const systemInfo = {
            userAgent: navigator.userAgent,
            timestamp: Date.now(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };

        // CSV rows
        const csvSections = [];

        // 1. Metadata
        csvSections.push(["Metadata"]);
        Object.entries(metadata).forEach(([key, val]) => {
            csvSections.push([key, val]);
        });
        csvSections.push([""]); // Empty row

        // 2. Statistics
        csvSections.push(["Statistics"]);
        Object.entries(statistics).forEach(([key, val]) => {
            csvSections.push([key, val]);
        });
        csvSections.push([""]);

        // 3. Facility Status
        if (facilityStatus.length) {
            csvSections.push(["Facility Status"]);
            const headers = Object.keys(facilityStatus[0]);
            csvSections.push(headers);
            facilityStatus.forEach(obj => {
                csvSections.push(headers.map(h => obj[h]));
            });
            csvSections.push([""]);
        }

        // 4. System Info
        csvSections.push(["System Info"]);
        Object.entries(systemInfo).forEach(([key, val]) => {
            csvSections.push([key, val]);
        });

        // 5. Revenue Chart (if available)
        const revenueChart = Chart.getChart("revenueChart");
        if (revenueChart) {
            csvSections.push(["Revenue (RM) Over Time"]);
            csvSections.push(["Date", "Revenue"]);
            revenueChart.data.labels.forEach((label, index) => {
                csvSections.push([label, revenueChart.data.datasets[0].data[index]]);
            });
            csvSections.push([""]);
        }

        // 6. Payment Summary Chart
        const paymentChart = Chart.getChart("paymentChart");
        if (paymentChart) {
            csvSections.push(["Payment Summary"]);
            csvSections.push(["Type", "Count"]);
            paymentChart.data.labels.forEach((label, index) => {
                csvSections.push([label, paymentChart.data.datasets[0].data[index]]);
            });
            csvSections.push([""]);
        }

        // 7. Bookings by Weekday Chart
        const weekdayChart = Chart.getChart("weekdayChart");
        if (weekdayChart) {
            csvSections.push(["Bookings by Weekday"]);
            csvSections.push(["Weekday", "Count"]);
            weekdayChart.data.labels.forEach((label, index) => {
                csvSections.push([label, weekdayChart.data.datasets[0].data[index]]);
            });
            csvSections.push([""]);
        }


        // Convert to CSV
        const csvContent = csvSections.map(row =>
            row.map(value => `"${(value ?? "").toString().replace(/"/g, '""')}"`).join(",")
        ).join("\n");

        // Create Blob & download
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const fileName = `spotsync-dashboard-${metadata.exportedAt.split("T")[0]}.csv`;

        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showExportSuccess(btn);
        console.log('CSV export success:', fileName);

    } catch (error) {
        console.error("CSV export failed:", error);
        showNotification("Export failed. Please try again.", "error");
        resetExportButton();
    }
}
// jerel changed

function getDashboardStat(index) {
    const statElement = document.querySelector(`.stats-grid .stat-card:nth-child(${index}) .stat-value`);
    if (!statElement) return 0;
    
    const text = statElement.textContent.trim();
    // Handle different formats (numbers, currency, etc.)
    return text.includes('$') ? parseFloat(text.replace('$', '')) : parseInt(text) || 0;
}

function validateExportData(data) {
    return data && 
           data.statistics && 
           data.facilityStatus && 
           data.recentBookings && 
           Array.isArray(data.facilityStatus) && 
           Array.isArray(data.recentBookings);
}

function showExportLoading(btn) {
    if (!btn) return;
    btn.disabled = true;
    btn.innerHTML = '⏳ Exporting...';
    btn.style.backgroundColor = '#a0aec0';
}

function showExportSuccess(btn) {
    if (!btn) return;
    btn.innerHTML = '✅ Exported!';
    btn.style.backgroundColor = '#48bb78';
    btn.disabled = false;
    
    setTimeout(() => {
        resetExportButton(btn);
    }, 2000);
}

function resetExportButton(btn) {
    if (!btn) btn = document.querySelector('.btn-primary');
    if (!btn) return;
    
    btn.innerHTML = '📊 Export Data';
    btn.style.backgroundColor = '#4299e1';
    btn.disabled = false;
}

// =================================
// BOOKING MANAGEMENT
// =================================

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

function handleApproveBooking(row, bookingData) {
  const { studentName, facility, timeSlot } = bookingData;
  const docId = row.getAttribute("data-doc-id");

  const confirmMessage = `Approve booking for ${studentName}?\n\nFacility: ${facility}\nTime: ${timeSlot}`;

  if (confirm(confirmMessage)) {
    // Update Firestore
    firebase.firestore().collection("bookings").doc(docId).update({
      status: "paid"
    }).then(() => {
      const statusBadge = row.querySelector('.status-badge');
      if (statusBadge) {
        statusBadge.textContent = 'Paid';
        statusBadge.className = 'status-badge paid';
      }

      const actionButtons = row.querySelector('.action-buttons');
      if (actionButtons) {
        actionButtons.innerHTML = '<button class="action-btn view" title="View Details">👁</button>';
      }

      updatePendingRequestsFromBookings();
      showNotification(`Booking marked as paid for ${studentName}`, 'success');
      animateRowUpdate(row, 'approved');
      logBookingAction('paid', bookingData);

    }).catch(error => {
      console.error("❌ Failed to update booking to paid:", error);
      showNotification("Failed to approve booking", "error");
    });
  }
}


function handleRejectBooking(row, bookingData) {
  const { studentName, facility, timeSlot } = bookingData;
  const docId = row.getAttribute("data-doc-id");

  const confirmMessage = `Reject booking for ${studentName}?\n\nFacility: ${facility}\nTime: ${timeSlot}\n\nThis action cannot be undone.`;

  if (confirm(confirmMessage)) {
    // Update Firestore
    firebase.firestore().collection("bookings").doc(docId).update({
      status: "rejected"
    }).then(() => {
      // Animate removal
      row.style.transition = 'all 0.5s ease-out';
      row.style.opacity = '0.3';
      row.style.transform = 'translateX(-20px)';
      setTimeout(() => row.remove(), 500);

      updatePendingRequestsFromBookings();
      showNotification(`Booking rejected for ${studentName}`, 'warning');
      logBookingAction('rejected', bookingData);

    }).catch(error => {
      console.error("❌ Failed to reject booking:", error);
      showNotification("Failed to reject booking", "error");
    });
  }
}


function handleViewBooking(bookingData) {
    const { studentName, studentId, facility, timeSlot, currentStatus } = bookingData;
    
    // Create a more detailed view (in a real app, this would be a modal)
    const details = `Booking Details:
    
Student: ${studentName}
Student ID: ${studentId}
Facility: ${facility}
Time Slot: ${timeSlot}
Status: ${currentStatus}
Booking ID: BK-${Date.now().toString().slice(-6)}

(In a real application, this would open a detailed modal with more information and actions)`;
    
    alert(details);
    
    // Log the action
    logBookingAction('viewed', bookingData);
}

function animateRowUpdate(row, type) {
    const originalBg = row.style.backgroundColor;
    const color = type === 'approved' ? '#c6f6d5' : '#fed7d7';
    
    row.style.backgroundColor = color;
    row.style.transition = 'background-color 0.3s ease';
    
    setTimeout(() => {
        row.style.backgroundColor = originalBg;
    }, 1000);
}

function logBookingAction(action, bookingData) {
    const logEntry = {
        action,
        bookingData,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
    };
    
    console.log('Booking action logged:', logEntry);
    
    // In a real app, this would send to a logging service
}

// =================================
// STATISTICS UPDATES
// =================================

function updatePendingRequests(change) {
    const pendingElement = document.querySelector('.stats-grid .stat-card:nth-child(2) .stat-value');
    if (!pendingElement) {
        console.warn('Pending requests element not found');
        return;
    }
    
    const currentValue = parseInt(pendingElement.textContent) || 0;
    const newValue = Math.max(0, currentValue + change);
    
    // Update the state
    DashboardState.pendingRequests = newValue;
    
    // Update the display
    pendingElement.textContent = newValue;
    
    // Animate the change
    animateStatChange(pendingElement);
    
    console.log(`Pending requests updated: ${currentValue} → ${newValue}`);
}

function animateStatChange(element) {
    if (!element) return;
    
    element.style.transform = 'scale(1.1)';
    element.style.color = '#48bb78';
    element.style.transition = 'all 0.3s ease';
    
    setTimeout(() => {
        element.style.transform = 'scale(1)';
        element.style.color = '#1a202c';
    }, 300);
}

/*Jerel chanegd */
function updateStatsInFirebase(updatedFields) {
    const statsRef = firebase.firestore().collection("dashboardStats").doc("Stats");

    statsRef.update(updatedFields)
        .then(() => {
            console.log("Dashboard stats updated in Firestore:", updatedFields);
        })
        .catch((error) => {
            console.error("Error updating stats in Firestore:", error);
        });
}
// =================================
// DASHBOARD STATS UPDATES  
// =================================
function updateDashboardStats() {
    const statsRef = firebase.firestore().collection("dashboardStats").doc("Stats");

    statsRef.get().then((doc) => {
        if (doc.exists) {
            const data = doc.data();

            const active = data.activeSessions ?? "--";
            const pending = data.pendingRequests ?? "--";
            const revenue = data.todayRevenue ?? "--";
            const total = data.totalFacilities ?? "--";

            document.getElementById("activeSessionsValue").textContent = active;
            document.getElementById("pendingRequestsValue").textContent = pending;
            document.getElementById("todayRevenueValue").textContent = `RM${revenue}`;
            document.getElementById("totalFacilitiesCount").textContent = total;

            // Update state too (optional)
            DashboardState.activeSessions = active;
            DashboardState.pendingRequests = pending;
            DashboardState.todayRevenue = revenue;
            DashboardState.totalFacilities = total;

            console.log("Dashboard stats updated from Firebase");
        } else {
            console.warn("No Stats document found in dashboardStats collection");
        }
    }).catch((error) => {
        console.error("Error fetching dashboard stats:", error);
        showNotification("Failed to load dashboard stats", "error");
    });
}
// =================================
// Fetch and update dashboard stats from Firestore
// =================================
function fetchAndUpdateDashboardStats() {
  const statsRef = firebase.firestore().collection("dashboardStats").doc("Stats");
  const facilitiesRef = firebase.firestore().collection("facilities");
  const bookingsRef = firebase.firestore().collection("bookings");

  Promise.all([facilitiesRef.get(), bookingsRef.get(), statsRef.get()]).then(([facSnap, bookSnap, statsDoc]) => {
    let activeSessions = 0;
    let pendingRequests = 0;
    let totalFacilities = facSnap.size;

    let totalRevenue = 0;

    facSnap.forEach(doc => {
      const fac = doc.data();
      const status = fac.status?.toLowerCase().replace(/[-_\s]/g, "");
      if (status === "inuse") activeSessions++;
    });

    bookSnap.forEach(doc => {
      const booking = doc.data();
      const status = booking.status?.toLowerCase();
      const requiresPayment = booking.requires_payment;
      const facilityType = booking.facilityType?.toLowerCase();

      if (status === "paid" && facilityType === "Pool Table") {
        totalRevenue += 5;
      }

      if (status === "pending" && requiresPayment === true && facilityType === "Pool Table") {
        pendingRequests++;
      }
    });

    statsRef.update({
      activeSessions,
      pendingRequests,
      todayRevenue: totalRevenue,
      totalFacilities
    });

    document.getElementById("activeSessionsValue").textContent = activeSessions;
    document.getElementById("pendingRequestsValue").textContent = pendingRequests;
    document.getElementById("todayRevenueValue").textContent = `RM${totalRevenue}`;
    document.getElementById("totalFacilitiesCount").textContent = totalFacilities;

    DashboardState.todayRevenue = totalRevenue;

    console.log("✅ Dashboard stats updated: Revenue = RM${totalRevenue}");
  }).catch(error => {
    console.error("❌ Error updating dashboard stats:", error);
  });
}

/*Jerel chanegd */



// function updateDashboardStats() {
//     // Update all stats from current state
//     const stats = [
//         DashboardState.activeSessions,
//         DashboardState.pendingRequests,
//         `$${DashboardState.todayRevenue}`,
//         DashboardState.totalFacilities
//     ];
    
//     stats.forEach((value, index) => {
//         const element = document.querySelector(`.stats-grid .stat-card:nth-child(${index + 1}) .stat-value`);
//         if (element) {
//             element.textContent = value;
//         }
//     });
// }

// =================================
// NOTIFICATIONS SYSTEM
// =================================

function showNotification(message, type = 'info', duration = 3000) {
    // Remove existing notifications of the same type to prevent spam
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => {
        if (notification.textContent === message) {
            notification.remove();
        }
    });
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification slide-in';
    notification.style.backgroundColor = getNotificationColor(type);
    notification.textContent = message;
    
    // Add close button for longer notifications
    if (duration > 3000) {
        const closeBtn = document.createElement('span');
        closeBtn.innerHTML = ' ×';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.marginLeft = '10px';
        closeBtn.onclick = () => removeNotification(notification);
        notification.appendChild(closeBtn);
    }
    
    // Add to DOM
    document.body.appendChild(notification);
    
    // Store in state
    DashboardState.notifications.push({
        message,
        type,
        timestamp: Date.now()
    });
    
    // Auto-remove after duration
    setTimeout(() => {
        removeNotification(notification);
    }, duration);
    
    console.log(`Notification: ${type.toUpperCase()} - ${message}`);
}

function removeNotification(notification) {
    if (!notification || !notification.parentNode) return;
    
    notification.className = 'notification slide-out';
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 300);
}

function getNotificationColor(type) {
    const colors = {
        success: '#48bb78',
        error: '#f56565',
        warning: '#ed8936',
        info: '#4299e1'
    };
    return colors[type] || colors.info;
}

// =================================
// DATA COLLECTION HELPERS
// =================================

function getFacilityStatusData() {
    const facilities = [];
    
    try {
        // Collect data from both pool tables and discussion rooms
        document.querySelectorAll('.status-section').forEach(section => {
            const sectionTitle = section.querySelector('h3')?.textContent?.trim();
            const type = sectionTitle?.toLowerCase().includes('pool') ? 'pool_table' : 'discussion_room';
            
            section.querySelectorAll('.status-item').forEach(item => {
                const name = item.querySelector('.facility-name')?.textContent?.trim();
                const status = item.querySelector('.facility-status')?.textContent?.trim();
                
                if (name && status) {
                    facilities.push({ 
                        name, 
                        status, 
                        type,
                        section: sectionTitle 
                    });
                }
            });
        });
    } catch (error) {
        console.error('Error collecting facility status data:', error);
    }
    
    return facilities;
}

function getBookingsData() {
    const bookings = [];
    
    try {
        document.querySelectorAll('.booking-row').forEach(row => {
            const bookingData = extractBookingData(row);
            if (bookingData && bookingData.studentName) {
                bookings.push({
                    ...bookingData,
                    extractedAt: new Date().toISOString()
                });
            }
        });
    } catch (error) {
        console.error('Error collecting bookings data:', error);
    }
    
    return bookings;
}

// =================================
// REAL-TIME UPDATES
// =================================

function startRealTimeUpdates() {
    // Clear any existing interval
    if (DashboardState.realTimeUpdateInterval) {
        clearInterval(DashboardState.realTimeUpdateInterval);
    }
    
    // Start new interval for simulated real-time updates
    DashboardState.realTimeUpdateInterval = setInterval(() => {
        simulateRealTimeUpdates();
    }, 20000); // Update every 20 seconds
    
    console.log('Real-time updates started');
}

function simulateRealTimeUpdates() {
    // Simulate random changes in active sessions
    const change = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
    if (change !== 0) {
        const currentSessions = getDashboardStat(1);
        const newSessions = Math.max(0, currentSessions + change);
        
        const sessionsElement = document.querySelector('.stats-grid .stat-card:nth-child(1) .stat-value');
        if (sessionsElement) {
            sessionsElement.textContent = newSessions;
            animateStatChange(sessionsElement);
            DashboardState.activeSessions = newSessions;
        }
    }
    
    console.log('Real-time update simulated');
}

function refreshDashboard() {
    showNotification('Refreshing dashboard...', 'info');
    
    // Simulate refresh delay
    setTimeout(() => {
        updateDashboardStats();
        showNotification('Dashboard refreshed!', 'success');
    }, 1000);
}

// =================================
// UTILITY FUNCTIONS
// =================================

function stopRealTimeUpdates() {
    if (DashboardState.realTimeUpdateInterval) {
        clearInterval(DashboardState.realTimeUpdateInterval);
        DashboardState.realTimeUpdateInterval = null;
        console.log('Real-time updates stopped');
    }
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    stopRealTimeUpdates();
});

// =================================
// ERROR HANDLING
// =================================

window.addEventListener('error', (event) => {
    console.error('Dashboard error:', event.error);
    showNotification('An error occurred. Check console for details.', 'error');
});

// Expose some functions globally for debugging
window.DashboardDebug = {
    state: DashboardState,
    refreshDashboard,
    showNotification,
    exportData
};

// === FACILITY LOADING AND BOOKING ===

async function loadFacilities() {
  try {
    console.log('Loading facilities from Firebase...');
    const now = new Date();
    const pad = n => n.toString().padStart(2, '0');
    const currentDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const currentHour = now.getHours();
    const slotStart = `${pad(currentHour)}:00`;
    const slotEnd = `${pad(currentHour + 1)}:00`;
    const currentTimeSlot = `${slotStart} - ${slotEnd}`;

    // Fetch all facilities
    const querySnapshot = await firebase.firestore().collection("facilities").get();
    const facilities = [];
    let totalCount = 0;
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      facilities.push({ 
        id: doc.id, 
        name: data.name,
        type: data.type,
        floor: data.floor,
        status: data.status,
        requires_payment: data.requires_payment
      });
      totalCount++;
    });

    // Fetch bookings for the current date and time slot
    const bookingsSnapshot = await firebase.firestore().collection("bookings")
      .where("time_slot", ">=", `${currentDate} 00:00 - 01:00`)
      .where("time_slot", "<=", `${currentDate} 23:00 - 24:00`)
      .get();
    const bookings = [];
    bookingsSnapshot.forEach(doc => bookings.push(doc.data()));

    // Update facility status based on bookings for the current slot
    facilities.forEach(fac => {
      // Find a booking for this facility in the current slot
      const booking = bookings.find(b => b.facility_id === fac.id && b.time_slot && b.time_slot.startsWith(currentDate) && b.time_slot.includes(currentTimeSlot));
      if (booking) {
        if (booking.status === 'paid') {
          // If current time is within slot, mark as in use
          const [startStr, endStr] = currentTimeSlot.split(' - ');
          const start = parseInt(startStr.split(':')[0], 10);
          const end = parseInt(endStr.split(':')[0], 10);
          if (now.getHours() >= start && now.getHours() < end) {
            fac.status = 'in use';
          } else {
            fac.status = 'reserved';
          }
        } else if (booking.status === 'pending') {
          fac.status = 'reserved';
        } else {
          fac.status = 'available';
        }
      } else {
        fac.status = 'available';
      }
    });

    // Update total facilities count
    const totalFacilitiesElement = document.getElementById('totalFacilitiesCount');
    if (totalFacilitiesElement) {
      totalFacilitiesElement.textContent = totalCount;
    }

    displayFacilities(facilities);
    updateStatsFromFacilities(facilities);
    renderRecentBookings();

  } catch (error) {
    console.error("Error fetching facilities: ", error);
    showNotification('Failed to load facilities', 'error');
  }
}

/*Jerel chanegd */

// ===============
// ANALYTICS CHARTS (Integrated from analytics.js)
// ===============
// document.addEventListener("DOMContentLoaded", async () => {
//   const db = firebase.firestore();
//   const bookingsSnapshot = await db.collection("bookings").get();

//   const revenueByDate = {};
//   const paymentStats = { paid: 0, unpaid: 0 };
//   const weekdayStats = {
//     Sunday: 0, Monday: 0, Tuesday: 0, Wednesday: 0,
//     Thursday: 0, Friday: 0, Saturday: 0
//   };

//   bookingsSnapshot.forEach(doc => {
//     const { bookingDate, requiresPayment, status, facilityType} = doc.data();
//     const date = bookingDate?.split("T")[0];

//     if (status === "paid" && facilityType === "Pool Table") {
//       paymentStats.paid += 1;
//       if (requiresPayment) {
//         revenueByDate[date] = (revenueByDate[date] || 0) + 5;
//       }
//     } else if (status === "pending"&& facilityType === "Pool Table") {
//       paymentStats.unpaid += 1;
//     }

//     if (date) {
//       const dayName = new Date(date).toLocaleDateString("en-US", { weekday: 'long' });
//       if (weekdayStats[dayName] !== undefined) {
//         weekdayStats[dayName]++;
//       }
//     }
//   });


//   // Ensure Chart.getChart() works on all versions
//   if (typeof Chart.getChart !== "function") {
//     Chart.getChart = function(id) {
//       const canvas = document.getElementById(id);
//       return Object.values(Chart.instances || {}).find(c => c.canvas === canvas);
//     };
//   }

//   const createChart = (id, type, label, labels, data, colors) => {
//     const ctx = document.getElementById(id);
//     if (!ctx) return;

//     new Chart(ctx, {
//       type,
//       data: {
//         labels,
//         datasets: [{
//           label,
//           data,
//           backgroundColor: colors,
//           borderColor: colors,
//           borderWidth: 1,
//           fill: type === "line" ? false : true
//         }]
//       }
//     });
//   };

//   // Sort revenue dates for chronological order
//   const sortedDates = Object.keys(revenueByDate).sort((a, b) => new Date(a) - new Date(b));
//   const sortedRevenue = sortedDates.map(date => revenueByDate[date]);

//   // Create charts
//   window.revenueChart = createChart("revenueChart", "line", "Revenue by Date", sortedDates, sortedRevenue, "green");
//   window.paymentChart = createChart("paymentChart", "doughnut", "Payment Stats", ["Paid", "Unpaid"], [paymentStats.paid, paymentStats.unpaid], ["#68d391", "#edf2f7"]);
//   window.weekdayChart = createChart("weekdayChart", "line", "Bookings by Weekday", Object.keys(weekdayStats), Object.values(weekdayStats), "#805ad5");
// });
document.addEventListener("DOMContentLoaded", async () => {
  const db = firebase.firestore();
  const bookingsSnapshot = await db.collection("bookings").get();

  const revenueByDate = {};
  const paymentStats = { paid: 0, unpaid: 0 };
  const weekdayStats = {
    Sunday: 0, Monday: 0, Tuesday: 0, Wednesday: 0,
    Thursday: 0, Friday: 0, Saturday: 0
  };

  bookingsSnapshot.forEach(doc => {
    const { bookingDate, requiresPayment, status, facilityType } = doc.data();
    const isPoolTable = (facilityType || "").toLowerCase() === "pool table";
    const date = bookingDate?.split("T")[0];

    if (status === "paid" && isPoolTable) {
      paymentStats.paid += 1;
      if (requiresPayment) {
        revenueByDate[date] = (revenueByDate[date] || 0) + 5;
      }

      if (date) {
        const dayName = new Date(date).toLocaleDateString("en-US", { weekday: 'long' });
        if (weekdayStats[dayName] !== undefined) {
          weekdayStats[dayName]++;
        }
      }
    } else if (status === "pending" && isPoolTable) {
      paymentStats.unpaid += 1;
    }
  });

  // Ensure Chart.getChart() works on all versions
  if (typeof Chart.getChart !== "function") {
    Chart.getChart = function (id) {
      const canvas = document.getElementById(id);
      return Object.values(Chart.instances || {}).find(c => c.canvas === canvas);
    };
  }

  const createChart = (id, type, label, labels, data, colors) => {
    const ctx = document.getElementById(id);
    if (!ctx) return;

    new Chart(ctx, {
      type,
      data: {
        labels,
        datasets: [{
          label,
          data,
          backgroundColor: colors,
          borderColor: colors,
          borderWidth: 1,
          fill: type === "line" ? false : true
        }]
      }
    });
  };

  // Sort revenue dates chronologically
  const sortedDates = Object.keys(revenueByDate).sort((a, b) => new Date(a) - new Date(b));
  const sortedRevenue = sortedDates.map(date => revenueByDate[date]);

  // Render Charts
  window.revenueChart = createChart("revenueChart", "line", "Revenue by Date", sortedDates, sortedRevenue, "green");
  window.paymentChart = createChart("paymentChart", "doughnut", "Payment Stats", ["Paid", "Unpaid"], [paymentStats.paid, paymentStats.unpaid], ["#68d391", "#edf2f7"]);
  window.weekdayChart = createChart("weekdayChart", "line", "Bookings by Weekday", Object.keys(weekdayStats), Object.values(weekdayStats), "#805ad5");
});












// =================================
// DISPLAY FACILITIES 
// =================================
function displayFacilities(facilities) {
  const listDiv = document.getElementById("facilitiesList");
  if (!listDiv) return;
  listDiv.innerHTML = "";

  const categories = {
    cubicle: [],
    "discussion room": [],
    "pool table": [],
    "study room": []
  };

  facilities.forEach(fac => {
    const type = fac.type.toLowerCase();
    if (categories[type]) categories[type].push(fac);
  });

  Object.entries(categories).forEach(([type, items]) => {
    if (items.length === 0) return;

    // Sort cubicles numerically by name
    if (type === 'cubicle') {
        items.sort((a, b) => {
            const numA = parseInt((a.name || '').replace(/\D/g, ''));
            const numB = parseInt((b.name || '').replace(/\D/g, ''));
            return numA - numB;
        });
    }

    const section = document.createElement("div");
    section.className = "facility-section";

    const title = document.createElement("h3");
    title.className = "facility-title";
    const floorNames = {
        "pool table": "Floor 2 (Pool Tables)",
        "cubicle": "Floor 3 (Cubicles)",
        "study room": "Floor 4 (Study Rooms)",
        "discussion room": "Floor 6 (Discussion Rooms)"
    };

    const typeMap = {
        "pool table": "poolTables",
        "cubicle": "cubicles",
        "study room": "studyRooms",
        "discussion room": "discussionRooms"
    };

    title.innerHTML = `${floorNames[type]} <a href="Facilities_dashboard.html?type=${typeMap[type]}">View All</a>`;
    section.appendChild(title);

    // Create wrapper for scrollable content (remove scroll for cubicle)
    const gridWrapper = document.createElement("div");
    gridWrapper.className = "facility-grid-wrapper";

    const grid = document.createElement("div");
    grid.className = "facility-grid";

    items.forEach(fac => {
      const card = document.createElement("div");
      card.className = `facility-card ${statusClass(fac.status)}`;
      card.style.border = `2px solid ${fac.status === 'Available' ? '#4CAF50' : fac.status === 'In Use' ? '#FF9800' : fac.status === 'Reserved' ? '#F44336' : '#64748b'}`;
      card.style.position = 'relative';
      // Facility name and status
      card.innerHTML = `
        <div class="facility-name">${fac.name}</div>
        <div class="facility-status">${capitalizeWords(fac.status)}</div>
        <button class="edit-availability-btn" data-id="${fac.id}" data-name="${fac.name}" data-type="${fac.type}" data-floor="${fac.floor}">Edit</button>
      `;
      grid.appendChild(card);
    });

    // Remove scroll styling for cubicle
    if (type === "cubicle") {
      gridWrapper.style.maxHeight = "none";
      gridWrapper.style.overflowY = "visible";
    }

    gridWrapper.appendChild(grid);
    section.appendChild(gridWrapper);
    listDiv.appendChild(section);
  });

  // Event delegation for status override and view bookings
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('status-override-btn')) {
      const id = e.target.getAttribute('data-id');
      const newStatus = e.target.getAttribute('data-status');
      firebase.firestore().collection('facilities').doc(id).update({ status: newStatus })
        .then(() => {
          showNotification(`Status updated to ${newStatus}`, 'success');
          loadFacilities();
        });
    }
    if (e.target.classList.contains('view-bookings-btn')) {
      const id = e.target.getAttribute('data-id');
      showFacilityBookingsModal(id);
    }
    if (e.target.classList.contains('edit-availability-btn')) {
      const id = e.target.getAttribute('data-id');
      const name = e.target.getAttribute('data-name');
      const type = e.target.getAttribute('data-type');
      const floor = e.target.getAttribute('data-floor');
      showAdminSlotEditModal(id, name, type, floor);
    }
  });
}

// Modal to show all bookings for a facility
function showFacilityBookingsModal(facilityId) {
  firebase.firestore().collection('bookings')
    .where('facility_id', '==', facilityId)
    .orderBy('booking_date', 'desc')
    .get()
    .then(snapshot => {
      let modal = document.getElementById('facilityBookingsModal');
      if (modal) modal.remove();
      modal = document.createElement('div');
      modal.id = 'facilityBookingsModal';
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
        <div style="background: #fff; border-radius: 16px; padding: 36px 32px; min-width: 400px; max-width: 95vw; box-shadow: 0 8px 32px rgba(0,0,0,0.18); position: relative; width: 500px;">
          <button id="closeFacilityBookingsModal" style="position:absolute;top:12px;right:16px;background:none;border:none;font-size:22px;cursor:pointer;">&times;</button>
          <h2 style="margin-bottom: 8px; color: #4f46e5;">Facility Bookings</h2>
          <div id="facilityBookingsTable" style="max-height:300px;overflow-y:auto;margin-top:8px;"></div>
        </div>
      `;
      document.body.appendChild(modal);
      document.getElementById('closeFacilityBookingsModal').onclick = () => modal.remove();
      modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
      const tableDiv = document.getElementById('facilityBookingsTable');
      if (snapshot.empty) {
        tableDiv.innerHTML = '<div style="color:#64748b;">No bookings for this facility.</div>';
      } else {
        let html = '<table style="width:100%;font-size:14px;"><tr><th>User</th><th>Time Slot</th><th>Status</th></tr>';
        snapshot.forEach(doc => {
          const b = doc.data();
          html += `<tr>
            <td>${b.user_email || '—'}<br><span style="color:#888;">${b.user_name || ''}</span></td>
            <td>${b.time_slot || '—'}</td>
            <td><span style="font-weight:600;">${b.status}</span></td>
          </tr>`;
        });
        html += '</table>';
        tableDiv.innerHTML = html;
      }
    });
}

// =================================
// HELPER FUNCTIONS 
// =================================
function capitalizeWords(str) {
  return str.replace(/\b\w/g, c => c.toUpperCase());
}
// Convert status to CSS class
function statusClass(status) {
  const s = status.toLowerCase();
  if (s === "available") return "available";
  if (s === "in use") return "in-use";
  if (s === "unavailable") return "unavailable";
  if (s === "reserved") return "reserved";
  return "";
}

/*Jerel added */
// =================================
// UPDATE STATS FROM FACILITIES
// =================================
function updateStatsFromFacilities(facilities) {
  let activeSessions = 0;
  let totalFacilities = facilities.length;
  let pendingRequests = typeof DashboardState !== 'undefined' && DashboardState.pendingRequests !== undefined ? DashboardState.pendingRequests : 0;

  // First: fetch existing todayRevenue from Firebase
  const statsRef = firebase.firestore().collection("dashboardStats").doc("Stats");

  statsRef.get().then((doc) => {
    let todayRevenue = doc.exists && doc.data().todayRevenue ? doc.data().todayRevenue : 0;

    facilities.forEach(fac => {
      const status = fac.status.toLowerCase().replace(/[-_\s]/g, "");

      if (status === "inuse") activeSessions++;
    });

    updateStatsInFirebase({
      activeSessions,
      pendingRequests,
      todayRevenue,    
      totalFacilities
    });

  }).catch(err => {
    console.error("Failed to fetch todayRevenue:", err);
  });
}

// =================================
// UPDATE TODAY'S REVENUE FROM PAID BOOKINGS  (have not changed by the day yet so far is just total paid bookings * RM5)  
// =================================
async function updateTodayRevenueFromPaidBookings() {
  try {
    const snapshot = await firebase.firestore()
      .collection("bookings")
      .where("status", "==", "paid")
      .get();

    let totalRevenue = 0;
    snapshot.forEach(doc => {
      const data = doc.data();
      if ((data.facilityType || '').toLowerCase() === 'pool table') {
        totalRevenue += 5;
      }
    });

    updateStatsInFirebase({ todayRevenue: totalRevenue });

    const revenueElement = document.getElementById("todayRevenueValue");
    if (revenueElement) {
      revenueElement.textContent = `RM${totalRevenue}`;
    }

    DashboardState.todayRevenue = totalRevenue;

    console.log(`💰 Revenue updated: ${totalRevenue} (only pool table paid bookings × RM5)`);
  } catch (error) {
    console.error("❌ Failed to update revenue:", error);
    showNotification("Failed to update revenue", "error");
  }
}



// =================================
// PENDING REQUESTS FROM BOOKINGS   
// =================================
async function updatePendingRequestsFromBookings() {
  try {
    const snapshot = await firebase.firestore()
      .collection("bookings")
      .where("status", "==", "pending")
      .get();

    let count = snapshot.size;

    // Update UI
    const pendingElement = document.getElementById("pendingRequestsValue");
    if (pendingElement) {
      pendingElement.textContent = count;
    }

    // Update Firebase and state
    updateStatsInFirebase({ pendingRequests: count });
    DashboardState.pendingRequests = count;

    console.log(`✅ Pending bookings counted: ${count}`);
  } catch (err) {
    console.error("❌ Failed to fetch pending bookings:", err);
    showNotification("Failed to fetch pending bookings", "error");
  }
}

// =================================
// RECENT BOOKINGS RENDERING        
// =================================
async function renderRecentBookings() {
  try {
    const bookingsWrapper = document.querySelector('.booking-scroll-wrapper');
    if (!bookingsWrapper) return;

    bookingsWrapper.innerHTML = ''; // Clear previous bookings

    // ========================
    // VERSION 1: Today → +7 Days (commented for later use)
    // ========================
    /*
    const now = new Date();
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(now.getDate() + 7);

    const snapshot = await firebase.firestore()
      .collection("bookings")
      .where("bookingDate", ">=", now)
      .where("bookingDate", "<=", sevenDaysLater)
      .orderBy("bookingDate", "desc")
      .get();
    */

    // ========================
    // VERSION 2: Most Recent 100 bookings
    // ========================
    const snapshot = await firebase.firestore()
      .collection("bookings")
      .where("status", "==", "pending")
      .orderBy("booking_date", "desc")
      .limit(100)
      .get();

    snapshot.forEach(doc => {
      const data = doc.data();
      const status = data.status?.toLowerCase() || 'unknown';
      // Only show bookings with status 'pending'
      if (status !== 'pending') return;
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
          <div class="time-slot">${data.timeSlot || data.time_slot || '—'}</div>
          <div>
            <span class="status-badge ${status}">${capitalizeWords(status)}</span>
          </div>
          <div class="action-buttons">
            <button class="action-btn approve" title="Approve">✓</button>
            <button class="action-btn reject" title="Reject">✗</button>
          </div>
        </div>
      `;
      bookingsWrapper.insertAdjacentHTML('beforeend', bookingRow);
    });

  } catch (error) {
    console.error("❌ Failed to fetch bookings:", error);
    showNotification("Could not load recent bookings", "error");
  }
}

// ==============================
// POPUP: Facility Edit Controls
// ==============================
let currentEditFacilityId = null;

function openEditPopup(id, name, type, floor) {
  currentEditFacilityId = id;
  document.getElementById("popupTitle").textContent = `Manage ${name}`;
  document.getElementById("popupInfo").innerHTML = `Type: ${type}<br>Floor: ${floor}`;
  document.getElementById("editPopup").classList.remove("hidden");
}

function closeEditPopup() {
  document.getElementById("editPopup").classList.add("hidden");
  currentEditFacilityId = null;
}

function updateFacilityStatus(newStatus) {
  if (!currentEditFacilityId) return;

  firebase.firestore().collection("facilities").doc(currentEditFacilityId).update({
    status: newStatus
  }).then(() => {
    showNotification(`Facility marked as ${newStatus}`, "success");
    closeEditPopup();
    loadFacilities(); // reload updated facilities
  }).catch(err => {
    console.error("Failed to update status:", err);
    showNotification("Error updating status", "error");
  });
}

/*Jerel added */

window.showBookingForm = function(facilityId, facilityName, requiresPayment) {
  const startTime = prompt(`Booking start time for ${facilityName} (YYYY-MM-DD HH:MM):`);
  const endTime = prompt(`Booking end time for ${facilityName} (YYYY-MM-DD HH:MM):`);
  if (!startTime || !endTime) return;

  const user = firebase.auth().currentUser;
  if (!user) {
    alert("You must be logged in to book.");
    return;
  }

  createBooking(user.uid, facilityId, startTime, endTime, requiresPayment);
};

async function showAdminSlotEditModal(facilityId, name, type, floor) {
  let modal = document.getElementById('adminSlotEditModal');
  if (modal) modal.remove();
  modal = document.createElement('div');
  modal.id = 'adminSlotEditModal';
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
  // Date picker (default to today)
  const today = new Date();
  const pad = n => n.toString().padStart(2, '0');
  const defaultDate = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  modal.innerHTML = `
    <div style="background: #fff; border-radius: 16px; padding: 36px 32px; min-width: 400px; max-width: 95vw; box-shadow: 0 8px 32px rgba(0,0,0,0.18); position: relative; width: 500px;">
      <button id="closeAdminSlotEditModal" style="position:absolute;top:12px;right:16px;background:none;border:none;font-size:22px;cursor:pointer;">&times;</button>
      <h2 style="margin-bottom: 8px; color: #4f46e5;">${name} (Edit Availability)</h2>
      <div style="margin-bottom: 12px;">
        <label for="adminSlotEditDate">Date:</label>
        <input type="date" id="adminSlotEditDate" value="${defaultDate}" style="margin-left:8px;">
      </div>
      <div id="adminSlotEditTable"></div>
      <button class="btn btn-primary" id="saveSlotStatusesBtn" style="margin-top:12px;">Save Slot Statuses</button>
    </div>
  `;
  document.body.appendChild(modal);
  document.getElementById('closeAdminSlotEditModal').onclick = () => modal.remove();
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  // Render slot table for selected date
  async function renderSlotTable(dateStr) {
    const allSlots = [
      '08:00', '09:00', '10:00', '11:00', '12:00',
      '13:00', '14:00', '15:00', '16:00', '17:00'
    ];
    const availabilityRef = firebase.firestore()
      .collection('facilities')
      .doc(facilityId)
      .collection('availability')
      .doc(dateStr);
    const doc = await availabilityRef.get();
    let slotData = {};
    if (doc.exists) slotData = doc.data();
    const slotTable = document.createElement('table');
    slotTable.style.width = '100%';
    slotTable.style.margin = '16px 0';
    slotTable.innerHTML = '<tr><th>Time Slot</th><th>Status</th></tr>';
    allSlots.forEach(slot => {
      const tr = document.createElement('tr');
      const tdSlot = document.createElement('td');
      tdSlot.textContent = slot;
      const tdStatus = document.createElement('td');
      const select = document.createElement('select');
      ['available', 'reserved', 'in-use'].forEach(status => {
        const opt = document.createElement('option');
        opt.value = status;
        opt.textContent = status.charAt(0).toUpperCase() + status.slice(1);
        if ((slotData[slot] || 'available') === status) opt.selected = true;
        select.appendChild(opt);
      });
      tdStatus.appendChild(select);
      tr.appendChild(tdSlot);
      tr.appendChild(tdStatus);
      slotTable.appendChild(tr);
    });
    const tableDiv = document.getElementById('adminSlotEditTable');
    tableDiv.innerHTML = '';
    tableDiv.appendChild(slotTable);
  }
  // Initial render
  renderSlotTable(defaultDate);
  // Date picker change
  document.getElementById('adminSlotEditDate').onchange = function() {
    renderSlotTable(this.value);
  };
  // Save button logic
  document.getElementById('saveSlotStatusesBtn').onclick = async function() {
    const dateStr = document.getElementById('adminSlotEditDate').value;
    const selects = document.querySelectorAll('#adminSlotEditTable select');
    const allSlots = [
      '08:00', '09:00', '10:00', '11:00', '12:00',
      '13:00', '14:00', '15:00', '16:00', '17:00'
    ];
    const updates = {};
    allSlots.forEach((slot, i) => {
      updates[slot] = selects[i].value;
    });
    const availabilityRef = firebase.firestore()
      .collection('facilities')
      .doc(facilityId)
      .collection('availability')
      .doc(dateStr);
    await availabilityRef.set(updates, { merge: true });
    alert('Availability updated!');
    modal.remove();
    loadFacilities();
  };
}