// app/api/productos/[id]/route.ts
import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// PUT — actualizar producto
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

    const body = await request.json();
    const { codigo_producto, nombre_producto, precio_unitario, precio_mayoreo, unidad_medida, id_categoria, id_marca, caducidad, exento_iva, estado_producto } = body;

    if (!codigo_producto || !nombre_producto || !unidad_medida || !id_categoria || !id_marca) {
      return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
    }

    const result = await pool.query(`
      UPDATE producto SET
        codigo_producto = $1,
        nombre_producto = $2,
        precio_unitario = $3,
        precio_mayoreo  = $4,
        unidad_medida   = $5,
        id_categoria    = $6,
        id_marca        = $7,
        caducidad       = $8,
        exento_iva      = $9,
        estado_producto = $10
      WHERE id_producto = $11
      RETURNING *
    `, [codigo_producto, nombre_producto, precio_unitario || null, precio_mayoreo || null, unidad_medida, id_categoria, id_marca, caducidad ?? false, exento_iva ?? false, estado_producto ?? true, id]);

    if (result.rowCount === 0) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    return NextResponse.json({ producto: result.rows[0] });
  } catch (error: any) {
    if (error.code === "23505") return NextResponse.json({ error: "El código de producto ya existe" }, { status: 409 });
    return NextResponse.json({ error: "Error al actualizar producto", detalle: String(error) }, { status: 500 });
  }
}

// DELETE — desactivar producto (soft delete)
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

    const result = await pool.query(`
      UPDATE producto SET estado_producto = FALSE WHERE id_producto = $1 RETURNING id_producto
    `, [id]);

    if (result.rowCount === 0) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    return NextResponse.json({ mensaje: "Producto desactivado correctamente" });
  } catch (error) {
    return NextResponse.json({ error: "Error al eliminar producto", detalle: String(error) }, { status: 500 });
  }
}