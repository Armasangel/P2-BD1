// app/api/productos/route.ts
import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// GET — lista todos los productos con JOIN a categoria y marca
export async function GET() {
  try {
    const result = await pool.query(`
      SELECT
        p.id_producto,
        p.codigo_producto,
        p.nombre_producto,
        p.precio_unitario,
        p.precio_mayoreo,
        p.unidad_medida,
        p.estado_producto,
        p.caducidad,
        p.exento_iva,
        p.id_categoria,
        p.id_marca,
        c.nombre_categoria,
        m.nombre_marca
      FROM producto p
      JOIN categoria c ON c.id_categoria = p.id_categoria
      JOIN marca     m ON m.id_marca     = p.id_marca
      ORDER BY p.nombre_producto
    `);
    return NextResponse.json({ productos: result.rows });
  } catch (error) {
    return NextResponse.json({ error: "Error al consultar productos", detalle: String(error) }, { status: 500 });
  }
}

// POST — crear nuevo producto
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { codigo_producto, nombre_producto, precio_unitario, precio_mayoreo, unidad_medida, id_categoria, id_marca, caducidad, exento_iva } = body;

    if (!codigo_producto || !nombre_producto || !unidad_medida || !id_categoria || !id_marca) {
      return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
    }

    const result = await pool.query(`
      INSERT INTO producto (codigo_producto, nombre_producto, precio_unitario, precio_mayoreo, unidad_medida, id_categoria, id_marca, caducidad, exento_iva)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [codigo_producto, nombre_producto, precio_unitario || null, precio_mayoreo || null, unidad_medida, id_categoria, id_marca, caducidad || false, exento_iva || false]);

    return NextResponse.json({ producto: result.rows[0] }, { status: 201 });
  } catch (error: any) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "El código de producto ya existe" }, { status: 409 });
    }
    return NextResponse.json({ error: "Error al crear producto", detalle: String(error) }, { status: 500 });
  }
}