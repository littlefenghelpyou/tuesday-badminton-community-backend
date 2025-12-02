const express = require("express");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");
const app = express();
app.use(bodyParser.json());
const PORT = 4000;
const cors = require("cors");
const bcrypt = require("bcryptjs");

// 🛑 OLD WAY (INSECURE)
// const serviceAccount = require('./your-service-account-file.json');
// const serviceAccount = require("./tbc-testing-prod-firebase-adminsdk.json");

// ✅ NEW SECURE WAY: Read the single environment variable and parse it.
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Middleware to parse JSON request bodies
app.use(express.json());

// Allow requests from React (http://localhost:3000)
// app.use(cors({ origin: "http://localhost:3000" }));
// app.use(cors({ origin: 'https://tuesdaybadmintoncommunity.web.app' }));
// Testing server
app.use(cors({ origin: "https://tbc-testing-prod.web.app" }));

app.post("/get", async (req, res) => {
  const { password } = req.body;

  // Generate salt
  const saltRounds = 10; // You can increase this for more security
  const salt = await bcrypt.genSalt(saltRounds);
  // Hash the password with the salt
  const hashedPassword = await bcrypt.hash(password, salt);

  res.status(200).json({ salt, hashedPassword });
});

app.post("/post", async (req, res) => {
  const { password, hashedPassword } = req.body;

  // Compare the entered password with the stored hashed password
  const match = await bcrypt.compare(password, hashedPassword);

  if (match) {
    // Passwords match, proceed with login (e.g., generate a session or JWT token)
    res.status(200).json({ message: "Login successful" });
  } else {
    // Passwords don't match
    res.status(401).json({ message: "Invalid credentials" });
  }
});

app.get("/", (req, res) => res.send("FCM Server is running"));

app.post("/send-notification", async (req, res) => {
  const { token, title, body } = req.body;

  console.log("title ------------------------>", title);
  console.log("body ------------------------>", body);

  const message = {
    notification: { title, body },
    token,
  };

  try {
    const response = await admin.messaging().send(message);
    res.status(200).json({ success: true, response });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ success: false, error });
  }
});

app.post("/save-notification", async (req, res) => {
  // Destructure the data sent from the client
  const { title, body } = req.body; // Data object to be saved to Firestore

  const notificationData = {
    title: title,
    body: body, // Use serverTimestamp() for an accurate, non-client-side generated timestamp
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    read: false,
  };

  try {
    // 1. Get a reference to the Firestore database
    const db = admin.firestore(); // 2. Add the document to the 'notifications' collection

    const docRef = await db.collection("notifications").add(notificationData);

    console.log("Document successfully written with ID:", docRef.id); // 3. Send a success response back to the client

    res.status(200).json({
      success: true,
      message: "Notification data saved to Firestore.",
      documentId: docRef.id, // Return the ID of the new document
    });
  } catch (error) {
    console.error("Error saving document to Firestore:", error); // 4. Send an error response

    res.status(500).json({
      success: false,
      error: "Failed to save notification data.",
      details: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

module.exports = app;
