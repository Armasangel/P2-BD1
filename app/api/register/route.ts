// app/api/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import { AUTH_COOKIE, signAuthToken } from "@/lib/auth";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nombre, correo, telefono, contrasena } = body;

    if (!nombre || !correo || !contrasena) {
      return NextResponse.json(
        { error: "Nombre, correo y contraseña son obligatorios" },
        { status: 400 }
      );
    }
    if (contrasena.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      );
    }

    const hash = bcrypt.hashSync(contrasena, 10);

    const result = await pool.query(
      `INSERT INTO usuario (nombre, correo, telefono, contrasena_hash, tipo_usuario)
       VALUES ($1, $2, $3, $4, 'COMPRADOR')
       RETURNING id_usuario, nombre, correo, tipo_usuario`,
      [nombre, correo, telefono || null, hash]
    );

    const usuario = result.rows[0];
    const token   = signAuthToken(usuario);

    const response = NextResponse.json({ ok: true, usuario }, { status: 201 });
    response.cookies.set(AUTH_COOKIE, token, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 8,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch (error: any) {
    if (error.code === "23505") {
      const campo = error.constraint?.includes("telefono") ? "teléfono" : "correo";
      return NextResponse.json(
        { error: `El ${campo} ya está registrado` },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Error al crear cuenta", detalle: String(error) },
      { status: 500 }
    );
  }
}