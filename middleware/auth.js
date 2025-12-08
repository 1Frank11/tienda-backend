const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      success: false,
      error: "Acceso denegado", 
      mensaje: "Token de acceso requerido" 
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ 
        success: false,
        error: "Token inválido", 
        mensaje: "Tu sesión ha expirado o es inválida" 
      });
    }
    req.user = user;
    next();
  });
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({ 
        success: false,
        error: "Permisos insuficientes", 
        mensaje: "No tienes permisos para realizar esta acción" 
      });
    }
    next();
  };
};

module.exports = { authenticateToken, authorizeRoles };