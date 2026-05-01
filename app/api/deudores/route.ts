// app/api/deudores/route.ts
// Consume la VIEW v_deudores definida en 01_schema.sql
import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT * FROM v_deudores ORDER BY deuda_pendiente DESC
    `);
    return NextResponse.json({ deudores: result.rows });
  } catch (error) {
    return NextResponse.json({ error: "Error al consultar deudores", detalle: String(error) }, { status: 500 });
  }
}