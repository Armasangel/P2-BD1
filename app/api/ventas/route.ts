// GET  — lista ventas con JOIN múltiple (cliente + empleado + items)
// POST — registra nueva venta con transacción explícita BEGIN/COMMIT/ROLLBACK

import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// GET
export async function GET() {
  try {
    const result = await pool.query(`
      SELECT
        v.id_venta,
        v.fecha_venta,
        v.tipo_venta,
        v.tipo_entrega,
        v.estado_venta,
        v.total,
        v.fecha_limite_pago,
        cliente.nombre   AS nombre_cliente,
        cliente.correo   AS correo_cliente,
        empleado.nombre  AS nombre_empleado,
        COUNT(dv.id_detalle_venta) AS total_items
      FROM venta v
      JOIN usuario cliente       ON cliente.id_usuario  = v.id_usuario
      LEFT JOIN usuario empleado ON empleado.id_usuario = v.id_empleado
      LEFT JOIN detalle_venta dv ON dv.id_venta         = v.id_venta
      GROUP BY v.id_venta, cliente.nombre, cliente.correo, empleado.nombre
      ORDER BY v.fecha_venta DESC
    `);
    return NextResponse.json({ ventas: result.rows });
  } catch (error) {
    return NextResponse.json({ error: "Error al consultar ventas", detalle: String(error) }, { status: 500 });
  }
}

//POST 
export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const { id_usuario, id_empleado, tipo_venta, tipo_entrega, direccion_entrega, fecha_limite_pago, items } = body;

    // Validaciones
    if (!id_usuario || !tipo_venta || !tipo_entrega) {
      return NextResponse.json({ error: "Faltan campos obligatorios: id_usuario, tipo_venta, tipo_entrega" }, { status: 400 });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "La venta debe tener al menos 1 producto" }, { status: 400 });
    }
    if (tipo_entrega === "DOMICILIO" && !direccion_entrega) {
      return NextResponse.json({ error: "Dirección de entrega requerida para envío a domicilio" }, { status: 400 });
    }

    // ── TRANSACCIÓN EXPLÍCITA ─────────────────────────────────────────────
    await client.query("BEGIN");

    try {
      // 1. Calcular total
      const total = items.reduce((sum: number, item: any) => {
        return sum + (Number(item.cantidad) * Number(item.precio_unitario));
      }, 0);

      // 2. Insertar la venta
      const ventaResult = await client.query(`
        INSERT INTO venta (id_usuario, id_empleado, tipo_venta, tipo_entrega, direccion_entrega, total, fecha_limite_pago, estado_venta)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDIENTE')
        RETURNING id_venta
      `, [
        id_usuario,
        id_empleado || null,
        tipo_venta,
        tipo_entrega,
        direccion_entrega || null,
        total,
        fecha_limite_pago || null,
      ]);

      const id_venta = ventaResult.rows[0].id_venta;

      // 3. Insertar cada línea de detalle y descontar stock
      for (const item of items) {
        const { id_producto, cantidad, precio_unitario } = item;
        const subtotal = Number(cantidad) * Number(precio_unitario);

        // Insertar detalle
        await client.query(`
          INSERT INTO detalle_venta (id_venta, id_producto, cantidad, precio_unitario, subtotal)
          VALUES ($1, $2, $3, $4, $5)
        `, [id_venta, id_producto, cantidad, precio_unitario, subtotal]);

        // Verificar stock disponible en cualquier bodega
        const stockResult = await client.query(`
          SELECT id_bodega, cantidad_disponible
          FROM bodega_producto
          WHERE id_producto = $1
            AND cantidad_disponible >= $2
          LIMIT 1
        `, [id_producto, cantidad]);

        if (stockResult.rowCount === 0) {
          // Sin stock suficiente → ROLLBACK
          await client.query("ROLLBACK");
          return NextResponse.json({
            error: `Stock insuficiente para el producto ID ${id_producto}`,
          }, { status: 400 });
        }

        const { id_bodega } = stockResult.rows[0];

        // Descontar stock
        await client.query(`
          UPDATE bodega_producto
          SET cantidad_disponible = cantidad_disponible - $1,
              ultima_actualizacion = NOW()
          WHERE id_bodega = $2 AND id_producto = $3
        `, [cantidad, id_bodega, id_producto]);

        // Registrar en kardex
        await client.query(`
          INSERT INTO kardex (id_bodega, id_producto, tipo_movimiento, cantidad, descripcion)
          VALUES ($1, $2, 'SALIDA', $3, $4)
        `, [id_bodega, id_producto, cantidad, `Venta #${id_venta}`]);
      }

      await client.query("COMMIT");

      return NextResponse.json({
        mensaje: "Venta registrada correctamente ✅",
        id_venta,
        total,
      }, { status: 201 });

    } catch (innerError) {
      await client.query("ROLLBACK");
      throw innerError;
    }

  } catch (error) {
    return NextResponse.json({ error: "Error al registrar venta", detalle: String(error) }, { status: 500 });
  } finally {
    client.release();
  }
}