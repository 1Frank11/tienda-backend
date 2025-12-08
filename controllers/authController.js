const pool = require("../config/database");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs"); 

const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validaciones básicas
    if (!username || !password) {
      return res.status(400).json({ 
        success: false,
        error: "Datos incompletos",
        mensaje: "Usuario y contraseña son requeridos" 
      });
    }

    // Buscar usuario
    const result = await pool.query(
      `SELECT id, username, password, rol, nombre_completo, activo 
       FROM usuarios WHERE username = $1`,
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        success: false,
        error: "Autenticación fallida",
        mensaje: "Usuario o contraseña incorrectos" 
      });
    }

    const usuario = result.rows[0];

    // Si activo es false (o null), deniega el acceso
    if (!usuario.activo) {
      return res.status(401).json({ 
        success: false,
        error: "Cuenta inactiva",
        mensaje: "Tu cuenta ha sido desactivada por un administrador." 
      });
    }

    // Verificar contraseña usando bcrypt
    const validPassword = await bcrypt.compare(password, usuario.password);

    if (!validPassword) {
      return res.status(401).json({ 
        success: false,
        error: "Autenticación fallida",
        mensaje: "Usuario o contraseña incorrectos" 
      });
    }

    // Generar JWT
    const token = jwt.sign(
      { 
        id: usuario.id, 
        username: usuario.username, 
        rol: usuario.rol 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      mensaje: "Login exitoso",
      token: token,
      usuario: {
        id: usuario.id,
        username: usuario.username,
        rol: usuario.rol,
        nombre_completo: usuario.nombre_completo
      }
    });

  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ 
      success: false,
      error: "Error interno del servidor",
      mensaje: "Ocurrió un error inesperado" 
    });
  }
};


const getProfile = async (req, res) => {
  try {
   
    const result = await pool.query(
      "SELECT id, username, rol, nombre_completo, email, activo FROM usuarios WHERE id = $1",
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: "Usuario no encontrado" 
      });
    }

    res.json({
      success: true,
      usuario: result.rows[0]
    });

  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

module.exports = { login, getProfile };