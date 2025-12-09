const express = require("express");
const router = express.Router();
const pool = require("../config/database");
const { authenticateToken } = require("../middleware/auth");

router.get("/ventas-por-cajero", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.username, COUNT(v.id) AS ventas, SUM(v.total) AS total
      FROM ventas v
      JOIN usuarios u ON v.usuario_id = u.id
      GROUP BY u.username
    `);

    res.json({ success: true, cajeros: result.rows });
  } catch (error) {
    console.error("Error admin:", error);
    res.status(500).json({ success: false });
  }
});

module.exports = router;
