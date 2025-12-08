const pool = require("../config/database");

// CU10: Reporte Admin Completo (Dashboard)
const getReporteAdmin = async (req, res) => {
  const { fechaInicio, fechaFin } = req.query; // Filtros de fecha
  
  // Si no envían fechas, usar el mes actual por defecto
  const fInicio = fechaInicio || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const fFin = fechaFin || new Date().toISOString();

  try {
    // 1. KPI: Total Ventas en el rango
    const kpiVentas = await pool.query(
      `SELECT COUNT(*) as cantidad, COALESCE(SUM(total), 0) as total_dinero 
       FROM ventas 
       WHERE fecha_venta BETWEEN $1 AND $2 AND estado = 'completada'`,
      [fInicio, fFin]
    );

    // 2. Gráfico: Ventas por día (Tendencias)
    const ventasPorDia = await pool.query(
      `SELECT DATE(fecha_venta) as fecha, SUM(total) as total 
       FROM ventas 
       WHERE fecha_venta BETWEEN $1 AND $2 AND estado = 'completada'
       GROUP BY DATE(fecha_venta) 
       ORDER BY fecha`,
      [fInicio, fFin]
    );

    // 3. Top Productos (Productos más vendidos)
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

    // 4. Rendimiento por Cajero
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
    res.status(500).json({ success: false, error: error.message });
  }
};

// CU11: Reporte Operativo Cajero
const getReporteCajero = async (req, res) => {
  try {
    const cajero_id = req.user.id;
    const { fechaInicio, fechaFin, montoMin, montoMax } = req.query;

    // Construcción dinámica de la consulta
    let query = `
      SELECT v.id, v.numero_venta, v.fecha_venta, v.metodo_pago, v.total, v.estado,
             (SELECT COUNT(*) FROM detalle_ventas WHERE venta_id = v.id) as items
      FROM ventas v
      WHERE v.cajero_id = $1
    `;
    
    const params = [cajero_id];
    let paramCount = 1;

    // Filtro de Fechas
    if (fechaInicio) {
      paramCount++;
      query += ` AND v.fecha_venta >= $${paramCount}`;
      params.push(fechaInicio);
    }
    if (fechaFin) {
      // Ajustamos fecha fin para incluir todo el día (hasta 23:59:59)
      paramCount++;
      query += ` AND v.fecha_venta <= $${paramCount}::date + interval '1 day' - interval '1 second'`;
      params.push(fechaFin);
    }

    // Filtro de Montos
    if (montoMin) {
      paramCount++;
      query += ` AND v.total >= $${paramCount}`;
      params.push(montoMin);
    }
    if (montoMax) {
      paramCount++;
      query += ` AND v.total <= $${paramCount}`;
      params.push(montoMax);
    }

    query += ` ORDER BY v.fecha_venta DESC`;

    const result = await pool.query(query, params);
    
    // Calcular totales del resultado actual
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
    res.status(500).json({ success: false, error: error.message });
  }
};

// NUEVA FUNCIÓN: Obtener productos de una venta específica
const getDetalleVenta = async (req, res) => {
  try {
    const { id } = req.params; // ID de la venta
    
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
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { getReporteAdmin, getReporteCajero, getDetalleVenta };