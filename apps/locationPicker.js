// locationPicker.js :: v20250630002000 :: disable dropdown if adding new location source
let selectedLocation = null;

function loadLocationPicker(containerId, userId, db) {
  const container = document.getElementById(containerId);
  container.innerHTML = `
    <label for="locationSourceSelect">📍 Choose Location Source v20250630002000:</label>
    <select id="locationSourceSelect" style="margin-bottom: 10px;">
      <option value="">Select from saved location sources...</option>
    </select>
  `;

  const dropdown = document.getElementById("locationSourceSelect");
  console.log("📡 Fetching location sources for userId:", userId);

  db.collection("things")
    .where("userId", "==", userId)
    .where("isLocationSource", "==", true)
    .get()
    .then(snapshot => {
      console.log("📊 Query returned", snapshot.size, "documents.");
      if (snapshot.empty) {
        dropdown.insertAdjacentHTML('afterend',
          `<div style="color: red; font-size: 14px;">⚠️ No location sources found. Please add one first.</div>`);
        return;
      }
      snapshot.forEach(doc => {
        const data = doc.data();
        console.log("📍 Location Source Found:", data);
        if (data.location?.lat && data.location?.long) {
          const option = document.createElement("option");
          option.value = JSON.stringify(data.location);
          option.textContent = `${data.name} (${data.location?.source || "unknown"})`;
          dropdown.appendChild(option);
        }
      });
    })
    .catch(err => {
      console.error("🔥 Error loading sources:", err);
    });

  dropdown.addEventListener("change", e => {
    try {
      const loc = JSON.parse(e.target.value);
      selectedLocation = {
        lat: parseFloat(loc.lat).toFixed(5),
        long: parseFloat(loc.long).toFixed(5),
        source: loc.source || "saved"
      };
    } catch (err) {
      selectedLocation = null;
    }
  });

  // Disable dropdown if user intends to add a new location source
  const checkbox = document.getElementById("isLocationSource");
  if (checkbox) {
    checkbox.addEventListener("change", () => {
      dropdown.disabled = checkbox.checked;
      if (checkbox.checked) {
        selectedLocation = null;
        dropdown.selectedIndex = 0;
      }
    });
  }
}

function getSelectedLocation() {
  return selectedLocation;
}

function getDeviceLocation(callback) {
  if (!navigator.geolocation) {
    alert("Geolocation is not supported by your browser");
    callback(null);
    return;
  }
  navigator.geolocation.getCurrentPosition(
    position => {
      const loc = {
        lat: position.coords.latitude.toFixed(5),
        long: position.coords.longitude.toFixed(5),
        source: "device"
      };
      callback(loc);
    },
    error => {
      console.error("📍 Geolocation error:", error);
      alert("Unable to retrieve your location.");
      callback(null);
    }
  );
}

// Override location check logic to fetch device location if none selected
window.ensureLocationSourceIsValid = function (isLocationSource, onValid) {
  const selected = getSelectedLocation();
  if (isLocationSource) {
    console.log("📍 Device location expected for new location source...");
    getDeviceLocation(deviceLoc => {
      if (!deviceLoc) {
        alert("❌ Location is required. Please enable location access.");
        return;
      }
      selectedLocation = deviceLoc;
      onValid();
    });
    return false;
  }
  if (!selected) {
    alert("❌ Please select a Location Source from the dropdown.");
    return false;
  }
  return true;
};

// Intercept and modify submitThing()
if (typeof window.submitThing === "function") {
  const originalSubmit = window.submitThing;
  window.submitThing = function () {
    const isLocationSource = document.getElementById("isLocationSource").checked;
    const proceed = window.ensureLocationSourceIsValid(isLocationSource, originalSubmit);
    if (proceed === true) originalSubmit();
  };
}
