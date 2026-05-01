// app/api/proveedores/[id]/route.ts
import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// PUT — actualizar proveedor
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

    const body = await request.json();
    const { nombre_proveedor, nit_proveedor, correo_contacto, telefono, estado_proveedor } = body;

    if (!nombre_proveedor || !nit_proveedor) {
      return NextResponse.json({ error: "Nombre y NIT son obligatorios" }, { status: 400 });
    }

    const result = await pool.query(`
      UPDATE proveedor SET
        nombre_proveedor = $1,
        nit_proveedor    = $2,
        correo_contacto  = $3,
        telefono         = $4,
        estado_proveedor = $5
      WHERE id_proveedor = $6
      RETURNING *
    `, [nombre_proveedor, nit_proveedor, correo_contacto || null, telefono || null, estado_proveedor ?? true, id]);

    if (result.rowCount === 0) return NextResponse.json({ error: "Proveedor no encontrado" }, { status: 404 });
    return NextResponse.json({ proveedor: result.rows[0] });
  } catch (error: any) {
    if (error.code === "23505") return NextResponse.json({ error: "El NIT ya está registrado" }, { status: 409 });
    return NextResponse.json({ error: "Error al actualizar proveedor", detalle: String(error) }, { status: 500 });
  }
}

// DELETE — soft delete
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

    const result = await pool.query(`
      UPDATE proveedor SET estado_proveedor = FALSE WHERE id_proveedor = $1 RETURNING id_proveedor
    `, [id]);

    if (result.rowCount === 0) return NextResponse.json({ error: "Proveedor no encontrado" }, { status: 404 });
    return NextResponse.json({ mensaje: "Proveedor desactivado correctamente" });
  } catch (error) {
    return NextResponse.json({ error: "Error al eliminar proveedor", detalle: String(error) }, { status: 500 });
  }
}