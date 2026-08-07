// ============================================================
// FIREBASE SETUP — do this once, then the chat box goes live.
// ============================================================
//
// 1. Go to https://console.firebase.google.com and sign in with any
//    Google account. Click "Add project" (it's free — no credit card).
//
// 2. Once the project is created, on the project overview page click
//    the "</>" (web) icon to register a new web app. Give it any
//    nickname. You do NOT need Firebase Hosting for this.
//
// 3. Firebase will show you a firebaseConfig object. Copy the values
//    into the object below, replacing the placeholder text.
//
// 4. In the left sidebar: Build -> Realtime Database -> Create Database.
//    Choose any region. When asked about security rules, pick
//    "Start in locked mode" (we'll set proper rules in step 5).
//
// 5. Click the "Rules" tab of your Realtime Database and paste this,
//    then hit Publish. This lets anyone READ and POST messages, but
//    enforces the same limits the chat UI already enforces (so someone
//    can't bypass the UI and spam huge messages directly via the API):
//
//    {
//      "rules": {
//        "community-chat": {
//          ".read": true,
//          ".write": true,
//          "$messageId": {
//            ".validate": "newData.hasChildren(['name','text','ts']) &&
//                           newData.child('name').isString() &&
//                           newData.child('name').val().length <= 20 &&
//                           newData.child('text').isString() &&
//                           newData.child('text').val().length > 0 &&
//                           newData.child('text').val().length <= 240"
//          }
//        }
//      }
//    }
//
//    Note: these rules stop malformed/oversized writes, but don't stop
//    spam volume or bad language on their own. If that becomes a
//    problem later, come back and we can add rate-limiting or a
//    moderation/word-filter step.
//
// 6. Save this file, refresh community.html, and the chat should
//    connect. The "Connecting…" status will change once it's working.

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCqvKqalM0iqTFVXisBoYr4lMSyIUmXBlI",
  authDomain: "fnafbl-89785.firebaseapp.com",
  databaseURL: "https://fnafbl-89785-default-rtdb.firebaseio.com/",
  projectId: "fnafbl-89785",
  storageBucket: "fnafbl-89785.firebasestorage.app",
  messagingSenderId: "854672507679",
  appId: "1:854672507679:web:22162770531b47547f662a"
};