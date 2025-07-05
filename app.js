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
        logToFirestore(app.id, app.score);

        if (app.whatsappMessage) {
          let message = app.whatsappMessage
            .replace("{{score}}", score)
            .replace("{{lat}}", currentLat)
            .replace("{{long}}", currentLong);

          if (message.includes("{{mapLink}}")) {
            const mapUrl = `https://maps.google.com/?q=${currentLat},${currentLong}`;
            message = message.replace("{{mapLink}}", mapUrl);
          }

          const encoded = encodeURIComponent(message);
          window.open(`https://wa.me/?text=${encoded}`);
          logAction(`${app.label} shared on WhatsApp.`);
        } else {
          logAction(`${app.label} clicked. (+${app.score}) at ${currentLat}, ${currentLong}`);
        }
      };

      if (app.useLocation) {
        getLocation(run);
      } else {
        run();
      }
    };
    container.appendChild(btn);
  });
}

function updateScoreDisplay() {
  const el = document.getElementById("score");
  if (el) el.innerText = `Score: ${score}`;
}

function getLocation(callback) {
  if (!navigator.geolocation) {
    alert("Geolocation not supported");
    return;
  }
  navigator.geolocation.getCurrentPosition(pos => {
    currentLat = pos.coords.latitude.toFixed(5);
    currentLong = pos.coords.longitude.toFixed(5);
    callback();
  }, err => {
    alert("Location access denied.");
  });
}

function logAction(action) {
  const logDiv = document.getElementById("log");
  const timestamp = new Date().toLocaleTimeString();
  if (logDiv) logDiv.innerHTML += `[${timestamp}] ${action}<br>`;
}

function logToFirestore(appId, scoreDelta) {
  db.collection("interactions").add({
    userId: userId,
    appId: appId,
    scoreAdded: scoreDelta,
    lat: currentLat,
    long: currentLong,
    timestamp: new Date()
  }).catch(console.error);
}

// ---- SEARCH PAGE FUNCTIONS ----
function initSearch() {
  const input = document.getElementById("searchInput");
  const container = document.getElementById("results");
  if (!input || !container) return;

  let allUserThings = [];

  async function loadAndRenderAll() {
    const snapshot = await db.collection("things").where("userId", "==", userId).get();
    allUserThings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderSearchResults();
  }

  function renderSearchResults() {
    const query = input.value.trim().toLowerCase();
    const matches = allUserThings.filter(t => t.name?.toLowerCase().includes(query));

    container.innerHTML = matches.length
      ? matches.map(t => `<div class='search-result'>${t.name}</div>`).join('')
      : "<p>No results found.</p>";
  }

  input.addEventListener("input", renderSearchResults);
  loadAndRenderAll();
}

// ---- ADD PAGE FUNCTIONS ----
function initAdd() {
  const searchBox = document.getElementById("search-box");
  if (searchBox) {
    searchBox.addEventListener("input", searchThings);
  }
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
  return (typeof window.getSelectedLocation === 'function') ? window.getSelectedLocation() : null;
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
