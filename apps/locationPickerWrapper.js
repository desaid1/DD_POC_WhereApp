// apps/locationPickerWrapper.js
window.loadLocationPickerIfReady = function (targetDivId, userId, db) {
  const script = document.createElement('script');
  script.src = 'apps/locationPicker.js';
  script.onload = () => {
    if (typeof loadLocationPicker === 'function') {
      loadLocationPicker(targetDivId, userId, db);
    }
  };
  document.body.appendChild(script);
};
