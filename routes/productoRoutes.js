  const express = require("express");
  const { 
    getProductos, 
    buscarProductos, 
    getStockBajo,
    crearProducto, 
    actualizarProducto, 
    eliminarProducto
  } = require("../controllers/productoController");
  const { authenticateToken, authorizeRoles } = require("../middleware/auth");

  const router = express.Router();

  // Todas las rutas requieren autenticación
  router.use(authenticateToken);

  // Rutas para todos los usuarios autenticados
  router.get("/", getProductos);
  router.get("/buscar", buscarProductos);
  router.get("/stock-bajo", getStockBajo);
  
  // Rutas solo para admin
  router.post("/", authorizeRoles('admin'), crearProducto); 
  router.put("/:id", authorizeRoles('admin'), actualizarProducto);
  router.delete("/:id", authorizeRoles('admin'), eliminarProducto);

  module.exports = router;