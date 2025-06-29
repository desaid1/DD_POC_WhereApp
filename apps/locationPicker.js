// locationPicker.js :: v20250629194700
let selectedLocation = null;

function loadLocationPicker(containerId, userId, db) {
  const container = document.getElementById(containerId);
  container.innerHTML = `
    <label for="locationSourceSelect">📍 Choose Location Source:</label>
    <select id="locationSourceSelect" style="margin-bottom: 10px;">
      <option value="">Select from saved location sources...</option>
    </select>
  `;

  const dropdown = document.getElementById("locationSourceSelect");

  db.collection("things")
    .where("userId", "==", userId)
    .where("isLocationSource", "==", true)
    .get()
    .then(snapshot => {
      if (snapshot.empty) {
        dropdown.insertAdjacentHTML('afterend',
          `<div style="color: red; font-size: 14px;">⚠️ No location sources found. Please add one first.</div>`);
        return;
      }
      snapshot.forEach(doc => {
        const data = doc.data();
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
}

function getSelectedLocation() {
  return selectedLocation;
}
