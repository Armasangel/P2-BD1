// app/api/marcas/route.ts
import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET() {
  try {
    const result = await pool.query(`SELECT id_marca, nombre_marca FROM marca ORDER BY nombre_marca`);
    return NextResponse.json({ marcas: result.rows });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}