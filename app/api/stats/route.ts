// app/api/stats/route.ts
import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM producto WHERE estado_producto = TRUE)           AS productos,
        (SELECT COUNT(*) FROM venta)                                            AS ventas,
        (SELECT COUNT(*) FROM venta WHERE estado_venta = 'PENDIENTE')          AS pendientes,
        (SELECT COUNT(*) FROM proveedor WHERE estado_proveedor = TRUE)         AS proveedores
    `);
    const row = result.rows[0];
    return NextResponse.json({
      stats: {
        productos:   Number(row.productos),
        ventas:      Number(row.ventas),
        pendientes:  Number(row.pendientes),
        proveedores: Number(row.proveedores),
      }
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
