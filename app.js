// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAatek1caogYhCY0rXj9YrGC32E0lRJtUs",
  authDomain: "whereapp-ideasdesai.firebaseapp.com",
  projectId: "whereapp-ideasdesai"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

function logError(msg) {
  console.error(msg);
  const debugLog = document.getElementById("debug-log");
  if (debugLog) debugLog.textContent = msg;
}

function addDetail() {
  const container = document.getElementById("details-container");
  const div = document.createElement("div");
  div.innerHTML = `<input placeholder="Key" type="text"><textarea placeholder="Value"></textarea>`;
  container.appendChild(div);
}

function addMediaLink() {
  const container = document.getElementById("media-container");
  const div = document.createElement("div");
  div.innerHTML = `<input type="url" placeholder="Add link to image or file">`;
  container.appendChild(div);
}

let userId = null;
window.addEventListener('DOMContentLoaded', () => {
  auth.signInAnonymously().then(res => {
    userId = res.user.uid;
    initPage();
  });
});

function initPage() {
  const path = window.location.pathname;
  const page = path.split("/").pop();
  if (page === "" || page === "index.html" || path.endsWith("/kohthai/")) {
    initIndex();
  } else if (page === "add.html") {
    initAdd();
  } else if (page === "edit.html") {
    initEdit();
  } else if (page === "search.html") {
    initSearch();
  }
}

// ---- INDEX PAGE FUNCTIONS ----
function initIndex() {
  fetchThings();
  loadApps();
  document.getElementById('searchInput')?.addEventListener('input', renderThings);
}

let allThings = [];
let score = 0;
let currentLat = null;
let currentLong = null;

async function fetchThings() {
  const snapshot = await db.collection("things").get();
  allThings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  renderThings();
}

function renderThings() {
  const query = document.getElementById('searchInput')?.value.toLowerCase();
  const container = document.getElementById('thingsList');
  if (!container) return;
  container.innerHTML = '';

  const filtered = allThings.filter(t => {
    const nameMatch = t.name?.toLowerCase().includes(query);
    const flexMatch = (Array.isArray(t.flexibutes)
      ? t.flexibutes
      : Object.entries(t.flexibutes || {}).map(([key, val]) => ({ key, val }))
    ).some(({ key, val }) => key.toLowerCase().includes(query) || val.toLowerCase().includes(query));
    return nameMatch || flexMatch;
  });

  if (filtered.length === 0) {
    container.innerHTML = '<p style="color:#aaa">No matching things found.</p>';
    return;
  }

  filtered.forEach(thing => {
    const div = document.createElement('div');
    div.className = 'thing';

    const mediaImages = (thing.media || [])
      .filter(m => m.includes("http"))
      .map(m => `<img src="${m}" class="media-img">`)
      .join('');

    const details = Array.isArray(thing.flexibutes)
      ? thing.flexibutes.map(({ key, val }) => `<p><strong>${key}:</strong> ${val}</p>`).join('')
      : Object.entries(thing.flexibutes || {}).map(([k, v]) => `<p><strong>${k}:</strong> ${v}</p>`).join('');

    const locationText = thing.location?.lat && thing.location?.long
      ? `${thing.location?.source || 'device'} (${thing.location.lat}, ${thing.location.long})`
      : 'Unknown';

    div.innerHTML = `
      <span class="tag ${thing.visibility || 'private'}">${thing.visibility || 'private'}</span><br>
      <h3>${thing.name || 'Untitled Thing'}</h3>
      ${mediaImages}<br>
      ${details}
      <p><strong>Location:</strong> ${locationText}</p>
      <p><strong>Visibility:</strong> ${thing.visibility || 'private'}</p>
      <button class="edit-btn" onclick="location.href='edit.html?id=${thing.id}'">✏️ Edit</button>
    `;

    const toggle = document.createElement('button');
    toggle.className = 'toggle-btn';
    toggle.textContent = 'More';
    toggle.onclick = () => {
      div.classList.toggle('expanded');
      toggle.textContent = div.classList.contains('expanded') ? 'Less' : 'More';
    };
    div.appendChild(toggle);

    container.appendChild(div);
  });
}

