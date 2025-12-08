const pool = require("../config/database");
const bcrypt = require("bcrypt");


const getUsuarios = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, email, nombre_completo, rol, documento_identidad, 
              activo, fecha_ingreso, fecha_creacion 
       FROM usuarios 
       ORDER BY nombre_completo`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};


const crearUsuario = async (req, res) => {

  const { username, password, email, nombre_completo, documento_identidad, rol } = req.body;
  
  try {
    // Validar duplicados (Usuario, Documento O EMAIL)
    const checkUser = await pool.query(
      "SELECT * FROM usuarios WHERE username = $1 OR documento_identidad = $2 OR email = $3", 
      [username, documento_identidad, email]
    );

    if (checkUser.rows.length > 0) {
      return res.status(400).json({ success: false, mensaje: "El usuario, documento o email ya existe" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

   
    const result = await pool.query(
      `INSERT INTO usuarios (username, password, email, nombre_completo, documento_identidad, rol, activo, fecha_ingreso)
       VALUES ($1, $2, $3, $4, $5, $6, true, CURRENT_DATE) 
       RETURNING id, username, nombre_completo, email`,
      [username, hashedPassword, email, nombre_completo, documento_identidad, rol]
    );

    res.status(201).json({ success: true, mensaje: "Usuario creado", usuario: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Modificar Usuario (Editar datos o reset password)
const modificarUsuario = async (req, res) => {
  const { id } = req.params;
  const { nombre_completo, rol, activo, password, email } = req.body;
  
  try {
    let query = "UPDATE usuarios SET nombre_completo = $1, rol = $2, activo = $3, email = $4";
    let params = [nombre_completo, rol, activo, email]; 

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query += ", password = $5"; // El índice sube a 5
      params.push(hashedPassword);
    }

    query += ` WHERE id = $${params.length + 1} RETURNING *`;
    params.push(id);

    const result = await pool.query(query, params);
    
    res.json({ success: true, mensaje: "Usuario actualizado", usuario: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const eliminarUsuario = async (req, res) => {
    // Soft delete para mantener historial de ventas
    const { id } = req.params;
    try {
        await pool.query("UPDATE usuarios SET activo = false WHERE id = $1", [id]);
        res.json({ success: true, mensaje: "Usuario desactivado correctamente" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Borrado Físico (SOLO SI NO TIENE VENTAS ASOCIADAS)
const eliminarUsuarioFisico = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query("DELETE FROM usuarios WHERE id = $1 RETURNING *", [id]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, error: "Usuario no encontrado" });
        }
        res.json({ success: true, mensaje: "Usuario eliminado permanentemente de la BD" });
    } catch (error) {
        // Error de llave foránea (Si el usuario ya hizo ventas, la BD no dejará borrarlo)
        if (error.code === '23503') { 
            res.status(400).json({ success: false, error: "No se puede eliminar: El usuario tiene ventas registradas." });
        } else {
            res.status(500).json({ success: false, error: error.message });
        }
    }
};

module.exports = { getUsuarios, crearUsuario, modificarUsuario, eliminarUsuario,eliminarUsuarioFisico };