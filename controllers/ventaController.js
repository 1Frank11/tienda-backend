const pool = require("../config/database");

const realizarVenta = async (req, res) => {
  const client = await pool.connect(); // Necesitamos cliente para transacción
  
  try {
    const { items, metodo_pago } = req.body; // items = [{id, cantidad, precio}, ...]
    const cajero_id = req.user.id; // Viene del token (middleware auth)

    // Validaciones
    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, error: "El carrito está vacío" });
    }

    await client.query('BEGIN'); // Inicia Transacción

    // 1. Calcular totales
    let subtotal = 0;
    items.forEach(item => {
      subtotal += item.precio * item.cantidad;
    });
    
    const igv = subtotal * 0.18; // Asumiendo IGV 18% Perú
    const total = subtotal + igv;

    // 2. Generar número de venta (simple para el ejemplo, idealmente usar una secuencia)
    const ventaCount = await client.query("SELECT COUNT(*) FROM ventas");
    const numero_venta = `V-${String(Number(ventaCount.rows[0].count) + 1).padStart(6, '0')}`;

    // 3. Insertar Venta
    const ventaResult = await client.query(
      `INSERT INTO ventas (numero_venta, fecha_venta, cajero_id, subtotal, igv, total, metodo_pago, estado)
       VALUES ($1, CURRENT_TIMESTAMP, $2, $3, $4, $5, $6, 'completada') 
       RETURNING id`,
      [numero_venta, cajero_id, subtotal, igv, total, metodo_pago || 'EFECTIVO']
    );
    
    const venta_id = ventaResult.rows[0].id;

    // 4. Procesar Detalle y Actualizar Stock
    for (const item of items) {
      // Verificar stock actual (bloqueo fila para evitar condiciones de carrera)
      const productoCheck = await client.query(
        "SELECT stock FROM productos WHERE id = $1 FOR UPDATE", 
        [item.id]
      );

      if (productoCheck.rows[0].stock < item.cantidad) {
        throw new Error(`Stock insuficiente para el producto ID: ${item.id}`);
      }

      // Restar stock
      await client.query(
        "UPDATE productos SET stock = stock - $1 WHERE id = $2",
        [item.cantidad, item.id]
      );

      // Insertar detalle
      await client.query(
        `INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal)
         VALUES ($1, $2, $3, $4, $5)`,
        [venta_id, item.id, item.cantidad, item.precio, item.precio * item.cantidad]
      );
    }

    await client.query('COMMIT'); // Confirma cambios

    res.status(201).json({
      success: true,
      mensaje: "Venta realizada con éxito",
      venta_id: venta_id,
      numero_venta: numero_venta
    });

  } catch (error) {
    await client.query('ROLLBACK'); // Deshace cambios si hay error
    console.error(error);
    res.status(500).json({ 
      success: false, 
      error: error.message || "Error al procesar la venta" 
    });
  } finally {
    client.release();
  }
};

module.exports = { realizarVenta };