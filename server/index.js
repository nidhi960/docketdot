import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import dbConnect from "./config/db.js";
// Route imports...
import chatbotRoutes from "./routes/chatBot.js";
import authRoutes from "./routes/authRoutes.js";
import rbacRoutes from "./routes/rbac.js";
import menuRoutes from "./routes/menuRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import docketRoutes from "./routes/docketRoutes.js";
import applicationRoutes from "./routes/applicationRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import deadlineRoutes from "./routes/deadlineRoutes.js";
import clientRoutes from "./routes/clientRoutes.js";
import draftRoutes from "./routes/draftRoutes.js";
import priorArtRoutes from "./routes/priorArtRoutes.js";
import { initSocket } from "./socket.js";
import clearBlacklistedTokenScheduler from "./utils/clearBlacklistedTokenScheduler.js";
import { startReminderCron } from "./jobs/deadlineReminderCron.js";

dotenv.config({ quiet: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// ✅ FIX 1: Create the Server INSTANCE first
const server = http.createServer(app);

/* -----------------------------
   Middlewares (FIXED CORS)
----------------------------- */
// Define allowed origins explicitly
const allowedOrigins = [
  "http://localhost:5173", // Local Development
  "http://localhost:8080", // Local Preview
  "https://docketdot-production-9384.up.railway.app", // 👈 YOUR FRONTEND URL
  process.env.CORS_ALLOWED_ORIGINS // Allow env variable too
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or server-to-server)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        console.log("Blocked by CORS:", origin); // Debugging help
        return callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true, // ✅ This now works because we don't use '*'
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-menu-id"]
  })
);

app.use(cookieParser());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

/* -----------------------------
   MongoDB
----------------------------- */
dbConnect();
startReminderCron();

/* -----------------------------
   Default Route
----------------------------- */
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: `${process.env.APP_NAME} API is running with Socket.IO 🚀`,
  });
});

/* -----------------------------
   Routes
----------------------------- */
app.use("/api/auth", authRoutes);
app.use("/api/menus", menuRoutes);
app.use("/api/rbac", rbacRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/dockets", docketRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/deadlines", deadlineRoutes);
app.use("/api/client", clientRoutes);
app.use("/api/drafts", draftRoutes);
app.use("/api/prior-art", priorArtRoutes);
app.use("/api/chatbot", chatbotRoutes);

/* -----------------------------
   Global Error Handler
----------------------------- */
app.use((err, req, res, next) => {
  console.error("Global Error:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Something went wrong",
  });
});

clearBlacklistedTokenScheduler;

/* -----------------------------
   HTTP + SOCKET SERVER (FIXED)
----------------------------- */
// Initialize Socket.IO with the server instance
initSocket(server);

// ✅ FIX 2: Listen on 'server', NOT 'app'
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on ${PORT}`);
});
