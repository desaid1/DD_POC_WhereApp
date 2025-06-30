// locationPickerWrapper.js
// Reusable loader for location picker across pages

export function loadLocationPickerIfReady(containerId, userId, db) {
  if (typeof window.loadLocationPicker === 'function') {
    window.loadLocationPicker(containerId, userId, db);
  } else {
    const script = document.createElement('script');
    script.src = 'apps/locationPicker.js';
    script.onload = () => {
      if (typeof window.loadLocationPicker === 'function') {
        window.loadLocationPicker(containerId, userId, db);
      } else {
        console.warn('loadLocationPicker function not found after script load.');
      }
    };
    document.body.appendChild(script);
  }
}

// To use in your HTML file (after Firebase setup and userId obtained):
// import { loadLocationPickerIfReady } from './apps/locationPickerWrapper.js';
// loadLocationPickerIfReady("location-section", userId, db);
