"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const NAV = [
  { href: "/dashboard",          icon: "◈", label: "Dashboard"    },
  { href: "/inventario",         icon: "📦", label: "Inventario"   },
  { href: "/inventario/entrada", icon: "⬇",  label: "Entrada stock" },
  { href: "/productos",          icon: "🌿", label: "Productos"    },
  { href: "/proveedores",        icon: "🚚", label: "Proveedores"  },
  { href: "/ventas",             icon: "🧾", label: "Ventas"       },
  { href: "/reportes",           icon: "📊", label: "Reportes"     },
];

const EMPTY = { nombre_proveedor: "", nit_proveedor: "", correo_contacto: "", telefono: "", estado_proveedor: true };

export default function ProveedoresPage() {
  const router = useRouter();
  const [usuario, setUsuario]       = useState<any>(null);
  const [proveedores, setProveedores] = useState<any[]>([]);
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
      setUsuario(d.usuario);
    });
    cargarDatos();
  }, []);

  async function cargarDatos() {
    const res = await fetch("/api/proveedores");
    const data = await res.json();
    setProveedores(data.proveedores || []);
  }

  function abrirCrear() {
    setForm(EMPTY); setEditId(null); setError(""); setModal(true);
  }

  function abrirEditar(p: any) {
    setForm({
      nombre_proveedor: p.nombre_proveedor,
      nit_proveedor:    p.nit_proveedor,
      correo_contacto:  p.correo_contacto || "",
      telefono:         p.telefono || "",
      estado_proveedor: p.estado_proveedor,
    });
    setEditId(p.id_proveedor);
    setError("");
    setModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const url    = editId ? `/api/proveedores/${editId}` : "/api/proveedores";
      const method = editId ? "PUT" : "POST";
      const res    = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Error al guardar"); return; }
      setSuccess(editId ? "Proveedor actualizado ✅" : "Proveedor creado ✅");
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
    if (!confirm(`¿Desactivar proveedor "${nombre}"?`)) return;
    const res  = await fetch(`/api/proveedores/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) { alert(data.error); return; }
    setSuccess("Proveedor desactivado ✅");
    cargarDatos();
    setTimeout(() => setSuccess(""), 3000);
  }

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/login");
  }

  const filtrados = proveedores.filter(p =>
    p.nombre_proveedor.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.nit_proveedor.toLowerCase().includes(busqueda.toLowerCase())
  );

  if (!usuario) return <div style={{ padding: "2rem", color: "var(--muted)" }}>Cargando…</div>;

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
            {NAV.map(item => (
              <Link key={item.href} href={item.href} style={{
                ...s.navLink,
                ...(item.href === "/proveedores" ? s.navLinkActive : {}),
              }}>
                <span style={s.navIcon}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
        <div style={s.sidebarBottom}>
          <div style={s.userBadge}>
            <div style={s.userAvatar}>{usuario.nombre[0]}</div>
            <div>
              <div style={{ fontSize: "0.82rem", fontWeight: 500, color: "var(--text)" }}>{usuario.nombre}</div>
              <div style={{ fontSize: "0.72rem", color: "var(--accent)" }}>{usuario.tipo_usuario}</div>
            </div>
          </div>
          <button onClick={handleLogout} style={s.logoutBtn}>← Salir</button>
        </div>
      </aside>

      {/* Main */}
      <main style={s.main}>
        <div style={s.topbar}>
          <div>
            <h1 style={s.pageTitle}>Proveedores</h1>
            <p style={{ color: "var(--muted)", fontSize: "0.88rem" }}>
              {proveedores.filter(p => p.estado_proveedor).length} activos de {proveedores.length} registrados
            </p>
          </div>
          <button onClick={abrirCrear} style={s.btnPrimary}>+ Nuevo proveedor</button>
        </div>

        {success && <div style={s.successBox}>{success}</div>}

        <input
          placeholder="Buscar por nombre o NIT…"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={s.search}
        />

        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                {["Proveedor", "NIT", "Correo", "Teléfono", "Productos", "Estado", "Acciones"].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr><td colSpan={7} style={{ ...s.td, textAlign: "center", color: "var(--muted)", padding: "2rem" }}>Sin resultados</td></tr>
              ) : filtrados.map((p, i) => (
                <tr key={p.id_proveedor} style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,.02)" }}>
                  <td style={{ ...s.td, fontWeight: 500 }}>{p.nombre_proveedor}</td>
                  <td style={s.td}><code style={s.code}>{p.nit_proveedor}</code></td>
                  <td style={s.td}>{p.correo_contacto || <span style={{ color: "var(--muted)" }}>—</span>}</td>
                  <td style={s.td}>{p.telefono || <span style={{ color: "var(--muted)" }}>—</span>}</td>
                  <td style={{ ...s.td, textAlign: "center" }}>
                    <span style={{ ...s.badge, background: "rgba(88,166,255,.12)", color: "var(--blue)" }}>
                      {p.total_productos}
                    </span>
                  </td>
                  <td style={s.td}>
                    <span style={{ ...s.badge, background: p.estado_proveedor ? "rgba(63,185,80,.15)" : "rgba(248,81,73,.15)", color: p.estado_proveedor ? "var(--green)" : "var(--red)" }}>
                      {p.estado_proveedor ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td style={s.td}>
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      <button onClick={() => abrirEditar(p)} style={s.btnEdit}>Editar</button>
                      {p.estado_proveedor && (
                        <button onClick={() => handleEliminar(p.id_proveedor, p.nombre_proveedor)} style={s.btnDel}>Desactivar</button>
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
              <h2 style={s.modalTitle}>{editId ? "Editar proveedor" : "Nuevo proveedor"}</h2>
              <button onClick={() => setModal(false)} style={s.closeBtn}>✕</button>
            </div>

            <form onSubmit={handleSubmit} style={s.form}>
              <div style={s.formGrid}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={s.label}>Nombre del proveedor *</label>
                  <input style={s.input} value={form.nombre_proveedor} onChange={e => setForm({ ...form, nombre_proveedor: e.target.value })} placeholder="Distribuidora AgriGuate S.A." required />
                </div>
                <div>
                  <label style={s.label}>NIT *</label>
                  <input style={s.input} value={form.nit_proveedor} onChange={e => setForm({ ...form, nit_proveedor: e.target.value })} placeholder="1234567-8" required />
                </div>
                <div>
                  <label style={s.label}>Teléfono</label>
                  <input style={s.input} value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} placeholder="24001234" />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={s.label}>Correo de contacto</label>
                  <input style={s.input} type="email" value={form.correo_contacto} onChange={e => setForm({ ...form, correo_contacto: e.target.value })} placeholder="ventas@proveedor.com" />
                </div>
                {editId && (
                  <div>
                    <label style={s.label}>Estado</label>
                    <select style={s.input} value={String(form.estado_proveedor)} onChange={e => setForm({ ...form, estado_proveedor: e.target.value === "true" })}>
                      <option value="true">Activo</option>
                      <option value="false">Inactivo</option>
                    </select>
                  </div>
                )}
              </div>

              {error && <div style={s.errorBox}>⚠️ {error}</div>}

              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                <button type="button" onClick={() => setModal(false)} style={s.btnSecondary}>Cancelar</button>
                <button type="submit" disabled={loading} style={{ ...s.btnPrimary, opacity: loading ? 0.7 : 1 }}>
                  {loading ? "Guardando…" : editId ? "Actualizar" : "Crear proveedor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
  userAvatar:  { width: 32, height: 32, borderRadius: "50%", background: "var(--accent)", color: "#0d1117", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-head)", fontSize: "0.9rem", fontWeight: 700, flexShrink: 0 },
  logoutBtn:   { width: "100%", background: "transparent", border: "1px solid var(--border)", borderRadius: 8, color: "var(--muted)", padding: "0.45rem 0.75rem", fontSize: "0.82rem", cursor: "pointer", textAlign: "left" },
  main:        { flex: 1, padding: "2rem", overflowY: "auto" },
  topbar:      { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" },
  pageTitle:   { fontFamily: "var(--font-head)", fontSize: "1.6rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.2rem" },
  btnPrimary:  { background: "var(--accent)", color: "#0d1117", border: "none", borderRadius: 8, padding: "0.6rem 1.2rem", fontFamily: "var(--font-head)", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer" },
  btnSecondary:{ background: "transparent", color: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, padding: "0.6rem 1.2rem", fontSize: "0.9rem", cursor: "pointer" },
  btnEdit:     { background: "rgba(88,166,255,.12)", color: "var(--blue)", border: "1px solid rgba(88,166,255,.25)", borderRadius: 6, padding: "0.3rem 0.7rem", fontSize: "0.8rem", cursor: "pointer" },
  btnDel:      { background: "rgba(248,81,73,.1)", color: "var(--red)", border: "1px solid rgba(248,81,73,.25)", borderRadius: 6, padding: "0.3rem 0.7rem", fontSize: "0.8rem", cursor: "pointer" },
  search:      { width: "100%", maxWidth: 400, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "0.6rem 1rem", color: "var(--text)", fontSize: "0.9rem", outline: "none", marginBottom: "1rem" },
  successBox:  { background: "rgba(63,185,80,.12)", border: "1px solid rgba(63,185,80,.3)", borderRadius: 8, padding: "0.75rem 1rem", color: "var(--green)", marginBottom: "1rem", fontSize: "0.9rem" },
  errorBox:    { background: "rgba(248,81,73,.1)", border: "1px solid rgba(248,81,73,.3)", borderRadius: 8, padding: "0.7rem 1rem", color: "var(--red)", fontSize: "0.85rem", marginTop: "0.5rem" },
  tableWrap:   { overflowX: "auto", border: "1px solid var(--border)", borderRadius: 12 },
  table:       { width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" },
  th:          { padding: "0.75rem 1rem", textAlign: "left", borderBottom: "1px solid var(--border)", color: "var(--muted)", fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" },
  td:          { padding: "0.75rem 1rem", borderBottom: "1px solid var(--border)", color: "var(--text)", verticalAlign: "middle" },
  badge:       { display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: 20, fontSize: "0.75rem", fontWeight: 500 },
  code:        { fontFamily: "monospace", fontSize: "0.82rem", background: "var(--surface2)", padding: "0.15rem 0.4rem", borderRadius: 4, color: "var(--accent)" },
  overlay:     { position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "1rem" },
  modalBox:    { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", padding: "1.75rem" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" },
  modalTitle:  { fontFamily: "var(--font-head)", fontSize: "1.2rem", fontWeight: 700, color: "var(--text)" },
  closeBtn:    { background: "transparent", border: "none", color: "var(--muted)", fontSize: "1.1rem", cursor: "pointer" },
  form:        { display: "flex", flexDirection: "column", gap: "1rem" },
  formGrid:    { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" },
  label:       { display: "block", fontSize: "0.8rem", color: "var(--muted)", fontWeight: 500, marginBottom: "0.35rem" },
  input:       { background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: "0.6rem 0.8rem", color: "var(--text)", fontSize: "0.9rem", outline: "none", width: "100%" },
};