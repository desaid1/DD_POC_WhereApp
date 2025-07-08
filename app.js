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
  const query = document.getElementById("search-box").value.trim().toLowerCase();
  const resultsContainer = document.getElementById("search-results");
  if (!query) return (resultsContainer.innerHTML = "");

  db.collection("things")
    .where("userId", "==", userId)
    .get()
    .then(snapshot => {
      const filtered = snapshot.docs.filter(doc => doc.data().name?.toLowerCase().includes(query));
      resultsContainer.innerHTML = filtered.length
        ? filtered.map(doc => `<div class='search-result'><strong>${doc.data().name}</strong><br><button onclick=\"location.href='edit.html?id=${doc.id}'\">Edit</button></div>`).join('')
        : '<p>No match found.</p>';
    });
}

function initAdd() {
  document.getElementById("search-box")?.addEventListener("input", searchThings);
  document.getElementById("isLocationSource")?.addEventListener("change", toggleDropdownState);
  window.loadLocationPickerIfReady?.("location-section", userId, db);
  populateLocationSourceDropdown();

  document.querySelector("button[onclick='addDetail()']")?.addEventListener("click", addDetail);
  document.querySelector("button[onclick='addMediaLink()']")?.addEventListener("click", addMediaLink);
}

function addDetail() {
  const container = document.getElementById("details-container");
  const div = document.createElement("div");
  div.innerHTML = `<input placeholder="Key" type="text"><textarea placeholder="Value"></textarea>`;
  container.appendChild(div);
}

function addMediaLink() {
  const container = document.getElementById("media-container");
  const input = document.createElement("input");
  input.placeholder = "Add link to image or file";
  input.type = "url";
  container.appendChild(input);
}

function toggleDropdownState() {
  const isChecked = document.getElementById("isLocationSource")?.checked;
  const dropdown = document.getElementById("locationSourceSelect");
  if (!dropdown) return;
  dropdown.disabled = isChecked;
}

async function submitThing() {
  const name = document.getElementById('thing-name').value.trim();
  const visibility = document.getElementById('thing-visibility').value;
  const allowCopy = document.getElementById('allowCopy').checked;
  const isLocationSource = document.getElementById('isLocationSource').checked;

  const flexibutes = Array.from(document.querySelectorAll('#details-container > div')).map(div => {
    const key = div.querySelector('input').value.trim();
    const val = div.querySelector('textarea').value.trim();
    return key ? { key, val } : null;
  }).filter(Boolean);

  const media = Array.from(document.querySelectorAll('#media-container input')).map(inp => inp.value.trim()).filter(Boolean);

  let location = null;
  if (isLocationSource && typeof window.getPickedLocation === 'function') {
    location = window.getPickedLocation();
  } else {
    location = getSelectedLocation();
  }

  const payload = {
    userId,
    name,
    visibility,
    allowCopy,
    isLocationSource,
    flexibutes,
    media,
    location,
    created: firebase.firestore.FieldValue.serverTimestamp(),
  };

  try {
    await db.collection('things').add(payload);
    alert('Saved successfully!');
    window.location.href = 'index.html';
  } catch (err) {
    console.error('Error adding thing:', err);
    alert('Failed to save. See console for details.');
  }
}

window.submitThing = submitThing;

async function deleteThing() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if (!id) return alert("No Thing ID found in URL.");
  const confirmed = confirm("Are you sure you want to delete this Thing?");
  if (!confirmed) return;
  try {
    await db.collection("things").doc(id).delete();
    alert("Thing deleted.");
    window.location.href = "index.html";
  } catch (err) {
    console.error("Error deleting thing:", err);
    alert("Failed to delete. See console for details.");
  }
}

window.deleteThing = deleteThing;
