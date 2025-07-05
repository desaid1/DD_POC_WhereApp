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

    div.innerHTML = `
      <span class="tag ${thing.visibility || 'private'}">${thing.visibility || 'private'}</span><br>
      <h3>${thing.name || 'Untitled Thing'}</h3>
      ${mediaImages}<br>
      ${details}
      <p><strong>Location:</strong> ${thing.location?.source || 'Unknown'} (${thing.location?.lat}, ${thing.location?.long})</p>
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

// ---- ADD PAGE FUNCTIONS ----
function initAdd() {
  document.getElementById("search-box")?.addEventListener("input", searchThings);
  document.getElementById("isLocationSource")?.addEventListener("change", toggleDropdownState);
  window.loadLocationPickerIfReady?.("location-section", userId, db);
}

function searchThings() {
  const query = document.getElementById("search-box").value.trim().toLowerCase();
  const resultsContainer = document.getElementById("search-results");
  if (!query) return (resultsContainer.innerHTML = "");

  db.collection("things")
    .where("userId", "==", userId)
    .get()
    .then(snapshot => {
      const filtered = snapshot.docs.filter(doc => doc.data().name?.toLowerCase().includes(query));
      resultsContainer.innerHTML = filtered.length
        ? filtered.map(doc => `<div class='search-result'><strong>${doc.data().name}</strong><br><button onclick=\"window.location.href='edit.html?id=${doc.id}'\">Edit</button></div>`).join('')
        : '<p>No match found.</p>';
    });
}

function addDetail() {
  const container = document.getElementById('details-container');
  const div = document.createElement('div');
  div.innerHTML = `<input placeholder="Key" type="text"><textarea placeholder="Value"></textarea>`;
  container.appendChild(div);
}

function addMediaLink() {
  const container = document.getElementById('media-container');
  const div = document.createElement('div');
  div.innerHTML = `<input placeholder="Add link to image or file" type="url">`;
  container.appendChild(div);
}

function toggleDropdownState() {
  const dropdown = document.getElementById("locationSourceSelect");
  const isSource = document.getElementById("isLocationSource").checked;
  if (dropdown) dropdown.disabled = isSource;
}

function getSelectedLocation() {
  const dropdown = document.getElementById("locationSourceSelect");
  try {
    return dropdown && dropdown.value ? JSON.parse(dropdown.value) : null;
  } catch {
    return null;
  }
}

function submitThing() {
  const name = document.getElementById('thing-name').value.trim();
  const visibility = document.getElementById('thing-visibility').value;
  const isLocationSource = document.getElementById('isLocationSource').checked;
  const isCopyAllowed = document.getElementById('allowCopy').checked;

  if (!name) return alert("Please enter a name.");
  if (!userId) return alert("User not signed in yet.");

  const details = [...document.querySelectorAll('#details-container > div')].map(div => {
    const [k, v] = div.querySelectorAll('input,textarea');
    return { key: k.value.trim(), val: v.value.trim() };
  }).filter(kv => kv.key && kv.val);

  const media = [...document.querySelectorAll('#media-container input')].map(input => input.value.trim()).filter(Boolean);

  const location = isLocationSource
    ? { lat: 0, long: 0, source: 'device' }
    : getSelectedLocation();

  if (isLocationSource) {
    navigator.geolocation.getCurrentPosition(pos => {
      storeThing({
        lat: pos.coords.latitude.toFixed(5),
        long: pos.coords.longitude.toFixed(5),
        source: 'device'
      });
    }, () => alert("Location access denied."));
  } else {
    storeThing(location);
  }

  function storeThing(location) {
    const thing = {
      name,
      visibility,
      isLocationSource,
      location,
      flexibutes: details,
      media,
      userId,
      copy: isCopyAllowed,
      createdAt: new Date().toISOString()
    };

    db.collection("things").add(thing).then(() => {
      alert("✅ Thing added successfully!");
      window.location.href = "index.html";
    }).catch(err => {
      console.error("Error adding thing:", err);
      alert("❌ Failed to add thing.");
    });
  }
}

// ---- SEARCH PAGE ----
function initSearch() {
  fetchThings();
  document.getElementById("searchInput")?.addEventListener("input", renderThings);
}

// ---- EDIT PAGE FUNCTIONS ----
function initEdit() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if (!id) return;

  db.collection("things").doc(id).get().then(doc => {
    if (!doc.exists) return alert("Thing not found");

    const thing = doc.data();
    document.getElementById("thing-name").value = thing.name || "";
    document.getElementById("thing-visibility").value = thing.visibility || "private";
    document.getElementById("isLocationSource").checked = !!thing.isLocationSource;
    document.getElementById("allowCopy").checked = !!thing.copy;

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

    // ✅ Load location sources and preselect current
    const dropdown = document.getElementById("locationSourceSelect");
    if (dropdown) {
      db.collection("things")
        .where("userId", "==", userId)
        .where("isLocationSource", "==", true)
        .get()
        .then(snapshot => {
          snapshot.forEach(doc => {
            const locThing = doc.data();
            const option = document.createElement("option");
            option.value = JSON.stringify({
              lat: locThing.location?.lat,
              long: locThing.location?.long,
              source: locThing.name || "Unknown"
            });
            option.textContent = `${locThing.name} (${locThing.location?.lat}, ${locThing.location?.long})`;
            dropdown.appendChild(option);
          });

          if (thing.location?.source !== "device" && dropdown.options.length > 0) {
            for (let opt of dropdown.options) {
              if (opt.value.includes(thing.location?.lat) && opt.value.includes(thing.location?.long)) {
                opt.selected = true;
                break;
              }
            }
          }
        });
    }

    document.getElementById("saveBtn").onclick = () => saveChanges(id);
    document.getElementById("deleteBtn").onclick = () => deleteThing(id);
  });
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
    location,
    flexibutes: details,
    media,
    userId,
    copy: isCopyAllowed,
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
