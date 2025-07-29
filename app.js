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

function initEdit() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if (!id) return alert("Missing Thing ID");

  db.collection("things").doc(id).get().then(doc => {
    if (!doc.exists) return alert("Thing not found");
    const data = doc.data();

    document.getElementById("thing-name").value = data.name || "";
    document.getElementById("thing-visibility").value = data.visibility || "private";
    document.getElementById("allowCopy").checked = !!data.allowCopy;
    document.getElementById("isLocationSource").checked = !!data.isLocationSource;

    const detailsContainer = document.getElementById("details-container");
    detailsContainer.innerHTML = "";
    const details = Array.isArray(data.flexibutes) ? data.flexibutes : Object.entries(data.flexibutes || {}).map(([key, val]) => ({ key, val }));
    details.forEach(({ key, val }) => {
      const div = document.createElement("div");
      div.innerHTML = `<input type="text" value="${key}" placeholder="Key"><textarea placeholder="Value">${val}</textarea>`;
      detailsContainer.appendChild(div);
    });

    const mediaContainer = document.getElementById("media-container");
    mediaContainer.innerHTML = "";
    (data.media || []).forEach(url => {
      const input = document.createElement("input");
      input.type = "url";
      input.value = url;
      input.placeholder = "Link to image or file (e.g. https://...)";
      mediaContainer.appendChild(input);
    });

    window.loadLocationPickerIfReady?.("location-section", userId, db, data.location);
    populateLocationSourceDropdown(data.location?.sourceId || "");
  });

  document.getElementById("saveBtn")?.addEventListener("click", async () => {
    const name = document.getElementById("thing-name").value.trim();
    const visibility = document.getElementById("thing-visibility").value;
    const allowCopy = document.getElementById("allowCopy").checked;
    const isLocationSource = document.getElementById("isLocationSource").checked;

    const flexibutes = Array.from(document.querySelectorAll("#details-container > div")).map(div => {
      const key = div.querySelector("input").value.trim();
      const val = div.querySelector("textarea").value.trim();
      return key ? { key, val } : null;
    }).filter(Boolean);

    const media = Array.from(document.querySelectorAll("#media-container input")).map(inp => inp.value.trim()).filter(Boolean);

    let location = null;
    if (isLocationSource && typeof window.getPickedLocation === 'function') {
      location = window.getPickedLocation();
    } else {
      location = getSelectedLocation();
    }

    try {
      await db.collection("things").doc(id).update({
        name,
        visibility,
        allowCopy,
        isLocationSource,
        flexibutes,
        media,
        location
      });
      alert("Changes saved.");
      window.location.href = "index.html";
    } catch (err) {
      console.error("Failed to save:", err);
      alert("Save failed. Check console.");
    }
  });

  document.querySelector("button[onclick='addDetail()']")?.addEventListener("click", addDetail);
  document.querySelector("button[onclick='addMediaLink()']")?.addEventListener("click", addMediaLink);
  document.getElementById("deleteBtn")?.addEventListener("click", deleteThing);
}

function populateLocationSourceDropdown(selectedId = "") {
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
        if (doc.id === selectedId) option.selected = true;
        select.appendChild(option);
      });
    });
}

// Advanced search for things by name or flexibutes
async function searchThings() {
  const query = document.getElementById('search-box').value.trim().toLowerCase();
  const resultsDiv = document.getElementById('search-results');
  resultsDiv.innerHTML = '';
  if (!query) return;

  // Fetch all things for the current user
  let snapshot;
  try {
    snapshot = await db.collection('things')
      .where('userId', '==', userId)
      .get();
  } catch (err) {
    resultsDiv.textContent = 'Error fetching data.';
    console.error(err);
    return;
  }

  const results = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    // Search in name
    if ((data.name || '').toLowerCase().includes(query)) {
      results.push({ id: doc.id, ...data });
      return;
    }
    // Search in flexibutes (details)
    if (data.flexibutes) {
      let flexArr = Array.isArray(data.flexibutes)
        ? data.flexibutes
        : Object.entries(data.flexibutes).map(([key, val]) => ({ key, val }));
      for (const { key, val } of flexArr) {
        if ((key && key.toLowerCase().includes(query)) || (val && val.toLowerCase().includes(query))) {
          results.push({ id: doc.id, ...data });
          return;
        }
      }
    }
  });

  if (results.length === 0) {
    resultsDiv.textContent = 'No matches found.';
    return;
  }

  // Render results
  const ul = document.createElement('ul');
  for (const thing of results) {
    const li = document.createElement('li');
    li.textContent = thing.name || '(Unnamed Thing)';
    ul.appendChild(li);
  }
  resultsDiv.appendChild(ul);
}

// Placeholder for Add page initialization
function initAdd() {
  // Any setup for the Add page can go here
}

// Function to submit a new thing to Firestore
async function submitThing() {
  const name = document.getElementById("thing-name").value.trim();
  const visibility = document.getElementById("thing-visibility").value;
  const allowCopy = document.getElementById("allowCopy").checked;
  const isLocationSource = document.getElementById("isLocationSource").checked;

  // Collect details
  const flexibutes = Array.from(document.querySelectorAll("#details-container > div")).map(div => {
    const key = div.querySelector("input").value.trim();
    const val = div.querySelector("textarea").value.trim();
    return key ? { key, val } : null;
  }).filter(Boolean);

  // Collect media links
  const media = Array.from(document.querySelectorAll("#media-container input")).map(inp => inp.value.trim()).filter(Boolean);

  // You can add location logic here if needed

  try {
    await db.collection("things").add({
      userId,
      name,
      visibility,
      allowCopy,
      isLocationSource,
      flexibutes,
      media,
      created: firebase.firestore.FieldValue.serverTimestamp()
    });
    alert("Thing added!");
    window.location.href = "index.html";
  } catch (err) {
    console.error("Failed to add thing:", err);
    alert("Failed to add thing. Check console for details.");
  }
}


