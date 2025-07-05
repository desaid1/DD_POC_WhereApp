// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAatek1caogYhCY0rXj9YrGC32E0lRJtUs",
  authDomain: "whereapp-ideasdesai.firebaseapp.com",
  projectId: "whereapp-ideasdesai"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let userId = null;
window.addEventListener('DOMContentLoaded', () => {
  auth.signInAnonymously().then(res => {
    userId = res.user.uid;
    initPage();
  });
});

function initPage() {
  const path = window.location.pathname;
  if (path.includes("index")) {
    initIndex();
  } else if (path.includes("add")) {
    initAdd();
  } else if (path.includes("edit")) {
    initEdit();
  }
}

// ---- EDIT PAGE FUNCTIONS ----
function initEdit() {
  const id = new URLSearchParams(window.location.search).get("id");
  if (!id) return alert("No ID provided.");

  const nameInput = document.getElementById("thing-name");
  const visibilitySelect = document.getElementById("thing-visibility");
  const isLocationSourceCheckbox = document.getElementById("isLocationSource");
  const allowCopyCheckbox = document.getElementById("allowCopy");
  const flexContainer = document.getElementById("flexibutes-container");
  const mediaContainer = document.getElementById("media-container");
  const locationSection = document.getElementById("location-section");

  if (typeof window.loadLocationPickerIfReady === 'function') {
    window.loadLocationPickerIfReady("location-section", userId, db, id);
  }

  db.collection("things").doc(id).get().then(doc => {
    if (!doc.exists) return alert("Thing not found.");
    const thing = doc.data();

    nameInput.value = thing.name || "";
    visibilitySelect.value = thing.visibility || "private";
    isLocationSourceCheckbox.checked = !!thing.isLocationSource;
    allowCopyCheckbox.checked = !!thing.copy;

    const details = Array.isArray(thing.flexibutes)
      ? thing.flexibutes
      : Object.entries(thing.flexibutes || {}).map(([key, val]) => ({ key, val }));
    details.forEach(({ key, val }) => {
      const div = document.createElement("div");
      div.innerHTML = `<input placeholder="Key" type="text" value="${key}"><textarea placeholder="Value">${val}</textarea>`;
      flexContainer.appendChild(div);
    });

    (thing.media || []).forEach(link => {
      const div = document.createElement("div");
      div.innerHTML = `<input type="url" value="${link}" placeholder="Add link to image or file">`;
      mediaContainer.appendChild(div);
    });
  });

  document.getElementById("save-btn").onclick = () => {
    const name = nameInput.value.trim();
    const visibility = visibilitySelect.value;
    const isLocationSource = isLocationSourceCheckbox.checked;
    const isCopyAllowed = allowCopyCheckbox.checked;

    if (!name) return alert("Please enter a name.");

    const details = [...flexContainer.children].map(div => {
      const [k, v] = div.querySelectorAll("input,textarea");
      return { key: k.value.trim(), val: v.value.trim() };
    }).filter(kv => kv.key && kv.val);

    const media = [...mediaContainer.querySelectorAll("input")].map(input => input.value.trim()).filter(Boolean);

    const location = isLocationSource
      ? { lat: 0, long: 0, source: 'device' }
      : (typeof window.getSelectedLocation === 'function' ? window.getSelectedLocation() : null);

    const updateDoc = loc => {
      db.collection("things").doc(id).update({
        name,
        visibility,
        isLocationSource,
        location: loc,
        flexibutes: details,
        media,
        copy: isCopyAllowed
      }).then(() => {
        alert("✅ Thing updated!");
        location.href = "index.html";
      }).catch(err => {
        console.error("Update failed:", err);
        alert("❌ Update failed.");
      });
    };

    if (isLocationSource) {
      navigator.geolocation.getCurrentPosition(pos => {
        updateDoc({
          lat: pos.coords.latitude.toFixed(5),
          long: pos.coords.longitude.toFixed(5),
          source: 'device'
        });
      }, () => alert("Location access denied."));
    } else {
      updateDoc(location);
    }
  };

  document.getElementById("delete-btn").onclick = () => {
    if (!confirm("Are you sure you want to delete this Thing?")) return;
    db.collection("things").doc(id).delete().then(() => {
      alert("🗑️ Thing deleted.");
      location.href = "index.html";
    }).catch(err => {
      console.error("Delete failed:", err);
      alert("❌ Delete failed.");
    });
  };

  document.querySelector("button[onclick^='addFlexibute']")?.addEventListener("click", () => {
    const div = document.createElement("div");
    div.innerHTML = `<input placeholder="Key" type="text"><textarea placeholder="Value"></textarea>`;
    flexContainer.appendChild(div);
  });

  document.querySelector("button[onclick^='addMediaLink']")?.addEventListener("click", () => {
    const div = document.createElement("div");
    div.innerHTML = `<input placeholder="Add link to image or file" type="url">`;
    mediaContainer.appendChild(div);
  });
}
