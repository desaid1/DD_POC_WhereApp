// apps/locationPickerWrapper.js
window.loadLocationPickerIfReady = function (targetDivId, userId, db) {
  if (typeof window.loadLocationPicker !== 'function') {
    const script = document.createElement('script');
    script.src = 'apps/locationPicker.js?v=20250630';  // <-- cache bust
    script.onload = () => {
      if (typeof window.loadLocationPicker === 'function') {
        window.loadLocationPicker(targetDivId, userId, db);
      }
    };
    document.body.appendChild(script);
  } else {
    window.loadLocationPicker(targetDivId, userId, db);
  }
};
