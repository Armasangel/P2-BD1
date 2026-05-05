"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getNav, ROL_COLOR, ROL_LABEL } from "@/lib/nav";

const EMPTY = {
  id_bodega:    "",
  id_producto:  "",
  cantidad:     "",
  tipo_ingreso: "UNIDADES",
  descripcion:  "",
};

export default function EntradaStockPage() {
  const router = useRouter();
  const [usuario, setUsuario]   = useState<any>(null);
  const [productos, setProductos] = useState<any[]>([]);
  const [bodegas, setBodegas]   = useState<any[]>([]);
  const [form, setForm]         = useState<any>(EMPTY);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [historial, setHistorial] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    fetch("/api/sesion").then(r => r.json()).then(d => {
      if (!d.usuario) { router.replace("/login"); return; }
      if (d.usuario.tipo_usuario === "COMPRADOR") { router.replace("/pedidos"); return; }
      setUsuario(d.usuario);
    });
    cargarDatos();
  }, []);

  async function cargarDatos() {
    const [p, b] = await Promise.all([
      fetch("/api/productos").then(r => r.json()),
      fetch("/api/bodegas").then(r => r.json()),
    ]);
    setProductos((p.productos || []).filter((x: any) => x.estado_producto));
    setBodegas(b.bodegas || []);
    // Cargar historial de kardex reciente
    fetch("/api/kardex").then(r => r.json()).then(d => setHistorial(d.kardex || [])).catch(() => {});
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/inventario/entrada", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_bodega:    Number(form.id_bodega),
          id_producto:  Number(form.id_producto),
          cantidad:     Number(form.cantidad),
          tipo_ingreso: form.tipo_ingreso,
          descripcion:  form.descripcion || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Error al registrar entrada"); return; }
      const prod = productos.find(p => String(p.id_producto) === String(form.id_producto));
      const bod  = bodegas.find(b => String(b.id_bodega) === String(form.id_bodega));
      setSuccess(`✅ Entrada registrada: ${form.cantidad} ${prod?.unidad_medida ?? "unidades"} de "${prod?.nombre_producto}" en ${bod?.nombre_bodega}. Stock actual: ${data.stock?.cantidad_disponible}`);
      setForm(EMPTY);
      cargarDatos();
      setTimeout(() => setSuccess(""), 6000);
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  }

  if (!usuario) return <div style={{ padding: "2rem", color: "var(--muted)" }}>Cargando…</div>;

  const nav      = getNav(usuario.tipo_usuario);
  const rolColor = ROL_COLOR[usuario.tipo_usuario] ?? "var(--muted)";
  const rolLabel = ROL_LABEL[usuario.tipo_usuario] ?? usuario.tipo_usuario;
  const inicial  = usuario.nombre[0]?.toUpperCase() ?? "?";

  const productosFiltrados = productos.filter(p =>
    p.nombre_producto.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.codigo_producto.toLowerCase().includes(busqueda.toLowerCase())
  );

  const prodSeleccionado = productos.find(p => String(p.id_producto) === String(form.id_producto));

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
                ...(item.href === "/inventario/entrada" ? s.navLinkActive : {}),
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
            <h1 style={s.pageTitle}>Entrada de Stock</h1>
            <p style={{ color: "var(--muted)", fontSize: "0.88rem" }}>
              Registra el ingreso de productos a una bodega
            </p>
          </div>
        </div>

        <div style={s.contentGrid}>
          {/* Formulario de entrada */}
          <div style={s.formCard}>
            <h2 style={s.cardTitle}>📦 Nuevo ingreso</h2>

            {success && <div style={s.successBox}>{success}</div>}
            {error   && <div style={s.errorBox}>⚠️ {error}</div>}

            <form onSubmit={handleSubmit} style={s.form}>
              {/* Bodega */}
              <div style={s.field}>
                <label style={s.label}>Bodega destino *</label>
                <select
                  style={s.input}
                  value={form.id_bodega}
                  onChange={e => setForm({ ...form, id_bodega: e.target.value })}
                  required
                >
                  <option value="">Seleccionar bodega…</option>
                  {bodegas.map(b => (
                    <option key={b.id_bodega} value={b.id_bodega}>
                      {b.nombre_bodega} {b.ubicacion ? `— ${b.ubicacion}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Búsqueda de producto */}
              <div style={s.field}>
                <label style={s.label}>Buscar producto</label>
                <input
                  style={s.input}
                  placeholder="Escribe nombre o código…"
                  value={busqueda}
                  onChange={e => { setBusqueda(e.target.value); setForm({ ...form, id_producto: "" }); }}
                />
              </div>

              {/* Selector de producto */}
              <div style={s.field}>
                <label style={s.label}>Producto *</label>
                <select
                  style={s.input}
                  value={form.id_producto}
                  onChange={e => setForm({ ...form, id_producto: e.target.value })}
                  required
                  size={busqueda ? Math.min(5, productosFiltrados.length + 1) : 1}
                >
                  <option value="">Seleccionar producto…</option>
                  {productosFiltrados.map(p => (
                    <option key={p.id_producto} value={p.id_producto}>
                      [{p.codigo_producto}] {p.nombre_producto} ({p.unidad_medida})
                    </option>
                  ))}
                </select>
              </div>

              {/* Info del producto seleccionado */}
              {prodSeleccionado && (
                <div style={s.prodInfo}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 600, color: "var(--text)" }}>{prodSeleccionado.nombre_producto}</span>
                    <code style={s.code}>{prodSeleccionado.codigo_producto}</code>
                  </div>
                  <div style={{ color: "var(--muted)", fontSize: "0.82rem", marginTop: "0.3rem" }}>
                    {prodSeleccionado.nombre_categoria} · {prodSeleccionado.nombre_marca} · unidad: {prodSeleccionado.unidad_medida}
                  </div>
                </div>
              )}

              <div style={s.twoCol}>
                {/* Cantidad */}
                <div style={s.field}>
                  <label style={s.label}>Cantidad *</label>
                  <input
                    style={s.input}
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0"
                    value={form.cantidad}
                    onChange={e => setForm({ ...form, cantidad: e.target.value })}
                    required
                  />
                </div>

                {/* Tipo de ingreso */}
                <div style={s.field}>
                  <label style={s.label}>Tipo de ingreso *</label>
                  <select
                    style={s.input}
                    value={form.tipo_ingreso}
                    onChange={e => setForm({ ...form, tipo_ingreso: e.target.value })}
                    required
                  >
                    <option value="UNIDADES">Unidades</option>
                    <option value="CAJAS">Cajas</option>
                  </select>
                </div>
              </div>

              {/* Descripción */}
              <div style={s.field}>
                <label style={s.label}>Descripción / referencia (opcional)</label>
                <input
                  style={s.input}
                  placeholder="Ej: Orden de compra #456, proveedor AgriGuate…"
                  value={form.descripcion}
                  onChange={e => setForm({ ...form, descripcion: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                <button type="button" onClick={() => setForm(EMPTY)} style={s.btnSecondary}>
                  Limpiar
                </button>
                <button type="submit" disabled={loading} style={{ ...s.btnPrimary, opacity: loading ? 0.7 : 1 }}>
                  {loading ? "Registrando…" : "⬇ Registrar entrada"}
                </button>
              </div>
            </form>
          </div>

          {/* Historial reciente */}
          <div style={s.historialCard}>
            <h2 style={s.cardTitle}>📋 Entradas recientes</h2>
            {historial.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: "0.88rem", padding: "1rem 0" }}>Sin movimientos registrados aún.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {historial.slice(0, 12).map((k, i) => (
                  <div key={i} style={s.histItem}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <span style={{ fontWeight: 500, color: "var(--text)", fontSize: "0.88rem" }}>{k.nombre_producto}</span>
                      <span style={{
                        ...s.tipoTag,
                        background: k.tipo_movimiento === "ENTRADA" ? "rgba(63,185,80,.15)" : "rgba(248,81,73,.12)",
                        color: k.tipo_movimiento === "ENTRADA" ? "var(--green)" : "var(--red)",
                      }}>
                        {k.tipo_movimiento === "ENTRADA" ? "⬇" : "⬆"} {k.tipo_movimiento}
                      </span>
                    </div>
                    <div style={{ color: "var(--muted)", fontSize: "0.78rem", marginTop: "0.2rem" }}>
                      {k.cantidad} {k.unidad_medida} · {k.nombre_bodega} · {new Date(k.fecha_movimiento).toLocaleDateString("es-GT")}
                    </div>
                    {k.descripcion && (
                      <div style={{ color: "var(--muted)", fontSize: "0.75rem", fontStyle: "italic" }}>{k.descripcion}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
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
  topbar:      { marginBottom: "1.5rem" },
  pageTitle:   { fontFamily: "var(--font-head)", fontSize: "1.6rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.2rem" },
  contentGrid: { display: "grid", gridTemplateColumns: "1fr 380px", gap: "1.5rem", alignItems: "start" },
  formCard:    { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "1.75rem" },
  historialCard: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "1.75rem" },
  cardTitle:   { fontFamily: "var(--font-head)", fontSize: "1rem", fontWeight: 700, color: "var(--text)", marginBottom: "1.25rem" },
  form:        { display: "flex", flexDirection: "column", gap: "1rem" },
  field:       { display: "flex", flexDirection: "column", gap: "0.4rem" },
  twoCol:      { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" },
  label:       { fontSize: "0.82rem", fontWeight: 500, color: "var(--muted)", letterSpacing: "0.02em" },
  input:       { background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: "0.6rem 0.8rem", color: "var(--text)", fontSize: "0.9rem", outline: "none", width: "100%" },
  prodInfo:    { background: "rgba(63,185,80,.06)", border: "1px solid rgba(63,185,80,.2)", borderRadius: 8, padding: "0.75rem 1rem" },
  code:        { fontFamily: "monospace", fontSize: "0.78rem", background: "var(--surface2)", padding: "0.15rem 0.4rem", borderRadius: 4, color: "var(--accent)" },
  successBox:  { background: "rgba(63,185,80,.12)", border: "1px solid rgba(63,185,80,.3)", borderRadius: 8, padding: "0.75rem 1rem", color: "var(--green)", marginBottom: "0.5rem", fontSize: "0.88rem" },
  errorBox:    { background: "rgba(248,81,73,.1)", border: "1px solid rgba(248,81,73,.3)", borderRadius: 8, padding: "0.7rem 1rem", color: "var(--red)", fontSize: "0.85rem", marginBottom: "0.5rem" },
  btnPrimary:  { background: "var(--accent)", color: "#0d1117", border: "none", borderRadius: 8, padding: "0.65rem 1.25rem", fontFamily: "var(--font-head)", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer" },
  btnSecondary:{ background: "transparent", color: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, padding: "0.65rem 1rem", fontSize: "0.9rem", cursor: "pointer" },
  histItem:    { padding: "0.7rem 0.9rem", background: "var(--surface2)", borderRadius: 8, border: "1px solid var(--border)" },
  tipoTag:     { display: "inline-block", padding: "0.15rem 0.5rem", borderRadius: 6, fontSize: "0.72rem", fontWeight: 600, flexShrink: 0 },
};