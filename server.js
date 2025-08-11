const express = require("express");
const cors = require("cors");
const webpush = require("web-push");
require("dotenv").config();

const app = express();
app.use(cors({
  origin: ["https://yourfrontenddomain.com"], // replace with your Hostinger frontend domain
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));
app.use(express.json());

let subscriptions = [];

// VAPID keys from environment
const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;

webpush.setVapidDetails(
  process.env.VAPID_CONTACT || "mailto:mehulproofficial@gmail.com",
  publicKey,
  privateKey
);

// Send public key to frontend
app.get("/vapidPublicKey", (req, res) => {
  res.json({ key: publicKey });
});

// Subscribe endpoint
app.post("/subscribe", (req, res) => {
  const subscription = req.body;
  subscriptions.push(subscription);
  console.log("New subscription added:", subscription);
  res.status(201).json({ message: "Subscription added successfully." });
});

// Send notification to all subscribers
app.post("/send", async (req, res) => {
  const { title, body, url } = req.body;
  const payload = JSON.stringify({ title, body, url });

  const sendPromises = subscriptions.map(sub =>
    webpush.sendNotification(sub, payload).catch(err => {
      console.error("Push error:", err);
    })
  );

  await Promise.all(sendPromises);
  res.json({ message: "Notifications sent successfully." });
});

app.get("/", (req, res) => {
  res.send("Notification backend running...");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
