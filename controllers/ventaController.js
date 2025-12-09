// controllers/ventaController.js
const pool = require("../config/database");

const realizarVenta = async (req, res) => {
  const client = await pool.connect();

  try {
    const { items, metodo_pago } = req.body;
    const cajero_id = req.user.id;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: "El carrito está vacío",
      });
    }

    await client.query("BEGIN");

    let subtotal = 0;

    // 1) Obtener precios reales y validar stock
    for (const item of items) {
      const productoDB = await client.query(
        "SELECT id, precio, stock FROM productos WHERE id = $1 FOR UPDATE",
        [item.producto_id]
      );

      if (productoDB.rows.length === 0) {
        throw new Error(`Producto con ID ${item.producto_id} no existe`);
      }

      const producto = productoDB.rows[0];

      if (producto.stock < item.cantidad) {
        throw new Error(`Stock insuficiente para producto ${item.producto_id}`);
      }

      item.precio = Number(producto.precio);
      subtotal += item.precio * item.cantidad;
    }

    const igv = subtotal * 0.18;
    const total = subtotal + igv;

    // 2) Generar número de venta
    const ventaCount = await client.query("SELECT COUNT(*) FROM ventas");
    const numero_venta = `V-${String(
      Number(ventaCount.rows[0].count) + 1
    ).padStart(6, "0")}`;

    // 3) Insertar venta
    const ventaResult = await client.query(
      `INSERT INTO ventas (numero_venta, fecha_venta, cajero_id, subtotal, igv, total, metodo_pago, estado)
       VALUES ($1, CURRENT_TIMESTAMP, $2, $3, $4, $5, $6, 'completada')
       RETURNING id`,
      [numero_venta, cajero_id, subtotal, igv, total, metodo_pago || "efectivo"]
    );

    const venta_id = ventaResult.rows[0].id;

    // 4) Detalle + actualizar stock
    for (const item of items) {
      await client.query(
        "UPDATE productos SET stock = stock - $1 WHERE id = $2",
        [item.cantidad, item.producto_id]
      );

      await client.query(
        `INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal)
         VALUES ($1, $2, $3, $4, $5)`,
        [venta_id, item.producto_id, item.cantidad, item.precio, item.precio * item.cantidad]
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      mensaje: "Venta realizada con éxito",
      venta_id,
      numero_venta,
      total,
      metodo_pago: metodo_pago || "efectivo",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("ERROR VENTA:", error.message);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  } finally {
    client.release();
  }
};

// 🔹 Obtener datos completos de un ticket para reimpresión
const obtenerTicket = async (req, res) => {
  try {
    const { id } = req.params;

    const ventaResult = await pool.query(
      "SELECT * FROM ventas WHERE id = $1",
      [id]
    );

    if (ventaResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Venta no encontrada" });
    }

    const detallesResult = await pool.query(
      `SELECT 
         p.nombre,
         p.codigo,
         dv.cantidad,
         dv.precio_unitario AS precio,
         dv.subtotal
       FROM detalle_ventas dv
       JOIN productos p ON p.id = dv.producto_id
       WHERE dv.venta_id = $1`,
      [id]
    );

    res.json({
      success: true,
      venta: ventaResult.rows[0],
      detalles: detallesResult.rows,
    });
  } catch (error) {
    console.error("ERROR obtenerTicket:", error.message);
    res.status(500).json({ success: false, error: "Error al obtener ticket" });
  }
};

// 👇 IMPORTANTE: exportar ambas funciones en un solo objeto
module.exports = { realizarVenta, obtenerTicket };
