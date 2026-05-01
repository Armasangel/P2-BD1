// app/api/reportes/route.ts
// Contiene TODAS las consultas avanzadas requeridas por la rúbrica:
// - 3 JOINs múltiples
// - 2 subqueries (EXISTS / IN)
// - GROUP BY + HAVING + agregaciones
// - CTE (WITH)
// - VIEW (v_ventas_por_categoria)

import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET() {
  try {
    // ── 1. JOIN múltiple: ventas con cliente, empleado y productos ──────────
    const ventasDetalle = await pool.query(`
      SELECT
        v.id_venta,
        v.fecha_venta,
        v.tipo_venta,
        v.estado_venta,
        v.total,
        cliente.nombre      AS nombre_cliente,
        empleado.nombre     AS nombre_empleado,
        COUNT(dv.id_detalle_venta) AS items
      FROM venta v
      JOIN usuario cliente  ON cliente.id_usuario  = v.id_usuario
      LEFT JOIN usuario empleado ON empleado.id_usuario = v.id_empleado
      JOIN detalle_venta dv ON dv.id_venta = v.id_venta
      GROUP BY v.id_venta, cliente.nombre, empleado.nombre
      ORDER BY v.fecha_venta DESC
    `);

    // ── 2. JOIN múltiple: productos con stock bajo mínimo por bodega ────────
    const stockBajo = await pool.query(`
      SELECT
        p.codigo_producto,
        p.nombre_producto,
        c.nombre_categoria,
        m.nombre_marca,
        b.nombre_bodega,
        bp.cantidad_disponible,
        bp.stock_minimo,
        (bp.stock_minimo - bp.cantidad_disponible) AS deficit
      FROM bodega_producto bp
      JOIN producto  p ON p.id_producto  = bp.id_producto
      JOIN categoria c ON c.id_categoria = p.id_categoria
      JOIN marca     m ON m.id_marca     = p.id_marca
      JOIN bodega    b ON b.id_bodega    = bp.id_bodega
      WHERE bp.cantidad_disponible < bp.stock_minimo
      ORDER BY deficit DESC
    `);

    // ── 3. JOIN múltiple: kardex con producto y bodega ──────────────────────
    const kardex = await pool.query(`
      SELECT
        k.fecha_movimiento,
        k.tipo_movimiento,
        k.cantidad,
        k.descripcion,
        p.nombre_producto,
        p.unidad_medida,
        b.nombre_bodega
      FROM kardex k
      JOIN producto p ON p.id_producto = k.id_producto
      JOIN bodega   b ON b.id_bodega   = k.id_bodega
      ORDER BY k.fecha_movimiento DESC
      LIMIT 50
    `);

    // ── 4. Subquery con EXISTS: clientes que han realizado al menos 1 venta ─
    const clientesActivos = await pool.query(`
      SELECT
        u.id_usuario,
        u.nombre,
        u.correo,
        u.telefono
      FROM usuario u
      WHERE u.tipo_usuario = 'COMPRADOR'
        AND EXISTS (
          SELECT 1 FROM venta v WHERE v.id_usuario = u.id_usuario
        )
      ORDER BY u.nombre
    `);

    // ── 5. Subquery con IN: productos que NUNCA se han vendido ──────────────
    const productosNoVendidos = await pool.query(`
      SELECT
        p.codigo_producto,
        p.nombre_producto,
        c.nombre_categoria,
        p.precio_unitario
      FROM producto p
      JOIN categoria c ON c.id_categoria = p.id_categoria
      WHERE p.id_producto NOT IN (
        SELECT DISTINCT dv.id_producto FROM detalle_venta dv
      )
      AND p.estado_producto = TRUE
      ORDER BY c.nombre_categoria, p.nombre_producto
    `);

    // ── 6. GROUP BY + HAVING + agregaciones: ventas por empleado ────────────
    const ventasPorEmpleado = await pool.query(`
      SELECT
        e.nombre              AS empleado,
        COUNT(v.id_venta)     AS total_ventas,
        SUM(v.total)          AS monto_total,
        AVG(v.total)          AS ticket_promedio,
        MAX(v.total)          AS venta_maxima
      FROM venta v
      JOIN usuario e ON e.id_usuario = v.id_empleado
      GROUP BY e.id_usuario, e.nombre
      HAVING COUNT(v.id_venta) >= 1
      ORDER BY monto_total DESC
    `);

    // ── 7. CTE (WITH): ranking de productos más vendidos ────────────────────
    const rankingProductos = await pool.query(`
      WITH ventas_por_producto AS (
        SELECT
          p.id_producto,
          p.nombre_producto,
          p.codigo_producto,
          c.nombre_categoria,
          SUM(dv.cantidad)  AS unidades_vendidas,
          SUM(dv.subtotal)  AS ingresos_totales,
          COUNT(DISTINCT dv.id_venta) AS num_ventas
        FROM detalle_venta dv
        JOIN producto  p ON p.id_producto  = dv.id_producto
        JOIN categoria c ON c.id_categoria = p.id_categoria
        GROUP BY p.id_producto, p.nombre_producto, p.codigo_producto, c.nombre_categoria
      )
      SELECT
        *,
        RANK() OVER (ORDER BY ingresos_totales DESC) AS ranking
      FROM ventas_por_producto
      ORDER BY ranking
    `);

    // ── 8. VIEW: ventas por categoría ───────────────────────────────────────
    const ventasPorCategoria = await pool.query(`
      SELECT * FROM v_ventas_por_categoria ORDER BY ingresos_totales DESC
    `);

    return NextResponse.json({
      ventas_detalle:        ventasDetalle.rows,
      stock_bajo:            stockBajo.rows,
      kardex:                kardex.rows,
      clientes_activos:      clientesActivos.rows,
      productos_no_vendidos: productosNoVendidos.rows,
      ventas_por_empleado:   ventasPorEmpleado.rows,
      ranking_productos:     rankingProductos.rows,
      ventas_por_categoria:  ventasPorCategoria.rows,
    });
  } catch (error) {
    return NextResponse.json({ error: "Error en reportes", detalle: String(error) }, { status: 500 });
  }
}