require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");

const authRoutes = require("./routes/auth");
const usersRoutes = require("./routes/users");
const themeRoutes = require("./routes/theme");
const gestantesRoutes = require("./routes/gestantes");
const eventosRoutes = require("./routes/eventos");
const paquetesRoutes = require("./routes/paquetes");
const prestadoresRoutes = require("./routes/prestadores");
const fomagRoutes = require("./routes/fomag");

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    credentials: true,
  }),
);
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/theme", themeRoutes);
app.use("/api/maternas", gestantesRoutes);
app.use("/api/eventos", eventosRoutes);
app.use("/api/paquetes", paquetesRoutes);
app.use("/api/prestadores", prestadoresRoutes);
app.use("/api/fomag", fomagRoutes);

// Serve Static Files (Frontend)
const frontendPath = path.join(__dirname, "../../frontend/dist");
app.use(express.static(frontendPath));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// SPA Support: Serve index.html for all non-API routes
app.get("*", (req, res) => {
  if (!req.path.startsWith("/api")) {
    res.sendFile(path.join(frontendPath, "index.html"));
  } else {
    res.status(404).json({ error: "Ruta API no encontrada" });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Error interno del servidor" });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
