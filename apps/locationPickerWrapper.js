<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Edit Thing</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;600;700&display=swap" rel="stylesheet">
  <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js"></script>
  <style>
    body {
      font-family: 'Nunito Sans', sans-serif;
      background: white;
      color: black;
      padding: 30px 20px;
      max-width: 420px;
      margin: auto;
    }
    h2 {
      text-align: left;
      font-size: 24px;
    }
    input, textarea, select {
      background-color: white;
      color: black;
      border: 2px solid #A8D5BA;
      border-radius: 8px;
      padding: 8px 16px;
      font-size: 16px;
      margin-bottom: 12px;
      width: 100%;
    }
    button {
      background-color: #A8D5BA;
      color: white;
      border: none;
      border-radius: 8px;
      padding: 10px 16px;
      font-size: 16px;
      transition: background-color 0.3s ease;
      cursor: pointer;
      margin-bottom: 12px;
    }
    button:hover {
      background-color: #91c3aa;
    }
    label {
      font-weight: bold;
      margin-top: 10px;
      display: block;
    }
    #flexibutes-container div,
    #media-container div {
      margin-bottom: 12px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
    }
    td {
      padding: 4px;
      vertical-align: middle;
      border: 1px dashed gray;
    }
  </style>
</head>
<body>
<h2>Edit Thing</h2>
<label>Mark as Location Source</label>
<table><tr>
  <td style="width: 40px;"><input type="checkbox" id="isLocationSource"></td>
  <td><label for="isLocationSource">Mark as Location Source</label></td>
</tr></table>
<div id="location-section" style="margin-bottom: 10px;"></div>
<script>
const firebaseConfig = {
  apiKey: "AIzaSyAatek1caogYhCY0rXj9YrGC32E0lRJtUs",
  authDomain: "whereapp-ideasdesai.firebaseapp.com",
  projectId: "whereapp-ideasdesai"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let userId = null;
auth.signInAnonymously().then(res => {
  userId = res.user.uid;
  const script = document.createElement('script');
  script.src = 'apps/locationPickerWrapper.js';
  script.onload = () => {
    window.loadLocationPickerIfReady("location-section", userId, db);
  };
  document.body.appendChild(script);
});
</script>
</body>
</html>
