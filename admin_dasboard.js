// Firebase SDK Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-analytics.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyAG3EtnZKwjW-r_4jCpfL_VSuflroCriCc",
  authDomain: "spotsync-90745.firebaseapp.com",
  projectId: "spotsync-90745",
  storageBucket: "spotsync-90745.firebasestorage.app",
  messagingSenderId: "799404749511",
  appId: "1:799404749511:web:6081d8bba11f4dc46744e2",
  measurementId: "G-2N5BBPGSP7",
  databaseURL: "https://spotsync-90745-default-rtdb.firebaseio.com"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getDatabase(app);

// DOM Ready
document.addEventListener("DOMContentLoaded", () => {
  // ======== RECENT BOOKINGS ========
  const tbody = document.getElementById("bookings-body");
  const bookingsRef = ref(db, "bookings");

  onValue(bookingsRef, (snapshot) => {
    const bookings = snapshot.val();
    tbody.innerHTML = "";

    if (bookings) {
      Object.values(bookings).forEach(b => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${b.student}<br><small>${b.id}</small></td>
          <td>${b.facility}</td>
          <td>${b.time}</td>
          <td class="status-${b.status.toLowerCase()}">${b.status}</td>
          <td>
            <button title="View">👁️</button>
            ${b.status === "Pending" ? '<button title="Approve">✔️</button><button title="Reject">❌</button>' : ''}
          </td>
        `;
        tbody.appendChild(tr);
      });
    } else {
      tbody.innerHTML = "<tr><td colspan='5'>No bookings found.</td></tr>";
    }
  });

  // ======== DASHBOARD STATS ========
  const statsRef = ref(db, "dashboardStats");
  const statsCards = document.querySelectorAll(".stats .card");

  onValue(statsRef, (snapshot) => {
    const stats = snapshot.val();
    if (!stats) return;

    statsCards[0].innerHTML = `Active Sessions <strong>${stats.activeSessions}</strong>`;
    statsCards[1].innerHTML = `Pending Requests <strong>${stats.pendingRequests}</strong>`;
    statsCards[2].innerHTML = `Today's Revenue <strong>$${stats.todaysRevenue}</strong>`;
    statsCards[3].innerHTML = `Total Facilities <strong>${stats.totalFacilities}</strong>`;
  });

  // ======== FACILITY STATUSES (using IDs instead of index) ========
  const statusRef = ref(db, "statuses");

  onValue(statusRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) return;

    const renderStatus = (elementId, items) => {
      const container = document.getElementById(elementId);
      container.innerHTML = "";
      for (const [label, status] of Object.entries(items)) {
        const div = document.createElement("div");
        div.className = `item ${status.toLowerCase().replace(/\s+/g, "-")}`;
        div.innerHTML = `${label}<br><small>${status}</small>`;
        container.appendChild(div);
      }
    };

    renderStatus("pool-tables-status", data.poolTables);
    renderStatus("discussion-rooms-status", data.discussionRooms);
    renderStatus("cubicles-status", data.cubicles);
  });
});
