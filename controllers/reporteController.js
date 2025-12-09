const pool = require("../config/database");
const ExcelJS = require("exceljs");

// ================================
// ✅ CU10: REPORTE ADMIN DASHBOARD
// ================================
const getReporteAdmin = async (req, res) => {
  const { fechaInicio, fechaFin } = req.query;
  
  const fInicio = fechaInicio || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const fFin = fechaFin || new Date().toISOString();

  try {
    const kpiVentas = await pool.query(
      `SELECT COUNT(*) as cantidad, COALESCE(SUM(total), 0) as total_dinero 
       FROM ventas 
       WHERE fecha_venta BETWEEN $1 AND $2 AND estado = 'completada'`,
      [fInicio, fFin]
    );

    const ventasPorDia = await pool.query(
      `SELECT DATE(fecha_venta) as fecha, SUM(total) as total 
       FROM ventas 
       WHERE fecha_venta BETWEEN $1 AND $2 AND estado = 'completada'
       GROUP BY DATE(fecha_venta) 
       ORDER BY fecha`,
      [fInicio, fFin]
    );

    const topProductos = await pool.query(
      `SELECT p.nombre, SUM(dv.cantidad) as cantidad_vendida 
       FROM detalle_ventas dv
       JOIN ventas v ON dv.venta_id = v.id
       JOIN productos p ON dv.producto_id = p.id
       WHERE v.fecha_venta BETWEEN $1 AND $2 AND v.estado = 'completada'
       GROUP BY p.id, p.nombre 
       ORDER BY cantidad_vendida DESC 
       LIMIT 5`,
      [fInicio, fFin]
    );

    const rendimientoCajeros = await pool.query(
      `SELECT u.username, COUNT(v.id) as transacciones, SUM(v.total) as total_vendido
       FROM ventas v
       JOIN usuarios u ON v.cajero_id = u.id
       WHERE v.fecha_venta BETWEEN $1 AND $2 AND v.estado = 'completada'
       GROUP BY u.username`,
      [fInicio, fFin]
    );

    res.json({
      success: true,
      kpi: kpiVentas.rows[0],
      grafico_dias: ventasPorDia.rows,
      top_productos: topProductos.rows,
      cajeros: rendimientoCajeros.rows
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ================================
// ✅ CU11: REPORTE CAJERO
// ================================
const getReporteCajero = async (req, res) => {
  try {
    const cajero_id = req.user.id;
    const { fechaInicio, fechaFin, montoMin, montoMax } = req.query;

    let query = `
      SELECT v.id, v.numero_venta, v.fecha_venta, v.metodo_pago, v.total, v.estado,
             (SELECT COUNT(*) FROM detalle_ventas WHERE venta_id = v.id) as items
      FROM ventas v
      WHERE v.cajero_id = $1
    `;
    
    const params = [cajero_id];
    let paramCount = 1;

    if (fechaInicio) {
      query += ` AND v.fecha_venta >= $${++paramCount}`;
      params.push(fechaInicio);
    }

    if (fechaFin) {
      query += ` AND v.fecha_venta <= $${++paramCount}::date + interval '1 day' - interval '1 second'`;
      params.push(fechaFin);
    }

    if (montoMin) {
      query += ` AND v.total >= $${++paramCount}`;
      params.push(montoMin);
    }

    if (montoMax) {
      query += ` AND v.total <= $${++paramCount}`;
      params.push(montoMax);
    }

    query += ` ORDER BY v.fecha_venta DESC`;

    const result = await pool.query(query, params);
    
    const totalRecaudado = result.rows.reduce((sum, v) => sum + Number(v.total), 0);

    res.json({
      success: true,
      ventas: result.rows,
      resumen: {
        total_recaudado: totalRecaudado,
        cantidad_transacciones: result.rows.length
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ================================
// ✅ DETALLE DE VENTA
// ================================
const getDetalleVenta = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT p.codigo, p.nombre, dv.cantidad, dv.precio_unitario, dv.subtotal
      FROM detalle_ventas dv
      JOIN productos p ON dv.producto_id = p.id
      WHERE dv.venta_id = $1
    `, [id]);

    res.json({
      success: true,
      detalles: result.rows
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ================================
// ✅ EXPORTAR EXCEL
// ================================

const exportarExcel = async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Ventas");

    const ventas = await pool.query(`
      SELECT numero_venta, fecha_venta, metodo_pago, total
      FROM ventas
      ORDER BY fecha_venta DESC
    `);

    worksheet.columns = [
      { header: "Ticket", key: "numero_venta", width: 15 },
      { header: "Fecha", key: "fecha_venta", width: 25 },
      { header: "Método", key: "metodo_pago", width: 15 },
      { header: "Total", key: "total", width: 15 }
    ];

    ventas.rows.forEach(v => worksheet.addRow(v));

    // ✅ CABECERAS CORRECTAS
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=reporte_ventas.xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error("ERROR EXCEL:", error);
    res.status(500).json({ success: false, error: "Error al generar Excel" });
  }
};

module.exports = {
  getReporteAdmin,
  getReporteCajero,
  getDetalleVenta,
  exportarExcel
};
