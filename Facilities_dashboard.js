import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAG3EtnZKwjW-r_4jCpfL_VSuflroCriCc",
  authDomain: "spotsync-90745.firebaseapp.com",
  projectId: "spotsync-90745",
  storageBucket: "spotsync-90745.firebasestorage.app",
  messagingSenderId: "799404749511",
  appId: "1:799404749511:web:6081d8bba11f4dc46744e2",
  measurementId: "G-2N5BBPGSP7",
  databaseURL: "https://spotsync-90745-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Original rendering function (for plain display)
const renderStatus = (elementId, items) => {
  const container = document.getElementById(elementId);
  container.innerHTML = "";

  for (const [label, info] of Object.entries(items)) {
    const status = typeof info === "string" ? info : (info.status || "Unknown");
    const div = document.createElement("div");
    div.className = `item ${status.toLowerCase().replace(/\s+/g, "-")}`;
    const labelFormatted = label.replaceAll("_", " ");
    div.innerHTML = `${labelFormatted}<br><small>${status}</small>`;
    container.appendChild(div);
  }
};

// New rendering function (includes detail interaction)
const renderStatusWithDetails = (elementId, items) => {
  const container = document.getElementById(elementId);
  container.innerHTML = "";

  for (const [label, info] of Object.entries(items)) {
    const status = typeof info === "string" ? info : (info.status || "Unknown");
    const div = document.createElement("div");
    div.className = `item ${status.toLowerCase().replace(/\s+/g, "-")}`;
    const labelFormatted = label.replaceAll("_", " ");
    div.innerHTML = `${labelFormatted}<br><small>${status}</small>`;

    // Click to show more details
    div.addEventListener("click", () => {
      renderFacilityDetails(labelFormatted, info);
    });

    container.appendChild(div);
  }
};

// Detail rendering function for the bottom section
const renderFacilityDetails = (name, info) => {
  const content = document.getElementById("details-content");

  if (typeof info !== "object") {
    content.innerHTML = `<p>No details available for ${name}</p>`;
    return;
  }

  const {
    condition = "Unknown",
    startsIn = "Unknown",
    endsIn = "Unknown",
    lastBooked = "Unknown",
    reservedFor = "Unknown",
    status = "Unknown"
  } = info;

  content.innerHTML = `
    <p><strong>Facility:</strong> ${name}</p>
    <p><strong>Condition:</strong> ${condition}</p>
    <p><strong>Status:</strong> ${status}</p>
    <p><strong>Starts In:</strong> ${startsIn}</p>
    <p><strong>Ends In:</strong> ${endsIn}</p>
    <p><strong>Reserved For:</strong> ${reservedFor}</p>
    <p><strong>Last Booked:</strong> ${lastBooked}</p>
  `;
};

// DOM Ready
document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const type = urlParams.get("type");

  const sectionMap = {
    poolTables: {
      dataKey: "poolTables",
      containerId: "poolTables-section",
      statusId: "pool-tables-status"
    },
    discussionRooms: {
      dataKey: "discussionRooms",
      containerId: "discussionRooms-section",
      statusId: "discussion-rooms-status"
    },
    cubicles: {
      dataKey: "cubicles",
      containerId: "cubicles-section",
      statusId: "cubicles-status"
    }
  };

  // Hide all sections first
  Object.values(sectionMap).forEach(({ containerId }) => {
    const el = document.getElementById(containerId);
    if (el) el.style.display = "none";
  });

  // Load status data from Firebase
  const statusRef = ref(db, "statuses");
  onValue(statusRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) return;

    if (type && sectionMap[type]) {
      console.log(`Showing only section: ${type}`);
      const { dataKey, containerId, statusId } = sectionMap[type];
      renderStatusWithDetails(statusId, data[dataKey]);
      document.getElementById(containerId).style.display = "block";
    } else {
      console.log("Showing all sections (no type specified)");
      Object.entries(sectionMap).forEach(([key, { dataKey, containerId, statusId }]) => {
        renderStatusWithDetails(statusId, data[dataKey]);
        document.getElementById(containerId).style.display = "block";
      });
    }
  });
});
