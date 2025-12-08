const express = require("express");
const { realizarVenta } = require("../controllers/ventaController");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

router.use(authenticateToken);
router.post("/", realizarVenta); // POST /api/ventas

module.exports = router;