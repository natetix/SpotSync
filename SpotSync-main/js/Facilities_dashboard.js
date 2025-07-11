import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// Firebase config
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

// Section mapping
const sectionMap = {
  "Pool Table": { containerId: "poolTables-section", statusId: "pool-tables-status" },
  "Discussion Room": { containerId: "discussionRooms-section", statusId: "discussion-rooms-status" },
  "Cubicle": { containerId: "cubicles-section", statusId: "cubicles-status" },
  "Study Room": { containerId: "studyRooms-section", statusId: "study-rooms-status" }
};

const capitalizeWords = str => str.replace(/\w\S*/g, t => t.charAt(0).toUpperCase() + t.substring(1).toLowerCase());
const statusClass = status => status ? status.toLowerCase().replace(/\s+/g, "-") : "unknown";

// =======================
// Render main dashboard
// =======================
document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const typeFilter = decodeURIComponent(urlParams.get("type") || "").replace(/\+/g, " ");

  Object.values(sectionMap).forEach(({ containerId }) => {
    const el = document.getElementById(containerId);
    if (el) el.style.display = "none";
  });

  const snapshot = await getDocs(collection(db, "facilities"));
  const facilities = [];
  snapshot.forEach(doc => facilities.push({ id: doc.id, ...doc.data() }));

  const categorized = { "Pool Table": {}, "Discussion Room": {}, "Cubicle": {}, "Study Room": {} };

  facilities.forEach(fac => {
    const type = fac.type;
    const name = fac.name || fac.id;
    if (categorized[type]) {
      categorized[type][name] = {
        name,
        floor: fac.floor || "N/A",
        requires_payment: fac.requires_payment || false,
        status: fac.status || "Unknown",
        id: fac.id
      };
    }
  });

  if (typeFilter && sectionMap[typeFilter]) {
    const { containerId, statusId } = sectionMap[typeFilter];
    renderStatusWithDetails(statusId, categorized[typeFilter]);
    setLastUpdated(typeFilter);
    document.getElementById(containerId).style.display = "block";
  } else {
    Object.entries(sectionMap).forEach(([typeKey, { containerId, statusId }]) => {
      renderStatusWithDetails(statusId, categorized[typeKey]);
      setLastUpdated(typeKey);
      document.getElementById(containerId).style.display = "block";
    });
  }
});

const setLastUpdated = (type) => {
  const now = new Date();
  const formatted = now.toLocaleTimeString("en-MY", { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const map = {
    "Pool Table": "last-updated-pool",
    "Cubicle": "last-updated-cubicle",
    "Study Room": "last-updated-study",
    "Discussion Room": "last-updated-discussion"
  };
  const el = document.getElementById(map[type]);
  if (el) el.textContent = `Last updated: ${formatted}`;
};

const renderStatusWithDetails = (elementId, items) => {
  const container = document.getElementById(elementId);
  container.innerHTML = "";

  for (const [label, info] of Object.entries(items)) {
    const status = info.status || "Unknown";
    const div = document.createElement("div");
    div.className = `item ${statusClass(status)}`;
    div.innerHTML = `${label}<br><small>${capitalizeWords(status)}</small>`;

    div.addEventListener("click", () => {
      renderFacilityDetails(label, info);
    });

    container.appendChild(div);
  }
};

const renderFacilityDetails = async (name, info) => {
  const content = document.getElementById("details-content");
  content.innerHTML = `
    <p><strong>Facility:</strong> ${name}</p>
    <p><strong>Floor:</strong> ${info.floor ?? "N/A"}</p>
    <p><strong>Status:</strong> ${info.status ?? "Unknown"}</p>
    <p><strong>Requires Payment:</strong> ${info.requires_payment ? "Yes" : "No"}</p>
  `;

  const availabilityRef = collection(db, "facilities", info.id, "availability");
  const availabilitySnapshot = await getDocs(availabilityRef);

  const schedule = {};
  availabilitySnapshot.forEach(doc => {
    const date = doc.id;
    const times = doc.data();
    schedule[date] = {};

    Object.entries(times).forEach(([time, status]) => {
      const formattedTime = new Date(`1970-01-01T${time}`).toLocaleTimeString("en-US", {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }).replace(/^0/, '');
      schedule[date][formattedTime] = status;
    });
  });

  const next7Days = [];
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    next7Days.push(d.toISOString().split("T")[0]);
  }

  const times = ["8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM", "6:00 PM"];

  const grid = document.getElementById("availability-grid");
  grid.innerHTML = "";

  const table = document.createElement("table");
  table.classList.add("calendar-table");

  const header = document.createElement("tr");
  header.innerHTML = "<th>Time</th>" + next7Days.map(date => `<th>${date}</th>`).join("");
  table.appendChild(header);

  times.forEach(time => {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${time}</td>` + next7Days.map(date => {
      const status = schedule[date]?.[time] ?? "Available";
      return `<td class="${statusClass(status)}">${capitalizeWords(status)}</td>`;
    }).join("");
    table.appendChild(row);
  });

  grid.appendChild(table);
};

// =======================
// Handle booking rejection 
// =======================
document.addEventListener("DOMContentLoaded", () => {
  const exportBtn = document.getElementById("export-btn");
  if (exportBtn) {
    exportBtn.addEventListener("click", exportData);
  }
});


// =======================
// EXPORT FUNCTION
// =======================
window.exportData = async function () {
  const snapshot = await getDocs(collection(db, "facilities"));
  const facilities = [];

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const id = docSnap.id;
    const name = data.name || id;
    const floor = data.floor ?? "N/A";
    const status = data.status ?? "Unknown";
    const type = data.type ?? "Unknown";
    const requiresPayment = data.requires_payment ? "Yes" : "No";

    const availabilityRef = collection(db, "facilities", id, "availability");
    const availabilitySnapshot = await getDocs(availabilityRef);
    
    const schedule = {};
    availabilitySnapshot.forEach(doc => {
      const date = doc.id;
      const times = doc.data();
      schedule[date] = { ...times };
    });

    const timeSlots = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];
    const timeLabels = ["8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM", "6:00 PM"];
    
    const now = new Date();
    const next7Days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      next7Days.push(d.toISOString().split("T")[0]);
    }

    for (let i = 0; i < timeSlots.length; i++) {
      const row = {
        Name: name,
        Floor: floor,
        Status: status,
        Type: type,
        RequiresPayment: requiresPayment,
        Time: timeLabels[i]
      };

      next7Days.forEach(date => {
        row[date] = schedule[date]?.[timeSlots[i]] ?? "Available";
      });

      facilities.push(row);
    }
  }

  if (facilities.length === 0) {
    alert("No facility data to export.");
    return;
  }

  const headers = Object.keys(facilities[0]);
  const rows = facilities.map(fac => headers.map(h => `"${fac[h]}"`).join(","));
  const csvContent = [headers.join(","), ...rows].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Facility_Availability_Export.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};
