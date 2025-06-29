// apps/locationPicker.js
let selectedLocation = null;

function loadLocationPicker(containerId, userId, db) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Create the smart bar
  const smartBar = document.createElement("div");
  smartBar.className = "smart-bar";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Paste Google Maps link or pick source...";

  const qrIcon = document.createElement("span");
  qrIcon.className = "qr-icon";
  qrIcon.innerHTML = "📷";
  qrIcon.title = "QR Scan (coming soon)";

  qrIcon.onclick = () => {
    alert("QR Scan feature coming soon!");
  };

  smartBar.appendChild(input);
  smartBar.appendChild(qrIcon);
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

  input.addEventListener("input", () => {
    const url = input.value.trim();
    const match = url.match(/maps\.google\.com\/\?q=([-+\d\.]+),([-+\d\.]+)/);
    if (match) {
      selectedLocation = {
        lat: parseFloat(match[1]),
        long: parseFloat(match[2]),
        source: "manual"
      };
    }
  });
}

function getSelectedLocation() {
  return selectedLocation;
}
