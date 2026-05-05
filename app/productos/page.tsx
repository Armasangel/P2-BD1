"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getNav, ROL_COLOR, ROL_LABEL } from "@/lib/nav";

const EMPTY = {
  codigo_producto: "", nombre_producto: "", precio_unitario: "",
  precio_mayoreo: "", unidad_medida: "", id_categoria: "",
  id_marca: "", caducidad: false, exento_iva: false, estado_producto: true,
};

export default function ProductosPage() {
  const router = useRouter();
  const [usuario, setUsuario]       = useState<any>(null);
  const [productos, setProductos]   = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [marcas, setMarcas]         = useState<any[]>([]);
  const [modal, setModal]           = useState(false);
  const [form, setForm]             = useState<any>(EMPTY);
  const [editId, setEditId]         = useState<number | null>(null);
  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState("");
  const [loading, setLoading]       = useState(false);
  const [busqueda, setBusqueda]     = useState("");

  useEffect(() => {
    fetch("/api/sesion").then(r => r.json()).then(d => {
      if (!d.usuario) { router.replace("/login"); return; }
      // Solo DUENO y EMPLEADO pueden ver esta página
      if (d.usuario.tipo_usuario === "COMPRADOR") { router.replace("/pedidos"); return; }
      setUsuario(d.usuario);
    });
    cargarDatos();
  }, []);

  async function cargarDatos() {
    const [p, c, m] = await Promise.all([
      fetch("/api/productos").then(r => r.json()),
      fetch("/api/categorias").then(r => r.json()),
      fetch("/api/marcas").then(r => r.json()),
    ]);
    setProductos(p.productos || []);
    setCategorias(c.categorias || []);
    setMarcas(m.marcas || []);
  }

  function abrirCrear() {
    setForm(EMPTY); setEditId(null); setError(""); setModal(true);
  }

  function abrirEditar(p: any) {
    setForm({
      codigo_producto: p.codigo_producto,
      nombre_producto: p.nombre_producto,
      precio_unitario: p.precio_unitario ?? "",
      precio_mayoreo:  p.precio_mayoreo  ?? "",
      unidad_medida:   p.unidad_medida,
      id_categoria:    p.id_categoria,
      id_marca:        p.id_marca,
      caducidad:       p.caducidad,
      exento_iva:      p.exento_iva,
      estado_producto: p.estado_producto,
    });
    setEditId(p.id_producto);
    setError("");
    setModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const url    = editId ? `/api/productos/${editId}` : "/api/productos";
      const method = editId ? "PUT" : "POST";
      const res    = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Error al guardar"); return; }
      setSuccess(editId ? "Producto actualizado ✅" : "Producto creado ✅");
      setModal(false);
      cargarDatos();
      setTimeout(() => setSuccess(""), 3000);
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  }

  async function handleEliminar(id: number, nombre: string) {
    if (!confirm(`¿Desactivar "${nombre}"?`)) return;
    const res  = await fetch(`/api/productos/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) { alert(data.error); return; }
    setSuccess("Producto desactivado ✅");
    cargarDatos();
    setTimeout(() => setSuccess(""), 3000);
  }

  const productosFiltrados = productos.filter(p =>
    p.nombre_producto.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.codigo_producto.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.nombre_categoria.toLowerCase().includes(busqueda.toLowerCase())
  );

  if (!usuario) return <div style={{ padding: "2rem", color: "var(--muted)" }}>Cargando…</div>;

  const nav      = getNav(usuario.tipo_usuario);
  const rolColor = ROL_COLOR[usuario.tipo_usuario] ?? "var(--muted)";
  const rolLabel = ROL_LABEL[usuario.tipo_usuario] ?? usuario.tipo_usuario;
  const inicial  = usuario.nombre[0]?.toUpperCase() ?? "?";

  return (
    <div style={s.shell}>
      {/* Sidebar */}
      <aside style={s.sidebar}>
        <div style={s.sidebarTop}>
          <div style={s.sidebarLogo}>
            <span>🌱</span>
            <span style={s.sidebarLogoText}>AgroStock</span>
          </div>
          <nav style={s.nav}>
            {nav.map(item => (
              <Link key={item.href} href={item.href} style={{
                ...s.navLink,
                ...(item.href === "/productos" ? s.navLinkActive : {}),
              }}>
                <span style={s.navIcon}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
        <div style={s.sidebarBottom}>
          <div style={s.userBadge}>
            <div style={{ ...s.userAvatar, background: rolColor }}>{inicial}</div>
            <div>
              <div style={{ fontSize: "0.82rem", fontWeight: 500, color: "var(--text)" }}>{usuario.nombre}</div>
              <div style={{ fontSize: "0.72rem", color: rolColor }}>{rolLabel}</div>
            </div>
          </div>
          <button onClick={async () => { await fetch("/api/logout", { method: "POST" }); router.replace("/login"); }} style={s.logoutBtn}>← Salir</button>
        </div>
      </aside>

      {/* Main */}
      <main style={s.main}>
        <div style={s.topbar}>
          <div>
            <h1 style={s.pageTitle}>Productos</h1>
            <p style={{ color: "var(--muted)", fontSize: "0.88rem" }}>
              Gestión de catálogo — {productos.length} productos registrados
            </p>
          </div>
          <button onClick={abrirCrear} style={s.btnPrimary}>+ Nuevo producto</button>
        </div>

        {success && <div style={s.successBox}>{success}</div>}

        <input
          placeholder="Buscar por nombre, código o categoría…"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={s.search}
        />

        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                {["Código", "Producto", "Categoría", "Marca", "Precio Unit.", "Precio Mayor.", "Estado", "Acciones"].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {productosFiltrados.length === 0 ? (
                <tr><td colSpan={8} style={{ ...s.td, textAlign: "center", color: "var(--muted)", padding: "2rem" }}>Sin resultados</td></tr>
              ) : productosFiltrados.map((p, i) => (
                <tr key={p.id_producto} style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,.02)" }}>
                  <td style={s.td}><code style={s.code}>{p.codigo_producto}</code></td>
                  <td style={{ ...s.td, fontWeight: 500 }}>{p.nombre_producto}</td>
                  <td style={s.td}>{p.nombre_categoria}</td>
                  <td style={s.td}>{p.nombre_marca}</td>
                  <td style={{ ...s.td, textAlign: "right" }}>
                    {p.precio_unitario ? `Q${Number(p.precio_unitario).toFixed(2)}` : "—"}
                  </td>
                  <td style={{ ...s.td, textAlign: "right" }}>
                    {p.precio_mayoreo ? `Q${Number(p.precio_mayoreo).toFixed(2)}` : "—"}
                  </td>
                  <td style={s.td}>
                    <span style={{ ...s.badge, background: p.estado_producto ? "rgba(63,185,80,.15)" : "rgba(248,81,73,.15)", color: p.estado_producto ? "var(--green)" : "var(--red)" }}>
                      {p.estado_producto ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td style={s.td}>
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      <button onClick={() => abrirEditar(p)} style={s.btnEdit}>Editar</button>
                      {p.estado_producto && (
                        <button onClick={() => handleEliminar(p.id_producto, p.nombre_producto)} style={s.btnDel}>Desactivar</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* Modal */}
      {modal && (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div style={s.modalBox}>
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}>{editId ? "Editar producto" : "Nuevo producto"}</h2>
              <button onClick={() => setModal(false)} style={s.closeBtn}>✕</button>
            </div>

            <form onSubmit={handleSubmit} style={s.form}>
              <div style={s.formGrid}>
                <Field label="Código *">
                  <input style={s.input} value={form.codigo_producto} onChange={e => setForm({ ...form, codigo_producto: e.target.value })} placeholder="FER-001" required />
                </Field>
                <Field label="Nombre *">
                  <input style={s.input} value={form.nombre_producto} onChange={e => setForm({ ...form, nombre_producto: e.target.value })} placeholder="Urea 46% 50kg" required />
                </Field>
                <Field label="Categoría *">
                  <select style={s.input} value={form.id_categoria} onChange={e => setForm({ ...form, id_categoria: e.target.value })} required>
                    <option value="">Seleccionar…</option>
                    {categorias.map(c => <option key={c.id_categoria} value={c.id_categoria}>{c.nombre_categoria}</option>)}
                  </select>
                </Field>
                <Field label="Marca *">
                  <select style={s.input} value={form.id_marca} onChange={e => setForm({ ...form, id_marca: e.target.value })} required>
                    <option value="">Seleccionar…</option>
                    {marcas.map(m => <option key={m.id_marca} value={m.id_marca}>{m.nombre_marca}</option>)}
                  </select>
                </Field>
                <Field label="Precio unitario">
                  <input style={s.input} type="number" step="0.01" min="0" value={form.precio_unitario} onChange={e => setForm({ ...form, precio_unitario: e.target.value })} placeholder="0.00" />
                </Field>
                <Field label="Precio mayoreo">
                  <input style={s.input} type="number" step="0.01" min="0" value={form.precio_mayoreo} onChange={e => setForm({ ...form, precio_mayoreo: e.target.value })} placeholder="0.00" />
                </Field>
                <Field label="Unidad de medida *">
                  <input style={s.input} value={form.unidad_medida} onChange={e => setForm({ ...form, unidad_medida: e.target.value })} placeholder="saco, litro, unidad…" required />
                </Field>
                {editId && (
                  <Field label="Estado">
                    <select style={s.input} value={String(form.estado_producto)} onChange={e => setForm({ ...form, estado_producto: e.target.value === "true" })}>
                      <option value="true">Activo</option>
                      <option value="false">Inactivo</option>
                    </select>
                  </Field>
                )}
              </div>

              <div style={{ display: "flex", gap: "1.5rem", marginTop: "0.5rem" }}>
                <label style={s.checkLabel}>
                  <input type="checkbox" checked={form.caducidad} onChange={e => setForm({ ...form, caducidad: e.target.checked })} />
                  <span>Tiene caducidad</span>
                </label>
                <label style={s.checkLabel}>
                  <input type="checkbox" checked={form.exento_iva} onChange={e => setForm({ ...form, exento_iva: e.target.checked })} />
                  <span>Exento de IVA</span>
                </label>
              </div>

              {error && <div style={s.errorBox}>⚠️ {error}</div>}

              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1rem" }}>
                <button type="button" onClick={() => setModal(false)} style={s.btnSecondary}>Cancelar</button>
                <button type="submit" disabled={loading} style={{ ...s.btnPrimary, opacity: loading ? 0.7 : 1 }}>
                  {loading ? "Guardando…" : editId ? "Actualizar" : "Crear producto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
      <label style={{ fontSize: "0.8rem", color: "var(--muted)", fontWeight: 500 }}>{label}</label>
      {children}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  shell:       { display: "flex", minHeight: "100vh", fontFamily: "var(--font-body)" },
  sidebar:     { width: 220, flexShrink: 0, background: "var(--surface)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", justifyContent: "space-between", position: "sticky", top: 0, height: "100vh" },
  sidebarTop:  { padding: "1.5rem 1rem" },
  sidebarLogo: { display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "2rem" },
  sidebarLogoText: { fontFamily: "var(--font-head)", fontSize: "1.2rem", fontWeight: 800, color: "var(--accent)" },
  nav:         { display: "flex", flexDirection: "column", gap: "0.2rem" },
  navLink:     { display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.55rem 0.75rem", borderRadius: 8, color: "var(--muted)", fontSize: "0.88rem", textDecoration: "none" },
  navLinkActive: { background: "rgba(232,160,69,.12)", color: "var(--accent)" },
  navIcon:     { fontSize: "1rem", width: 20, textAlign: "center" },
  sidebarBottom: { padding: "1rem", borderTop: "1px solid var(--border)" },
  userBadge:   { display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.8rem" },
  userAvatar:  { width: 32, height: 32, borderRadius: "50%", color: "#0d1117", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-head)", fontSize: "0.9rem", fontWeight: 700, flexShrink: 0 },
  logoutBtn:   { width: "100%", background: "transparent", border: "1px solid var(--border)", borderRadius: 8, color: "var(--muted)", padding: "0.45rem 0.75rem", fontSize: "0.82rem", cursor: "pointer", textAlign: "left" },
  main:        { flex: 1, padding: "2rem", overflowY: "auto" },
  topbar:      { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" },
  pageTitle:   { fontFamily: "var(--font-head)", fontSize: "1.6rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.2rem" },
  btnPrimary:  { background: "var(--accent)", color: "#0d1117", border: "none", borderRadius: 8, padding: "0.6rem 1.2rem", fontFamily: "var(--font-head)", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer" },
  btnSecondary:{ background: "transparent", color: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, padding: "0.6rem 1.2rem", fontSize: "0.9rem", cursor: "pointer" },
  btnEdit:     { background: "rgba(88,166,255,.12)", color: "var(--blue)", border: "1px solid rgba(88,166,255,.25)", borderRadius: 6, padding: "0.3rem 0.7rem", fontSize: "0.8rem", cursor: "pointer" },
  btnDel:      { background: "rgba(248,81,73,.1)", color: "var(--red)", border: "1px solid rgba(248,81,73,.25)", borderRadius: 6, padding: "0.3rem 0.7rem", fontSize: "0.8rem", cursor: "pointer" },
  search:      { width: "100%", maxWidth: 420, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "0.6rem 1rem", color: "var(--text)", fontSize: "0.9rem", outline: "none", marginBottom: "1rem" },
  successBox:  { background: "rgba(63,185,80,.12)", border: "1px solid rgba(63,185,80,.3)", borderRadius: 8, padding: "0.75rem 1rem", color: "var(--green)", marginBottom: "1rem", fontSize: "0.9rem" },
  errorBox:    { background: "rgba(248,81,73,.1)", border: "1px solid rgba(248,81,73,.3)", borderRadius: 8, padding: "0.7rem 1rem", color: "var(--red)", fontSize: "0.85rem", marginTop: "0.5rem" },
  tableWrap:   { overflowX: "auto", border: "1px solid var(--border)", borderRadius: 12 },
  table:       { width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" },
  th:          { padding: "0.75rem 1rem", textAlign: "left", borderBottom: "1px solid var(--border)", color: "var(--muted)", fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" },
  td:          { padding: "0.75rem 1rem", borderBottom: "1px solid var(--border)", color: "var(--text)", verticalAlign: "middle" },
  badge:       { display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: 20, fontSize: "0.75rem", fontWeight: 500 },
  code:        { fontFamily: "monospace", fontSize: "0.82rem", background: "var(--surface2)", padding: "0.15rem 0.4rem", borderRadius: 4, color: "var(--accent)" },
  overlay:     { position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "1rem" },
  modalBox:    { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, width: "100%", maxWidth: 620, maxHeight: "90vh", overflowY: "auto", padding: "1.75rem" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" },
  modalTitle:  { fontFamily: "var(--font-head)", fontSize: "1.2rem", fontWeight: 700, color: "var(--text)" },
  closeBtn:    { background: "transparent", border: "none", color: "var(--muted)", fontSize: "1.1rem", cursor: "pointer" },
  form:        { display: "flex", flexDirection: "column", gap: "1rem" },
  formGrid:    { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" },
  input:       { background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: "0.6rem 0.8rem", color: "var(--text)", fontSize: "0.9rem", outline: "none", width: "100%" },
  checkLabel:  { display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--muted)", fontSize: "0.88rem", cursor: "pointer" },
};