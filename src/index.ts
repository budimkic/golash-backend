import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
import express, { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { BrevoClient } from "@getbrevo/brevo";

const app = express();

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "https://golash.store" }));
app.use(express.json({ limit: "100kb" }));

type ProductDetails = { size: string; careInstructions: string; materials: string };
type ProductImage = { url: string; type: "REMOTE" | "LOCAL" | "RESOURCE" };
type Product = { id: string; name: string; shortDescription: string; details: ProductDetails; price: number; images: ProductImage[] };
type CartItem = { product: Product; selectedSize: string; quantity: number };
type Cart = { items: CartItem[] };
type ShippingInfoState = {
  name: string;
  email: string;
  phoneNumber: string;
  address: string;
  city: string;
  postCode: string;
  country: string;
  additionalInfo?: string;
};
type CheckoutRequestBody = {
  shippingInfoState: ShippingInfoState;
  cart: Cart;
};

// Initialize Brevo client
const brevo = new BrevoClient({
  apiKey: process.env.BREVO_API_KEY || "",
});

// Basic format checks
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+\d][\d\s()-]{6,}$/;

// Rate limit: 10 checkout attempts per 15 minutes per IP
const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

app.post(
  "/checkout",
  checkoutLimiter,
  async (req: Request<{}, {}, CheckoutRequestBody>, res: Response, next: NextFunction) => {
    try {
      if (!req.body || !req.body.shippingInfoState || !req.body.cart) {
        return res.status(400).json({ error: "Invalid request payload" });
      }

      const { shippingInfoState, cart } = req.body;
      const { name, email, phoneNumber, address, city, postCode, country, additionalInfo } = shippingInfoState;

      if (!name || !email || !phoneNumber || !address || !city || !postCode || !country) {
        return res.status(400).json({ error: "Missing required shipping information fields" });
      }
      if (!EMAIL_RE.test(email)) {
        return res.status(400).json({ error: "Invalid email address" });
      }
      if (!PHONE_RE.test(phoneNumber)) {
        return res.status(400).json({ error: "Invalid phone number" });
      }
      if (!Array.isArray(cart.items) || cart.items.length === 0) {
        return res.status(400).json({ error: "Cart is empty or invalid" });
      }

      const trimmedInfo = additionalInfo?.trim() ?? "";
      if (trimmedInfo.length > 500) {
        return res.status(400).json({ error: "Additional info must be 500 characters or less" });
      }

      const emailText = `
Name: ${name}
E-mail: ${email}
Phone number: ${phoneNumber}
Address: ${address}
City: ${city}
Post code: ${postCode}
Country: ${country}
Additional info: ${trimmedInfo || "N/A"}
Cart:
${cart.items.map((i: CartItem) => `${i.product.name} (Size: ${i.selectedSize}) x${i.quantity}`).join("\n")}
`;

      // Send email using the modern Brevo client
      await brevo.transactionalEmails.sendTransacEmail({
        sender: { email: "orders@golash.store", name: "Golash Store" },
        to: [{ email: "orders@golash.store", name: "Golash Store Admin" }],
        replyTo: { email, name },
        subject: `New Golash Order from ${name}`,
        textContent: emailText,
      });

      res.json({ success: true, message: "Order sent!" });
    } catch (err) {
      console.error("--- DETAILED EMAIL ERROR ---");
      console.error(err);
      console.error("----------------------------");
      res.status(500).json({ error: "Failed to send order" });
    }
  }
);

app.listen(4000, "0.0.0.0", () => {
  console.log("Backend running on http://localhost:4000");
});