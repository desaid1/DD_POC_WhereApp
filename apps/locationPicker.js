// apps/locationPicker.js
let selectedLocation = null;

function loadLocationPicker(containerId, userId, db) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Create the smart bar
  const smartBar = document.createElement("div");
  smartBar.className = "smart-bar";
  smartBar.style.position = "relative";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Select location source...";

  smartBar.appendChild(input);
  container.appendChild(smartBar);

  // Load location sources from user's data
  db.collection("things")
    .where("userId", "==", userId)
    .where("isLocationSource", "==", true)
    .get()
    .then(snapshot => {
      if (!snapshot.empty) {
        const dropdown = document.createElement("select");
        const defaultOpt = document.createElement("option");
        defaultOpt.text = "Select from saved location sources...";
        dropdown.appendChild(defaultOpt);

        snapshot.forEach(doc => {
          const data = doc.data();
          const opt = document.createElement("option");
          opt.value = JSON.stringify({ lat: data.lat, long: data.long });
          opt.text = data.name + ` (${data.locationSource || 'GPS'})`;
          dropdown.appendChild(opt);
        });

        dropdown.onchange = () => {
          try {
            const value = JSON.parse(dropdown.value);
            selectedLocation = value;
            input.value = `https://maps.google.com/?q=${value.lat},${value.long}`;
          } catch {}
        };

        container.insertBefore(dropdown, smartBar);
      }
    });
}

function getSelectedLocation() {
  return selectedLocation;
}

// ✅ Export to window scope so HTML pages can access it
window.loadLocationPicker = loadLocationPicker;
window.getSelectedLocation = getSelectedLocation;
