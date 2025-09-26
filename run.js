// run.js
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
//import mongoSanitize from "express-mongo-sanitize";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Seguridad
app.use(helmet());
//app.use(mongoSanitize());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: { error: "Too many requests, try again later." },
  })
);

// ✅ CORS (ajustar según tu dominio real)
const allowedOrigins = [
  "https://quelora.org",
  "https://www.quelora.org",
  "https://api.quelora.org",
  "https://dashboard.quelora.org",
  "https://quelora.localhost.ar",
  "https://quelora.localhost.ar:444", // para dev
];
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
  })
);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "https://unpkg.com",
          "https://cdn.jsdelivr.net",
          "https://challenges.cloudflare.com"
        ],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: [
          "'self'",
          "https://external-preview.redd.it",
          "https://i.redd.it/",
          "https://picsum.photos",
          "https://www.youtube.com/",
          "https://preview.redd.it",
          "https://i.pravatar.cc",
          "https://lh3.googleusercontent.com",
        ],
        connectSrc: [
          "'self'",
          "https://quelora.localhost.ar:444",
          "https://cdn.jsdelivr.net"
        ],
        frameSrc: ["'self'", 
                   "https://challenges.cloudflare.com",
                   "https://www.youtube.com",
                   "https://www.youtube-nocookie.com"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
      },
    },
  })
);
// ✅ Bloqueo de escrituras en modo demo
app.use((req, res, next) => {
  if (["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
    return res
      .status(403)
      .json({ error: "Write operations are disabled in demo mode." });
  }
  next();
});

// 🔹 Mongo
const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI;

mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// 🔹 Schema
const postSchema = new mongoose.Schema({
  cid: String,
  entity: mongoose.Schema.Types.ObjectId,
  reference: String,
  title: String,
  link: String,
  type: String,
  description: String,
  image: String,
  config: Object,
  likes: Array,
  sharesCount: Number,
  commentCount: Number,
  likesCount: Number,
  viewsCount: Number,
  metadata: Object,
  deletion: Object,
  created_at: Date,
  updated_at: Date,
});
const Post = mongoose.model("Post", postSchema);

// 🔹 API
app.get("/api/posts", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 0;
    const limit = Math.min(parseInt(req.query.limit) || 10, 20);

    const posts = await Post.find({ "deletion.status": "active" })
      .sort({ created_at: -1 })
      .skip(page * limit)
      .limit(limit)
      .lean();

    res.json(posts);
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// 🔹 Servir todos los archivos estáticos
app.use(express.static(__dirname));

// 🔹 Root -> index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// 🔹 Iniciar servidor
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Demo API running at http://localhost:${PORT}`);
});
