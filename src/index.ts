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
type CartItem = { product: Product; quantity: number };
type Cart = {items: CartItem[]};


type CheckoutRequestBody = {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  additionalInfo?: string;
   cart: Cart | CartItem[];
};



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

// Checkout endpoint
app.post(
  "/checkout",
  async (req: Request<{}, {}, CheckoutRequestBody>, res: Response) => {
    const { name, email, phone, address, additionalInfo, cart} = req.body;


    const items = Array.isArray(cart) ? cart : cart.items;

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
Email: ${email}
Phone: ${phone}
Address: ${address}

Additional Info: ${additionalInfo || "N/A"}

Cart:
${items.map((i: CartItem) => `${i.product.name} x${i.quantity}`).join("\n")}
`,
    };

    try {
      await transporter.sendMail(message);
      res.json({ success: true, message: "Order sent!" });
    } catch (err) {
    if (err instanceof Error) {
        console.error("SMTP send error:", err.message);
        console.error("Full error object:", err);
    } else {
        console.error("Unknown error:", err);
    }
    console.log(err)
    res.status(500).json({ error: "Failed to send order" });
}
  }
);

app.listen(4000, () => {
  console.log("Backend running on http://localhost:4000");
});