function loadApps() {
  const files = ["owl", "unicorn", "hello"];
  Promise.all(
    files.map(async id => {
      const res = await fetch(`apps/${id}.json`);
      return await res.json();
    })
  ).then(renderButtons);
}

function renderButtons(apps) {
  const container = document.getElementById("buttons");
  if (!container) return;
  container.innerHTML = "";
  apps.forEach(app => {
    const btn = document.createElement("button");
    btn.textContent = app.label;
    btn.onclick = () => {
      const run = () => {
        score += app.score;
        updateScoreDisplay();
      };
      run();
    };
    container.appendChild(btn);
  });
}

function updateScoreDisplay() {
  const el = document.getElementById("score");
  if (el) el.innerText = `Score: ${score}`;
}

// ---- SUPPORT ----
function getSelectedLocation() {
  const select = document.getElementById("locationSourceSelect");
  if (!select || !select.value) return null;
  const selected = allThings.find(t => t.id === select.value);
  return selected?.location || null;
}

function searchThings() {
  const query = document.getElementById("search-box")?.value.trim().toLowerCase();
  const resultsContainer = document.getElementById("search-results");
  if (!query || !resultsContainer) return;
  db.collection("things")
    .where("userId", "==", userId)
    .get()
    .then(snapshot => {
      const filtered = snapshot.docs.filter(doc => doc.data().name?.toLowerCase().includes(query));
      resultsContainer.innerHTML = filtered.length
        ? filtered.map(doc => `<div class='search-result'><strong>${doc.data().name}</strong><br><button onclick="location.href='edit.html?id=${doc.id}'">Edit</button></div>`).join('')
        : '<p>No match found.</p>';
    });
}

function initAdd() {
  console.log("🔧 initAdd() running...");

  try {
    document.getElementById("search-box")?.addEventListener("input", () => {
      console.log("🔍 Search input triggered");
      searchThings();
    });

    document.getElementById("isLocationSource")?.addEventListener("change", () => {
      console.log("📍 Location Source toggled");
      toggleDropdownState();
    });

    document.getElementById("addDetailBtn")?.addEventListener("click", () => {
      console.log("➕ Add Detail clicked");
      addDetail();
    });

    document.getElementById("addMediaBtn")?.addEventListener("click", () => {
      console.log("🖼️ Add Media clicked");
      addMediaLink();
    });

    document.getElementById("submitBtn")?.addEventListener("click", () => {
      console.log("🚀 Submit clicked");
      submitThing();
    });

    window.loadLocationPickerIfReady?.("location-section", userId, db);
    console.log("📍 Invoked loadLocationPickerIfReady()");

    populateLocationSourceDropdown(() => {
      console.log("📄 Location source dropdown populated");
    });

  } catch (err) {
    logError("💥 Error in initAdd: " + err.message);
  }
  document.getElementById("search-box")?.addEventListener("input", searchThings);
  document.getElementById("isLocationSource")?.addEventListener("change", toggleDropdownState);
  document.getElementById("addDetailBtn")?.addEventListener("click", addDetail);
  document.getElementById("addMediaBtn")?.addEventListener("click", addMediaLink);
  document.getElementById("submitBtn")?.addEventListener("click", submitThing);
  window.loadLocationPickerIfReady?.("location-section", userId, db);
  populateLocationSourceDropdown();
}

