import cors from "cors";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();
import express, { Request, Response } from "express";

const app = express();
app.use(cors());
app.use(express.json());

type ProductDetails = {size: string; careInstructions: string; materials: string;};
type ProductImage = {url: string; type: "REMOTE" | "LOCAL" | "RESOURCE";};
type Product = {id: string; name: string; shortDescription: string; details: ProductDetails; price: number; images: ProductImage[]};
type CartItem = { product: Product; selectedSize: string; quantity: number };
type Cart = {items: CartItem[]};

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

// Zoho SMTP setup
const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: {
    user: "budimkic@proton.me",
    pass: process.env.BREVO_PASS,
  },
});

// Checkout endpoint
app.post(
  "/checkout",
  async (req: Request<{}, {}, CheckoutRequestBody>, res: Response) => {

    const { shippingInfoState, cart } = req.body;
    const { name, email, phoneNumber, address, city, postCode, country, additionalInfo} = shippingInfoState;


    const items = cart.items;

    console.log("Received request body:", JSON.stringify(req.body, null, 2));
    console.log("Cart type:", typeof req.body.cart);
    console.log("Cart value:", req.body.cart);
    

    if (!email || !cart || !name) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const trimmedInfo = additionalInfo?.trim() ?? ""
    if (trimmedInfo.length > 500){
      return res.status(400).json({error: "Additional info must be 500 characters or less"});
    }

    const message = {
      from: "orders@golash.store",
      to: "orders@golash.store",
      replyTo: email,
      subject: `New Golash Order from ${name}`,
      text: `
Name: ${name}
E-mail: ${email}
Phone number: ${phoneNumber}
Address: ${address}
City: ${city}
Post code: ${postCode}
Country: ${country}
Additional info: ${additionalInfo || "N/A"}

Cart:
${items.map((i: CartItem) => `${i.product.name} (Size: ${i.selectedSize}) x${i.quantity}`).join("\n")}
`,
};

   try {
      console.log("Attempting to connect to Zoho and send email...");
      console.log("Using user email:", "orders@golash.store");
      console.log("Password length check:", process.env.BREVO_PASS ? process.env.BREVO_PASS.length : "NO PASSWORD FOUND");

      let info = await transporter.sendMail(message);
      
      console.log("SUCCESS! Email sent response:", info.response);
      res.json({ success: true, message: "Order sent!" });
    } catch (err) {
      console.error("--- DETAILED EMAIL ERROR ---");
      console.error(err);
      console.error("----------------------------");
      res.status(500).json({ error: "Failed to send order" });
    }
  }
);

app.listen(4000, '0.0.0.0', () => {
  console.log("Backend running on http://localhost:4000");
});

