// apps/locationPicker.js
let selectedLocation = null;

function loadLocationPicker(containerId, userId, db) {
  const container = document.getElementById(containerId);
  if (!container) return;

  console.log("📌 Location Picker: Initializing with userId:", userId);

  // Wrapper for styling
  const wrapper = document.createElement("div");
  wrapper.style.display = "flex";
  wrapper.style.flexDirection = "column";
  wrapper.style.gap = "10px";

  // Dropdown
  const dropdown = document.createElement("select");
  dropdown.style.padding = "10px";
  dropdown.style.fontSize = "16px";
  dropdown.style.borderRadius = "6px";
  dropdown.style.border = "1px solid #ccc";

  const defaultOpt = document.createElement("option");
  defaultOpt.text = "Select from saved location sources...";
  dropdown.appendChild(defaultOpt);

  // Input box (readonly)
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Selected location will appear here...";
  input.readOnly = true;
  input.style.padding = "10px";
  input.style.fontSize = "16px";
  input.style.borderRadius = "6px";
  input.style.border = "1px solid #ccc";
  input.style.backgroundColor = "#f9f9f9";

  // Load location sources from Firestore
  db.collection("things")
    .where("userId", "==", userId)
    .where("isLocationSource", "==", true)
    .get()
    .then(snapshot => {
      console.log("📌 Location Picker: Query completed. Docs found:", snapshot.size);
      if (!snapshot.empty) {
        snapshot.forEach(doc => {
          const data = doc.data();
          console.log("📌 Found location source:", data.name);
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
          } catch (e) {
            console.error("❌ Failed to parse location source:", e);
          }
        };

        wrapper.appendChild(dropdown);
        wrapper.appendChild(input);
        container.appendChild(wrapper);
      } else {
        console.warn("⚠️ No location sources found for user:", userId);
        const message = document.createElement("div");
        message.style.color = "#b00";
        message.style.marginTop = "10px";
        message.textContent = "⚠️ No location sources found. Please add one first.";
        container.appendChild(message);
      }
    })
    .catch(error => {
      console.error("❌ Error loading location sources:", error);
      const errorMsg = document.createElement("div");
      errorMsg.style.color = "#b00";
      errorMsg.style.marginTop = "10px";
      errorMsg.textContent = "❌ Failed to load location sources. See console for details.";
      container.appendChild(errorMsg);
    });
}

function getSelectedLocation() {
  return selectedLocation;
}

// ✅ Export to window scope so HTML pages can access it
window.loadLocationPicker = loadLocationPicker;
window.getSelectedLocation = getSelectedLocation;