function initEdit() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if (!id) return;

  const dropdown = document.getElementById("locationSourceSelect");
  if (dropdown) dropdown.disabled = false;
  populateLocationSourceDropdown(() => {
    db.collection("things").doc(id).get().then(doc => {
      if (!doc.exists) return alert("Thing not found");

      const thing = doc.data();
      document.getElementById("thing-name").value = thing.name || "";
      document.getElementById("thing-visibility").value = thing.visibility || "private";
      document.getElementById("isLocationSource").checked = !!thing.isLocationSource;
      document.getElementById("allowCopy").checked = !!thing.copy;

      if (!thing.isLocationSource && thing.location?.source && thing.location?.lat && thing.location?.long) {
        const locSourceSelect = document.getElementById("locationSourceSelect");
        const matched = [...locSourceSelect.options].find(opt => opt.textContent.includes(thing.location.source));
        if (matched) locSourceSelect.value = matched.value;
      }

      const details = Array.isArray(thing.flexibutes)
        ? thing.flexibutes
        : Object.entries(thing.flexibutes || {}).map(([key, val]) => ({ key, val }));

      const detailsContainer = document.getElementById("details-container");
      details.forEach(({ key, val }) => {
        const div = document.createElement("div");
        div.innerHTML = `<input placeholder="Key" type="text" value="${key}"><textarea placeholder="Value">${val}</textarea>`;
        detailsContainer.appendChild(div);
      });

      const mediaContainer = document.getElementById("media-container");
      (thing.media || []).forEach(link => {
        const div = document.createElement("div");
        div.innerHTML = `<input type="url" value="${link}" placeholder="Add link to image or file">`;
        mediaContainer.appendChild(div);
      });

      document.getElementById("saveBtn").onclick = () => saveChanges(id);
      document.getElementById("deleteBtn").onclick = () => deleteThing(id);
    });
  });
}

function populateLocationSourceDropdown(callback) {
  const select = document.getElementById("locationSourceSelect");
  if (!select) return;
  select.innerHTML = '<option value="">Select from saved location sources...</option>';

  db.collection("things")
    .where("userId", "==", userId)
    .where("isLocationSource", "==", true)
    .get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        const option = document.createElement("option");
        option.value = doc.id;
        option.textContent = doc.data().name || "Unnamed Thing";
        select.appendChild(option);
      });
      if (typeof callback === "function") callback();
    });
}

function toggleDropdownState() {
  const dropdown = document.getElementById("locationSourceSelect");
  const isSource = document.getElementById("isLocationSource").checked;
  if (dropdown) dropdown.disabled = isSource;
}

function initSearch() {
  fetchThings();
  document.getElementById("searchInput")?.addEventListener("input", renderThings);
}

function saveChanges(id) {
  const name = document.getElementById("thing-name").value.trim();
  const visibility = document.getElementById("thing-visibility").value;
  const isLocationSource = document.getElementById("isLocationSource").checked;
  const isCopyAllowed = document.getElementById("allowCopy").checked;

  const details = [...document.querySelectorAll("#details-container > div")].map(div => {
    const [k, v] = div.querySelectorAll("input,textarea");
    return { key: k.value.trim(), val: v.value.trim() };
  }).filter(kv => kv.key && kv.val);

  const media = [...document.querySelectorAll("#media-container input")].map(input => input.value.trim()).filter(Boolean);

  const location = isLocationSource
    ? { lat: 0, long: 0, source: 'device' }
    : getSelectedLocation();

  const updatedThing = {
    name,
    visibility,
    isLocationSource,
    flexibutes: details,
    media,
    userId,
    copy: isCopyAllowed,
    location,
    updatedAt: new Date().toISOString()
  };

  db.collection("things").doc(id).set(updatedThing).then(() => {
    alert("✅ Thing updated successfully!");
    window.location.href = "index.html";
  }).catch(err => {
    console.error("Error updating thing:", err);
    alert("❌ Failed to update thing.");
  });
}

function deleteThing(id) {
  if (!confirm("Are you sure you want to delete this Thing?")) return;
  db.collection("things").doc(id).delete().then(() => {
    alert("🗑️ Thing deleted successfully!");
    window.location.href = "index.html";
  }).catch(err => {
    console.error("Error deleting thing:", err);
    alert("❌ Failed to delete thing.");
  });
}
