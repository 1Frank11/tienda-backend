const express = require("express");
const { getConfiguracion, exportarDatos } = require("../controllers/sistemaController");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");
const router = express.Router();

router.use(authenticateToken);


router.get("/config", getConfiguracion); 

// Exportar datos SOLO admin
router.get("/exportar", authorizeRoles('admin'), exportarDatos);

module.exports = router;