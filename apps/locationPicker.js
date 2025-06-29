// locationPicker.js
let selectedLocation = null;

function loadLocationPicker(containerId, userId, db) {
  const container = document.getElementById(containerId);
  container.innerHTML = `
    <div class="section">
      <label>📍 Choose from your Location Sources:</label>
      <select id="locationSourceDropdown">
        <option value="">-- Select Location Source --</option>
      </select>
    </div>
    <div class="section">
      <label>🧭 Or fallback to your phone location:</label>
      <button onclick="getDeviceLocation()">Use My Location</button>
    </div>
    <div class="section">
      <label>📷 Or scan a QR map link:</label>
      <button onclick="scanQRMapLink()">Scan QR (Coming Soon)</button>
    </div>
    <div class="section">
      <label>🔗 Or manually enter a map link:</label>
      <input type="text" id="manualMapLink" placeholder="https://maps.google.com/?q=..." onblur="validateManualLink()">
      <div id="manualValidationMsg" style="font-size: 14px; color: red;"></div>
    </div>
  `;

  // Load user location sources
  db.collection("things")
    .where("userId", "==", userId)
    .where("isLocationSource", "==", true)
    .get().then(snapshot => {
      const dropdown = document.getElementById("locationSourceDropdown");
      snapshot.forEach(doc => {
        const data = doc.data();
        const opt = document.createElement("option");
        opt.value = JSON.stringify(data.location);
        opt.textContent = `${data.name} (${data.location?.source || "manual"})`;
        dropdown.appendChild(opt);
      });
    });

  document.getElementById("locationSourceDropdown").onchange = e => {
    const loc = e.target.value;
    if (loc) {
      try {
        const parsed = JSON.parse(loc);
        selectedLocation = { ...parsed, source: parsed.source || "source" };
      } catch (err) {
        selectedLocation = null;
      }
    }
  };
}

function getDeviceLocation() {
  navigator.geolocation.getCurrentPosition(pos => {
    selectedLocation = {
      lat: pos.coords.latitude.toFixed(5),
      long: pos.coords.longitude.toFixed(5),
      source: "mobile"
    };
    alert("📍 Location set from your device");
  }, err => {
    alert("❌ Unable to get location");
    selectedLocation = null;
  });
}

function validateManualLink() {
  const input = document.getElementById("manualMapLink").value.trim();
  const msg = document.getElementById("manualValidationMsg");
  const regex = /https:\/\/maps\.google\.com\/.+q=([-0-9.]+),([-0-9.]+)/;
  const match = input.match(regex);

  if (match) {
    selectedLocation = {
      lat: parseFloat(match[1]).toFixed(5),
      long: parseFloat(match[2]).toFixed(5),
      source: "manual-link"
    };
    msg.textContent = "✅ Valid map link";
    msg.style.color = "green";
  } else {
    selectedLocation = null;
    msg.textContent = "❌ Not a valid Google Maps link";
    msg.style.color = "red";
  }
}

// Stub for QR scan
function scanQRMapLink() {
  alert("🚧 QR scanning not implemented in this browser demo.");
  selectedLocation = null;
}

function getSelectedLocation() {
  return selectedLocation;
}
