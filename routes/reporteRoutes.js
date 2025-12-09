const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const {
  getReporteAdmin,
  getReporteCajero,
  getDetalleVenta,
  exportarExcel
} = require("../controllers/reporteController");

router.get("/admin", authenticateToken, getReporteAdmin);
router.get("/cajero", authenticateToken, getReporteCajero);
router.get("/venta/:id", authenticateToken, getDetalleVenta);
router.get("/ventas-por-cajero", authenticateToken, async (req, res) => {
  const result = await pool.query(`
    SELECT 
      u.username,
      v.id,
      v.total,
      v.metodo_pago,
      v.fecha
    FROM ventas v
    JOIN users u ON v.usuario_id = u.id
    ORDER BY v.fecha DESC
  `);

  res.json(result.rows);
});


// ✅ ESTA ES LA CLAVE
router.get("/exportar-excel", authenticateToken, exportarExcel);
router.get("/ventas-por-cajero", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.username,
             COUNT(v.id) AS transacciones,
             SUM(v.total) AS total_vendido
      FROM ventas v
      JOIN usuarios u ON u.id = v.usuario_id
      GROUP BY u.username
      ORDER BY total_vendido DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error en ventas por cajero" });
  }
});

module.exports = router;
