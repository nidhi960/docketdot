import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import dbConnect from "./config/db.js";
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

// Fix for __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

/* -----------------------------
   Middlewares
----------------------------- */
app.use(
  cors({
    origin: process.env.CORS_ALLOWED_ORIGINS?.split(",") || "*",
    credentials: true,
  })
);
app.use(cookieParser());

// Increased limit to handle larger form data/document metadata
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
   HTTP + SOCKET SERVER
----------------------------- */
const PORT = process.env.PORT || 8080;
const server = http.createServer(app);

// Initialize Socket.IO
initSocket(server);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on ${PORT}`);
});


