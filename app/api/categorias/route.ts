// app/api/categorias/route.ts
import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET() {
  try {
    const result = await pool.query(`SELECT id_categoria, nombre_categoria FROM categoria ORDER BY nombre_categoria`);
    return NextResponse.json({ categorias: result.rows });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}