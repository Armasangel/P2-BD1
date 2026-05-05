// app/api/kardex/route.ts
import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET() {
  try {
    const result = await pool.query(`
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
      LIMIT 30
    `);
    return NextResponse.json({ kardex: result.rows });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}