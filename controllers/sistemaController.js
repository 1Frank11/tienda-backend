const pool = require("../config/database");

// CU13: Gestionar Configuración (Consultar)
const getConfiguracion = async (req, res) => {
    // Simulado si no hay tabla. Si creas tabla 'configuracion', haz SELECT *
    res.json({
        success: true,
        config: {
            nombre_tienda: "Mi Tienda Minorista",
            moneda: "PEN",
            igv_porcentaje: 0.18,
            direccion: "Av. Principal 123, Lima"
        }
    });
};

// CU12: Entregar Datos (Backup/Exportación completa)
const exportarDatos = async (req, res) => {
    try {
        // Obtener toda la data relevante para backup
        const productos = await pool.query("SELECT * FROM productos");
        const ventas = await pool.query("SELECT * FROM ventas");
        const detalle = await pool.query("SELECT * FROM detalle_ventas");
        
        const backupData = {
            fecha_exportacion: new Date(),
            generado_por: req.user.username,
            data: {
                productos: productos.rows,
                ventas: ventas.rows,
                detalles: detalle.rows
            }
        };

        // Enviar como JSON descargable
        res.header("Content-Type", "application/json");
        res.attachment(`backup_sistema_${Date.now()}.json`);
        res.send(JSON.stringify(backupData, null, 2));

    } catch (error) {
        res.status(500).json({ success: false, error: "Error al exportar datos" });
    }
};

module.exports = { getConfiguracion, exportarDatos };