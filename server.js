const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Middlewares
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.options("*", cors());

app.use(express.json());

// Importar rutas
const authRoutes = require("./routes/authRoutes");
const productoRoutes = require("./routes/productoRoutes");
const ventaRoutes = require('./routes/ventaRoutes');
const userRoutes = require('./routes/userRoutes');       
const reporteRoutes = require('./routes/reporteRoutes');
const sistemaRoutes = require('./routes/sistemaRoutes');


// Usar rutas
app.use("/api/auth", authRoutes);
app.use("/api/productos", productoRoutes);
app.use("/api/ventas", ventaRoutes);
app.use('/api/usuarios', userRoutes); 
app.use('/api/reportes', reporteRoutes);
app.use('/api/sistema', sistemaRoutes);


// Ruta de documentación e información
app.get("/", (req, res) => {
  res.json({ 
    mensaje: "🚀 API Sistema Gestión Tienda - UNMSM",
    version: "2.0.0",
    estructura: "Arquitectura profesional por capas",
    endpoints: {
      autenticación: {
        "POST /api/auth/login": "Iniciar sesión",
        "GET /api/auth/profile": "Perfil de usuario (requiere token)"
      },
      productos: {
        "GET /api/productos": "Listar productos (requiere token)",
        "GET /api/productos/buscar?criterio=X&valor=Y": "Buscar productos",
        "GET /api/productos/stock-bajo": "Productos con stock bajo",
        "POST /api/productos": "Crear producto (solo admin)"
      }
    },
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer <token_jwt>"
    }
  });
});

// Ruta de salud
app.get("/health", (req, res) => {
  res.json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    service: "Sistema Gestión Tienda API"
  });
});

// Manejo de rutas no encontradas
app.use("*", (req, res) => {
  res.status(404).json({ 
    success: false,
    error: "Endpoint no encontrado",
    mensaje: `La ruta ${req.originalUrl} no existe en este servidor`,
    sugerencia: "Consulta la documentación en GET /"
  });
});

// Manejo global de errores
app.use((err, req, res, next) => {
  console.error("Error no manejado:", err);
  res.status(500).json({ 
    success: false,
    error: "Error interno del servidor",
    mensaje: "Ocurrió un error inesperado"
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log("==========================================");
  console.log("🚀  SISTEMA GESTIÓN TIENDA - UNMSM");
  console.log("==========================================");
  console.log(`📡 Servidor: http://localhost:${PORT}`);
  console.log(`🔐 Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️  Base de datos: ${process.env.DB_NAME}`);
  console.log("==========================================");
  console.log("✅  Backend profesional iniciado correctamente");
  console.log("📚  Documentación disponible en la raíz (GET /)");
});