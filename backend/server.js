import express from "express";
import cors from "cors";
import Razorpay from "razorpay";
import crypto from "crypto";
import QRCode from "qrcode";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(express.json());

// Path setup for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --------------------------
// STATIC FRONTEND SERVING
// --------------------------
app.use(express.static(path.join(__dirname, "../public")));

// --------------------------
// CORS (ONLY 1 DOMAIN ALLOWED)
// --------------------------
app.use(
  cors({
    origin: "https://theutlron.onrender.com",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);

// --------------------------
// RAZORPAY SETUP
// --------------------------
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "rzp_test_RGbTLZ2nqVrbMS";
const RAZORPAY_KEY_SECRET =
  process.env.RAZORPAY_KEY_SECRET || "J5WcxqXJM7Z7WIKG4vk73NWo";

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

// --------------------------
// CREATE ORDER
// --------------------------
app.post("/create-order", async (req, res) => {
  try {
    const { amount } = req.body;

    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: "receipt_" + Date.now(),
    });

    res.json(order);
  } catch (err) {
    console.error("Order error:", err);
    res.status(500).json({ error: "Order creation failed" });
  }
});

// --------------------------
// VERIFY PAYMENT
// --------------------------
app.post("/verify-payment", (req, res) => {
  try {
    const { order_id, payment_id, signature } = req.body;

    const expectedSign = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(order_id + "|" + payment_id)
      .digest("hex");

    if (expectedSign === signature) {
      return res.json({ status: "success" });
    }
    res.json({ status: "failure" });
  } catch (err) {
    res.status(500).json({ status: "failure" });
  }
});

// --------------------------
// GENERATE QR CODE
// --------------------------
app.post("/generate-qr", async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        status: "failure",
        message: "Missing URL for QR code",
      });
    }

    const qrImage = await QRCode.toDataURL(url);

    res.json({ status: "success", qrImage });
  } catch (err) {
    console.error("QR generation error:", err);
    res.status(500).json({ status: "failure", message: err.message });
  }
});

// --------------------------
// CACHE HEADERS
// --------------------------
app.use((req, res, next) => {
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

// --------------------------
// SERVER START
// --------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
