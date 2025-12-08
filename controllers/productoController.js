const pool = require("../config/database");

const getProductos = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.id, p.codigo, p.nombre, p.descripcion, p.precio, p.stock, 
             p.stock_minimo, p.ubicacion,
             c.nombre as categoria, c.id as categoria_id
      FROM productos p 
      JOIN categorias c ON p.categoria_id = c.id 
      WHERE p.activo = true
      ORDER BY p.nombre
    `);
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
      usuario: req.user.username
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

const buscarProductos = async (req, res) => {
  try {
    const { criterio, valor } = req.query;
    
    let query = `
      SELECT p.id, p.codigo, p.nombre, p.precio, p.stock, c.nombre as categoria
      FROM productos p 
      JOIN categorias c ON p.categoria_id = c.id 
      WHERE p.activo = true
    `;

    if (criterio && valor) {
      switch (criterio.toLowerCase()) {
        case 'codigo':
          query += ` AND p.codigo ILIKE '%${valor}%'`;
          break;
        case 'nombre':
          query += ` AND p.nombre ILIKE '%${valor}%'`;
          break;
        case 'categoria':
          query += ` AND c.nombre ILIKE '%${valor}%'`;
          break;
        case 'ubicacion':
          query += ` AND (p.ubicacion_estante ILIKE '%${valor}%' OR p.ubicacion_piso ILIKE '%${valor}%')`;
          break;
        default:
          query += ` AND (p.nombre ILIKE '%${valor}%' OR p.codigo ILIKE '%${valor}%')`;
      }
    }

    query += " ORDER BY p.nombre";
    const result = await pool.query(query);
    
    res.json({
      success: true,
      criterio: criterio,
      valor: valor,
      resultados: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

const getStockBajo = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.id, p.codigo, p.nombre, p.stock, p.stock_minimo, c.nombre as categoria
      FROM productos p 
      JOIN categorias c ON p.categoria_id = c.id 
      WHERE p.stock <= p.stock_minimo AND p.activo = true
      ORDER BY (p.stock::float / p.stock_minimo) ASC
    `);
    
    res.json({
      success: true,
      alertas: result.rows,
      total_alertas: result.rows.length,
      mensaje: result.rows.length > 0 ? "Hay productos con stock bajo" : "Todo el stock está bien"
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

const crearProducto = async (req, res) => {
  try {
    const { codigo, nombre, precio, stock, categoria_id } = req.body;
    
    // Validaciones básicas
    if (!codigo || !nombre || !precio) {
      return res.status(400).json({
        success: false,
        error: "Datos incompletos",
        mensaje: "Código, nombre y precio son requeridos"
      });
    }

    const result = await pool.query(
      `INSERT INTO productos (codigo, nombre, precio, stock, categoria_id) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [codigo, nombre, precio, stock || 0, categoria_id || 1]
    );

    res.status(201).json({
      success: true,
      mensaje: "Producto creado exitosamente",
      producto: result.rows[0]
    });

  } catch (error) {
    if (error.code === '23505') { // Violación de unique constraint
      res.status(400).json({
        success: false,
        error: "Código duplicado",
        mensaje: "Ya existe un producto con ese código"
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
};

const actualizarProducto = async (req, res) => {
  const { id } = req.params;
  const { nombre, precio, stock, stock_minimo, categoria_id, ubicacion } = req.body;

  try {
    const result = await pool.query(
      `UPDATE productos 
       SET nombre = $1, precio = $2, stock = $3, stock_minimo = $4, 
           categoria_id = $5, ubicacion = $6, fecha_actualizacion = CURRENT_TIMESTAMP
       WHERE id = $7 RETURNING *`,
      [nombre, precio, stock, stock_minimo, categoria_id, ubicacion, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: "Producto no encontrado" });
    }

    res.json({ success: true, mensaje: "Producto actualizado", producto: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const eliminarProducto = async (req, res) => {
  const { id } = req.params;
  try {
    
    const result = await pool.query(
      "UPDATE productos SET activo = false WHERE id = $1 RETURNING id",
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: "Producto no encontrado" });
    }

    res.json({ success: true, mensaje: "Producto eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
 getProductos,
  buscarProductos,
  getStockBajo,
  crearProducto,
  actualizarProducto, 
  eliminarProducto    
};