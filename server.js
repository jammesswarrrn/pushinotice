require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const webPush = require("web-push");
const cors = require("cors");

const app = express();
app.use(bodyParser.json());

// Allow only your Hostinger frontend
app.use(cors({
    origin: process.env.ALLOWED_ORIGIN,
    methods: ["GET", "POST"],
    credentials: true
}));

// Load VAPID keys from environment variables
const publicVapidKey = process.env.VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;
const contactEmail = process.env.VAPID_CONTACT || "mailto:you@example.com";

if (!publicVapidKey || !privateVapidKey) {
    console.error("❌ Missing VAPID keys. Generate them using `npm run gen-vapid`.");
    process.exit(1);
}

// Configure web-push
webPush.setVapidDetails(contactEmail, publicVapidKey, privateVapidKey);

// Store subscriptions in memory (replace with DB in production)
let subscriptions = new Set();

// Return public VAPID key
app.get("/vapidPublicKey", (req, res) => {
    res.json({ publicKey: publicVapidKey });
});

// Subscribe endpoint
app.post("/subscribe", (req, res) => {
    const subscription = req.body;
    if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ error: "Invalid subscription" });
    }
    subscriptions.add(JSON.stringify(subscription));
    console.log("✅ New subscription added:", subscription.endpoint);
    res.status(201).json({ success: true });
});

// Send notification to all
app.post("/send", async (req, res) => {
    const { title, message, url } = req.body;
    const payload = JSON.stringify({ title, message, url });

    const results = [];
    for (let subStr of subscriptions) {
        const sub = JSON.parse(subStr);
        try {
            await webPush.sendNotification(sub, payload);
            results.push({ endpoint: sub.endpoint, status: "sent" });
        } catch (err) {
            console.error("❌ Push failed:", err.statusCode, err.body || err.message);
            if (err.statusCode === 410 || err.statusCode === 404) {
                subscriptions.delete(subStr);
                results.push({ endpoint: sub.endpoint, status: "removed" });
            }
        }
    }
    res.json({ success: true, results });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Backend running on port ${PORT}`);
});
