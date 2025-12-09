const pool = require("../config/database");

const cerrarCaja = async (req, res) => {
  try {
    const cajero_id = req.user.id;
    const hoy = new Date().toISOString().split("T")[0];

    // 1. Verificar si ya hubo cierre
    const verificado = await pool.query(
      "SELECT * FROM cierres_caja WHERE cajero_id=$1 AND fecha=$2",
      [cajero_id, hoy]
    );

    if (verificado.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: "La caja ya fue cerrada hoy"
      });
    }

    // 2. Calcular totales del día
    const ventas = await pool.query(
      `
      SELECT 
        COUNT(*) AS cantidad,
        COALESCE(SUM(total), 0) AS total,
        COALESCE(SUM(CASE WHEN metodo_pago='efectivo' THEN total ELSE 0 END),0) AS efectivo,
        COALESCE(SUM(CASE WHEN metodo_pago='tarjeta' THEN total ELSE 0 END),0) AS tarjeta
      FROM ventas
      WHERE cajero_id=$1 AND DATE(fecha_venta)=CURRENT_DATE
      `,
      [cajero_id]
    );

    const v = ventas.rows[0];

    // 3. Guardar cierre
    await pool.query(
      `
      INSERT INTO cierres_caja(cajero_id, fecha, total_ventas, cantidad_ventas, efectivo, tarjeta)
      VALUES ($1, CURRENT_DATE, $2, $3, $4, $5)
      `,
      [cajero_id, v.total, v.cantidad, v.efectivo, v.tarjeta]
    );

    res.json({
      success: true,
      resumen: v
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { cerrarCaja };
