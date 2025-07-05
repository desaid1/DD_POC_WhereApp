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
  if (path === "/" || path.endsWith("index.html") || path.endsWith("/kohthai/")) {
    initIndex();
  } else if (path.includes("add")) {
    initAdd();
  } else if (path.includes("edit")) {
    initEdit();
  }
}

// ---- INDEX PAGE FUNCTIONS ----
function initIndex() {
  fetchThings();
  loadApps();
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
