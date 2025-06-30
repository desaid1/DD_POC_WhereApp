// apps/locationPicker.js
(function () {
  let selectedLocation = null;

  window.getSelectedLocation = function () {
    return selectedLocation;
  };

  window.loadLocationPicker = function (targetDivId, userId, db) {
    const container = document.getElementById(targetDivId);
    if (!container) return;

    const dropdown = document.createElement('select');
    dropdown.innerHTML = `<option>Select from saved location sources...</option>`;
    container.appendChild(dropdown);

    // Load saved locations from DB
    db.collection("things")
      .where("userId", "==", userId)
      .where("isLocationSource", "==", true)
      .get()
      .then(snapshot => {
        snapshot.forEach(doc => {
          const thing = doc.data();
          const option = document.createElement('option');
          option.value = JSON.stringify(thing.location);
          option.textContent = `${thing.name} (${thing.location.source})`;
          dropdown.appendChild(option);
        });
      });

    dropdown.addEventListener('change', () => {
      try {
        selectedLocation = JSON.parse(dropdown.value);
      } catch (e) {
        selectedLocation = null;
      }
    });

    // Optionally set current location from device
    navigator.geolocation.getCurrentPosition(pos => {
      selectedLocation = {
        lat: pos.coords.latitude.toFixed(5),
        long: pos.coords.longitude.toFixed(5),
        source: 'device'
      };
    });
  };
})();
