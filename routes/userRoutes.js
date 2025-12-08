const express = require("express");
const { getUsuarios, crearUsuario, modificarUsuario, eliminarUsuario, eliminarUsuarioFisico } = require("../controllers/userController");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");
const router = express.Router();

router.use(authenticateToken); 
router.use(authorizeRoles('admin')); 

router.get("/", getUsuarios);
router.post("/", crearUsuario);
router.put("/:id", modificarUsuario);
router.delete("/:id", eliminarUsuario);
router.delete("/fisico/:id", eliminarUsuarioFisico);

module.exports = router;