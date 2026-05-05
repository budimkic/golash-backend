import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import 'dotenv/config';

const app = express();
app.use(cors());
app.use(express.json());

// Zoho SMTP setup
  const transporter = nodemailer.createTransport({    
    host: "smtp.zoho.eu",
    port: 587,
    secure: false,
    auth: {
      user: "orders@golash.store",
      pass: process.env.ZOHO_PASS,
    },
  });

  app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - body:`, req.body);
  next();
});

// Checkout endpoint
app.post("/checkout", async (req, res) => {
console.log("Received checkout body:", JSON.stringify(req.body, null, 2));

  const { name, email, phone, address, additionalInfo, cart } = req.body;

const items = Array.isArray(cart) ? cart : Array.isArray(cart?.items) ? cart.items : [];

  if (!email || !cart || !name) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const message = {
    from: "orders@golash.store",
    to: "orders@golash.store",
    replyTo: email,
    subject: `New Golash Order from ${name}`,
    text: `
Name: ${name}
Email: ${email}
Phone: ${phone ?? ""}
Address: ${address ?? ""}
Additional info: ${additionalInfo ?? ""}


Cart:
${items.map((i: any) => `${i.product.name} x${i.quantity}`).join("\n")}
`
};

try {
  await transporter.sendMail(message);
  res.json({ success: true, message: "Order sent!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send order" });
}});

const PORT = 4000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend running on http://0.0.0.0:${PORT}`);
});