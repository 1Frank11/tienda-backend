// routes/ventaRoutes.js
const express = require("express");
const { realizarVenta, obtenerTicket } = require("../controllers/ventaController");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// todas las rutas de ventas requieren token
router.use(authenticateToken);

// POST /api/ventas
router.post("/", realizarVenta);

// GET /api/ventas/ticket/:id  → reimpresión
router.get("/ticket/:id", obtenerTicket);

module.exports = router;