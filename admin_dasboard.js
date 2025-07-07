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
  databaseURL: "https://spotsync-90745-default-rtdb.asia-southeast1.firebasedatabase.app"
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
            <button title="View"></button>
            ${b.status === "Pending" ? '<button title="Approve">Approve</button><button title="Reject">Reject</button>' : ''}
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

    document.getElementById("active-sessions").innerHTML = `Active Sessions <strong>${stats.activeSessions}</strong>`;
    document.getElementById("pending-requests").innerHTML = `Pending Requests <strong>${stats.pendingRequests}</strong>`;
    document.getElementById("todays-revenue").innerHTML = `Today's Revenue <strong>RM${stats.todaysRevenue}</strong>`;
    document.getElementById("total-facilities").innerHTML = `Total Facilities <strong>${stats.totalFacilities}</strong>`;
  });

  // ======== FACILITY STATUSES (using IDs instead of index) ========
  const statusRef = ref(db, "statuses");

  onValue(statusRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) return;

    const renderStatus = (elementId, items) => {
      const container = document.getElementById(elementId);
      container.innerHTML = "";
      for (const [label, info] of Object.entries(items)) {
        const status = info.status || "Unknown";
        const div = document.createElement("div");
        div.className = `item ${status.toLowerCase().replace(/\s+/g, "-")}`;
        const labelFormatted = label.replaceAll("_", " ");
        div.innerHTML = `${labelFormatted}<br><small>${status}</small>`;
        container.appendChild(div);
      }
    };

    renderStatus("pool-tables-status", data.poolTables);
    renderStatus("discussion-rooms-status", data.discussionRooms);
    renderStatus("cubicles-status", data.cubicles);
  });

  // === EXPORT DATA FUNCTIONALITY ===
  document.querySelector(".export").addEventListener("click", () => {
    const exportRef = ref(db); // export entire DB

    onValue(exportRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        alert("No data to export.");
        return;
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "firebase_data_export.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, { onlyOnce: true }); // only read once
  });
});
