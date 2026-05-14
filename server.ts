import express from "express";
import path from "path";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";

dotenv.config();

// Cloudinary Configuration Helper
const getCloudinary = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  const isPlaceholder = (val?: string) => 
    !val || val.toLowerCase().includes("your_") || val.toLowerCase() === "api key" || val.toLowerCase() === "cloud name" || val.toLowerCase() === "api secret";

  if (!cloudName || !apiKey || !apiSecret || isPlaceholder(cloudName) || isPlaceholder(apiKey) || isPlaceholder(apiSecret)) {
    throw new Error("Cloudinary configuration is missing or contains placeholder values. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in the 'Settings > Environment Variables' menu with your actual Cloudinary credentials.");
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });

  return cloudinary;
};

// Multer setup for memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(cors());
  app.use(express.json());

  // Log environment status for debugging (masked)
  console.log("Environment Status:", {
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ? "CONFIGURED" : "MISSING",
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY ? "CONFIGURED" : "MISSING",
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ? "CONFIGURED" : "MISSING",
    FLUTTERWAVE_SECRET_KEY: process.env.FLUTTERWAVE_SECRET_KEY ? "CONFIGURED" : "MISSING",
    VITE_FLUTTERWAVE_PUBLIC_KEY: process.env.VITE_FLUTTERWAVE_PUBLIC_KEY ? "CONFIGURED" : "MISSING",
  });

  // Flutterwave Verification Endpoint
  app.post("/api/verify-payment", async (req, res) => {
    const { transaction_id, expected_amount } = req.body;
    const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;

    if (!transaction_id) {
      return res.status(400).json({ status: "error", message: "Transaction ID is required" });
    }

    if (!secretKey) {
      console.error("FLUTTERWAVE_SECRET_KEY is not set in environment variables");
      return res.status(500).json({ status: "error", message: "Server configuration error" });
    }

    try {
      const response = await axios.get(
        `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
        {
          headers: {
            Authorization: `Bearer ${secretKey}`,
          },
        }
      );

      const { data } = response;

      if (
        data.status === "success" &&
        data.data.status === "successful" &&
        data.data.amount >= expected_amount &&
        data.data.currency === "NGN"
      ) {
        // Payment is verified
        return res.json({ status: "success", data: data.data });
      } else {
        return res.status(400).json({ status: "error", message: "Payment verification failed", details: data });
      }
    } catch (error: any) {
      console.error("Flutterwave verification error:", error.response?.data || error.message);
      return res.status(500).json({ 
        status: "error", 
        message: "Internal server error during verification",
        details: error.response?.data
      });
    }
  });

  // Cloudinary Upload Endpoint
  app.post("/api/upload", upload.single("image"), async (req, res) => {
    try {
      const file = (req as any).file;
      if (!file) {
        return res.status(400).json({ status: "error", message: "No file uploaded" });
      }

      const cloudClient = getCloudinary();

      // Use stream for more reliable upload of buffers
      const uploadStream = cloudClient.uploader.upload_stream(
        {
          folder: "campxchange",
          resource_type: "auto",
        },
        (error, result) => {
          if (error) {
            console.error("Cloudinary upload error:", error);
            return res.status(500).json({
              status: "error",
              message: `Cloudinary upload failed: ${error.message}`,
              details: error
            });
          }
          return res.json({
            status: "success",
            url: result?.secure_url,
            public_id: result?.public_id,
          });
        }
      );

      uploadStream.end(file.buffer);
    } catch (error: any) {
      console.error("Upload preparation error:", error);
      return res.status(500).json({
        status: "error",
        message: error.message || "Failed to initialize upload",
        details: error
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
