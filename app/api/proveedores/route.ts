// app/api/proveedores/route.ts
import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// GET — lista todos los proveedores con JOIN a productos que suministran
export async function GET() {
  try {
    const result = await pool.query(`
      SELECT
        pr.id_proveedor,
        pr.nombre_proveedor,
        pr.nit_proveedor,
        pr.correo_contacto,
        pr.telefono,
        pr.estado_proveedor,
        COUNT(pp.id_producto) AS total_productos
      FROM proveedor pr
      LEFT JOIN producto_proveedor pp ON pp.id_proveedor = pr.id_proveedor
      GROUP BY pr.id_proveedor
      ORDER BY pr.nombre_proveedor
    `);
    return NextResponse.json({ proveedores: result.rows });
  } catch (error) {
    return NextResponse.json({ error: "Error al consultar proveedores", detalle: String(error) }, { status: 500 });
  }
}

// POST — crear nuevo proveedor
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nombre_proveedor, nit_proveedor, correo_contacto, telefono } = body;

    if (!nombre_proveedor || !nit_proveedor) {
      return NextResponse.json({ error: "Nombre y NIT son obligatorios" }, { status: 400 });
    }

    const result = await pool.query(`
      INSERT INTO proveedor (nombre_proveedor, nit_proveedor, correo_contacto, telefono)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [nombre_proveedor, nit_proveedor, correo_contacto || null, telefono || null]);

    return NextResponse.json({ proveedor: result.rows[0] }, { status: 201 });
  } catch (error: any) {
    if (error.code === "23505") return NextResponse.json({ error: "El NIT ya está registrado" }, { status: 409 });
    return NextResponse.json({ error: "Error al crear proveedor", detalle: String(error) }, { status: 500 });
  }
}