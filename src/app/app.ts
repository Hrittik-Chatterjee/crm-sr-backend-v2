import cookieParser from "cookie-parser";
import compression from "compression";
import cors from "cors";
import express, { Application, Request, Response } from "express";
import mongoose from "mongoose";
import globalErrorHandler from "./middlewares/globalErrorHandler";
import notFound from "./middlewares/notFound";
import router from "./routes";
import envVars from "./config/env";
import { seedSuperAdmin } from "./config/seed";

const app: Application = express();

// Cache MongoDB connection for serverless
let isConnected = false;

async function connectDB() {
  if (isConnected) {
    return;
  }

  try {
    await mongoose.connect(envVars.MONGO_URI);
    isConnected = true;
    console.log("✅ Connected to MongoDB successfully");
    await seedSuperAdmin();
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    throw error;
  }
}

// Middleware
app.use(compression()); // Gzip compression for responses
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS configuration
const allowedOrigins = [
  envVars.FRONTEND_URL,
  "http://localhost:3000",
  "http://localhost:5173",
  "https://crm-sr-v2.vercel.app"
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else if (envVars.NODE_ENV === "development") {
        // In development, allow all origins
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Connect to DB before handling requests (for serverless)
app.use(async (_req, _res, next) => {
  await connectDB();
  next();
});

// Health check route
app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "CRM Backend Server is running",
  });
});

// API routes
app.use("/api/v1", router);

// Error handling
app.use(globalErrorHandler);
app.use(notFound);

export default app;
