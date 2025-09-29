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
        // Fuentes por defecto
        defaultSrc: ["'self'"],
        
        // Scripts
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          "https://unpkg.com",
          "https://cdn.jsdelivr.net",
          "https://challenges.cloudflare.com",
          "https://accounts.google.com",
          "https://accounts.google.com/gsi/client",
          "https://www.gstatic.com",
          "https://apis.google.com",
          "https://connect.facebook.net",
          "https://connect.facebook.com",
          "https://cdnjs.cloudflare.com", // Para i18next
          "https://unpkg.com", // Para bootstrap
          "https://cdn.jsdelivr.net" // Para npm packages
        ],
        
        // Estilos
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
          "https://accounts.google.com",
          "https://www.gstatic.com",
          "https://fonts.googleapis.com/css2",
          "https://cdn.jsdelivr.net", // Para bootstrap
          "https://unpkg.com", // Para bootstrap-icons
          "https://cdnjs.cloudflare.com" // Para otros CDNs
        ],
        
        // Fuentes
        fontSrc: [
          "'self'",
          "data:", // Para data URIs
          "https://fonts.gstatic.com",
          "https://fonts.googleapis.com",
          "https://www.gstatic.com",
          "https://cdn.jsdelivr.net" // Para bootstrap-icons
        ],
        
        // Imágenes
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https:",
          "http:", // Permitir todas las imágenes HTTP/HTTPS temporalmente
          "https://external-preview.redd.it",
          "https://i.redd.it/",
          "https://picsum.photos",
          "https://www.youtube.com/",
          "https://preview.redd.it",
          "https://i.pravatar.cc",
          "https://lh3.googleusercontent.com",
          "https://*.googleusercontent.com",
          "https://www.gstatic.com",
          "https://graph.facebook.com",
          "https://avatars.githubusercontent.com", // Para GitHub avatars
          "https://flagcdn.com" // Para las banderas
        ],
        
        // Conexiones
        connectSrc: [
          "'self'",
          "https://quelora.localhost.ar:444",
          "https://cdn.jsdelivr.net",
          "https://accounts.google.com",
          "https://www.googleapis.com",
          "https://*.google.com",
          "https://*.gstatic.com",
          "https://*.quelora.org",
          "https://graph.facebook.com",
          "https://api.twitter.com",
          "wss://quelora.localhost.ar:445",
          "https://cdnjs.cloudflare.com" // Para i18next
        ],
        
        // Frames
        frameSrc: [
          "'self'",
          "https://challenges.cloudflare.com",
          "https://www.youtube.com",
          "https://www.youtube-nocookie.com",
          "https://accounts.google.com",
          "https://*.google.com",
          "https://*.gstatic.com",
          "https://facebook.com",
          "https://www.facebook.com",
          "https://staticxx.facebook.com"
        ],
        
        // Objetos multimedia
        mediaSrc: [
          "'self'",
          "https://www.youtube.com",
          "blob:"
        ],
        
        // Objetos
        objectSrc: ["'none'"],
        
        // Base URI
        baseUri: ["'self'"],
        
        // Form actions
        formAction: [
          "'self'",
          "https://accounts.google.com"
        ],
        
        // Worker sources
        workerSrc: [
          "'self'",
          "blob:"
        ],
        
        // Manifest sources
        manifestSrc: ["'self'"]
      },
    },
    
    // Otras configuraciones
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    
    // HSTS
    hsts: process.env.NODE_ENV === 'production' ? {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    } : false,
    
    // Upgrade insecure requests
    upgradeInsecureRequests: null, // O eliminar esta línea
    
    // No cache
    noCache: process.env.NODE_ENV === 'development',
    
    // Referrer policy
    referrerPolicy: { 
      policy: "strict-origin-when-cross-origin" 
    }
  })
);

app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'ALLOW-FROM https://accounts.google.com');
  res.setHeader('Permissions-Policy', 'interest-cohort=()'); // Evita FLoC
  next();
});

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
