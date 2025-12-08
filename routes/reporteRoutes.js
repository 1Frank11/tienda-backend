const express = require("express");
const { getReporteAdmin, getReporteCajero, getDetalleVenta } = require("../controllers/reporteController");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");

const router = express.Router();
router.use(authenticateToken);

router.get("/admin", authorizeRoles('admin'), getReporteAdmin);
router.get("/cajero", getReporteCajero); // Cualquier rol puede ver su propio reporte
router.get("/venta/:id", getDetalleVenta);

module.exports = router;