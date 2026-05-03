// app/api/usuarios/route.ts
import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT id_usuario, nombre, correo, tipo_usuario
      FROM usuario
      WHERE estado_usuario = TRUE
      ORDER BY tipo_usuario, nombre
    `);
    return NextResponse.json({ usuarios: result.rows });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}