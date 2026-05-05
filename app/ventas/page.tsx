"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getNav, ROL_COLOR, ROL_LABEL } from "@/lib/nav";

const ESTADO_COLORS: Record<string, string> = {
  PENDIENTE:  "var(--accent)",
  CONFIRMADO: "var(--blue)",
  ENTREGADO:  "var(--muted)",
  PAGADO:     "var(--green)",
};

type Item = { id_producto: string; cantidad: string; precio_unitario: string; nombre?: string };

const FORM_EMPTY = {
  id_usuario:       "",
  id_empleado:      "",
  tipo_venta:       "MINORISTA",
  tipo_entrega:     "EN_TIENDA",
  direccion_entrega:"",
  fecha_limite_pago:"",
};

export default function VentasPage() {
  const router = useRouter();
  const [usuario, setUsuario]   = useState<any>(null);
  const [ventas, setVentas]     = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [modal, setModal]       = useState(false);
  const [form, setForm]         = useState<any>(FORM_EMPTY);
  const [items, setItems]       = useState<Item[]>([{ id_producto: "", cantidad: "1", precio_unitario: "" }]);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    fetch("/api/sesion").then(r => r.json()).then(d => {
      if (!d.usuario) { router.replace("/login"); return; }
      if (d.usuario.tipo_usuario === "COMPRADOR") { router.replace("/pedidos"); return; }
      setUsuario(d.usuario);
    });
    cargarDatos();
  }, []);

  async function cargarDatos() {
    const [v, p, u] = await Promise.all([
      fetch("/api/ventas").then(r => r.json()),
      fetch("/api/productos").then(r => r.json()),
      fetch("/api/usuarios").then(r => r.json()),
    ]);
    setVentas(v.ventas || []);
    setProductos(p.productos || []);
    setUsuarios(u.usuarios || []);
  }

  function abrirModal() {
    setForm(FORM_EMPTY);
    setItems([{ id_producto: "", cantidad: "1", precio_unitario: "" }]);
    setError("");
    setModal(true);
  }

  function agregarItem() {
    setItems([...items, { id_producto: "", cantidad: "1", precio_unitario: "" }]);
  }

  function quitarItem(i: number) {
    setItems(items.filter((_, idx) => idx !== i));
  }

  function updateItem(i: number, field: keyof Item, value: string) {
    const newItems = [...items];
    newItems[i] = { ...newItems[i], [field]: value };
    if (field === "id_producto" && value) {
      const prod = productos.find(p => String(p.id_producto) === value);
      if (prod) {
        const precio = form.tipo_venta === "MAYORISTA" ? prod.precio_mayoreo : prod.precio_unitario;
        newItems[i].precio_unitario = precio ?? "";
        newItems[i].nombre = prod.nombre_producto;
      }
    }
    setItems(newItems);
  }

  const total = items.reduce((sum, item) => {
    return sum + Number(item.cantidad || 0) * Number(item.precio_unitario || 0);
  }, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    const itemsValidos = items.filter(i => i.id_producto && i.cantidad && i.precio_unitario);
    if (itemsValidos.length === 0) {
      setError("Agrega al menos 1 producto con cantidad y precio");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/ventas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          id_usuario:  Number(form.id_usuario),
          id_empleado: form.id_empleado ? Number(form.id_empleado) : null,
          items: itemsValidos.map(i => ({
            id_producto:     Number(i.id_producto),
            cantidad:        Number(i.cantidad),
            precio_unitario: Number(i.precio_unitario),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Error al registrar"); return; }
      setSuccess(`Venta #${data.id_venta} registrada por Q${Number(data.total).toFixed(2)} ✅`);
      setModal(false);
      cargarDatos();
      setTimeout(() => setSuccess(""), 4000);
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  }

  const clientes  = usuarios.filter(u => u.tipo_usuario === "COMPRADOR");
  const empleados = usuarios.filter(u => ["EMPLEADO", "DUENO"].includes(u.tipo_usuario));

  if (!usuario) return <div style={{ padding: "2rem", color: "var(--muted)" }}>Cargando…</div>;

  const nav      = getNav(usuario.tipo_usuario);
  const rolColor = ROL_COLOR[usuario.tipo_usuario] ?? "var(--muted)";
  const rolLabel = ROL_LABEL[usuario.tipo_usuario] ?? usuario.tipo_usuario;
  const inicial  = usuario.nombre[0]?.toUpperCase() ?? "?";

  return (
    <div style={s.shell}>
      <aside style={s.sidebar}>
        <div style={s.sidebarTop}>
          <div style={s.sidebarLogo}><span>🌱</span><span style={s.sidebarLogoText}>AgroStock</span></div>
          <nav style={s.nav}>
            {nav.map(item => (
              <Link key={item.href} href={item.href} style={{ ...s.navLink, ...(item.href === "/ventas" ? s.navLinkActive : {}) }}>
                <span style={s.navIcon}>{item.icon}</span><span>{item.label}</span>
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

      <main style={s.main}>
        <div style={s.topbar}>
          <div>
            <h1 style={s.pageTitle}>Ventas</h1>
            <p style={{ color: "var(--muted)", fontSize: "0.88rem" }}>{ventas.length} ventas registradas</p>
          </div>
          <button onClick={abrirModal} style={s.btnPrimary}>+ Nueva venta</button>
        </div>

        {success && <div style={s.successBox}>{success}</div>}

        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                {["#", "Fecha", "Cliente", "Empleado", "Tipo", "Entrega", "Items", "Total", "Estado"].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ventas.length === 0 ? (
                <tr><td colSpan={9} style={{ ...s.td, textAlign: "center", color: "var(--muted)", padding: "2rem" }}>Sin ventas registradas</td></tr>
              ) : ventas.map((v, i) => (
                <tr key={v.id_venta} style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,.02)" }}>
                  <td style={s.td}><span style={s.idBadge}>#{v.id_venta}</span></td>
                  <td style={s.td}>{new Date(v.fecha_venta).toLocaleDateString("es-GT")}</td>
                  <td style={s.td}>{v.nombre_cliente}</td>
                  <td style={s.td}>{v.nombre_empleado || <span style={{ color: "var(--muted)" }}>—</span>}</td>
                  <td style={s.td}>
                    <span style={{ ...s.badge, background: v.tipo_venta === "MAYORISTA" ? "rgba(88,166,255,.12)" : "rgba(232,160,69,.12)", color: v.tipo_venta === "MAYORISTA" ? "var(--blue)" : "var(--accent)" }}>
                      {v.tipo_venta}
                    </span>
                  </td>
                  <td style={s.td}>{v.tipo_entrega.replace("_", " ")}</td>
                  <td style={{ ...s.td, textAlign: "center" }}>{v.total_items}</td>
                  <td style={{ ...s.td, fontWeight: 600, color: "var(--green)" }}>Q{Number(v.total).toFixed(2)}</td>
                  <td style={s.td}>
                    <span style={{ ...s.badge, background: (ESTADO_COLORS[v.estado_venta] || "var(--muted)") + "22", color: ESTADO_COLORS[v.estado_venta] || "var(--muted)" }}>
                      {v.estado_venta}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {modal && (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div style={s.modalBox}>
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}>Nueva venta</h2>
              <button onClick={() => setModal(false)} style={s.closeBtn}>✕</button>
            </div>
            <form onSubmit={handleSubmit} style={s.form}>
              <div style={s.formGrid}>
                <div>
                  <label style={s.label}>Cliente *</label>
                  <select style={s.input} value={form.id_usuario} onChange={e => setForm({ ...form, id_usuario: e.target.value })} required>
                    <option value="">Seleccionar cliente…</option>
                    {clientes.map(u => <option key={u.id_usuario} value={u.id_usuario}>{u.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label style={s.label}>Empleado que atiende</label>
                  <select style={s.input} value={form.id_empleado} onChange={e => setForm({ ...form, id_empleado: e.target.value })}>
                    <option value="">Sin asignar</option>
                    {empleados.map(u => <option key={u.id_usuario} value={u.id_usuario}>{u.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label style={s.label}>Tipo de venta *</label>
                  <select style={s.input} value={form.tipo_venta} onChange={e => setForm({ ...form, tipo_venta: e.target.value })}>
                    <option value="MINORISTA">Minorista</option>
                    <option value="MAYORISTA">Mayorista</option>
                  </select>
                </div>
                <div>
                  <label style={s.label}>Tipo de entrega *</label>
                  <select style={s.input} value={form.tipo_entrega} onChange={e => setForm({ ...form, tipo_entrega: e.target.value })}>
                    <option value="EN_TIENDA">En tienda</option>
                    <option value="DOMICILIO">Domicilio</option>
                  </select>
                </div>
                {form.tipo_entrega === "DOMICILIO" && (
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={s.label}>Dirección de entrega *</label>
                    <input style={s.input} value={form.direccion_entrega} onChange={e => setForm({ ...form, direccion_entrega: e.target.value })} placeholder="Zona 1, Ciudad Guatemala…" required />
                  </div>
                )}
                <div>
                  <label style={s.label}>Fecha límite de pago</label>
                  <input style={s.input} type="date" value={form.fecha_limite_pago} onChange={e => setForm({ ...form, fecha_limite_pago: e.target.value })} />
                </div>
              </div>

              <div style={s.sectionTitle}>Productos</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {items.map((item, i) => (
                  <div key={i} style={s.itemRow}>
                    <select style={{ ...s.input, flex: 2 }} value={item.id_producto} onChange={e => updateItem(i, "id_producto", e.target.value)} required>
                      <option value="">Producto…</option>
                      {productos.filter(p => p.estado_producto).map(p => (
                        <option key={p.id_producto} value={p.id_producto}>{p.nombre_producto} ({p.unidad_medida})</option>
                      ))}
                    </select>
                    <input style={{ ...s.input, flex: "0 0 80px" }} type="number" min="0.01" step="0.01" placeholder="Cant." value={item.cantidad} onChange={e => updateItem(i, "cantidad", e.target.value)} required />
                    <input style={{ ...s.input, flex: "0 0 100px" }} type="number" min="0" step="0.01" placeholder="Precio" value={item.precio_unitario} onChange={e => updateItem(i, "precio_unitario", e.target.value)} required />
                    <span style={{ color: "var(--green)", fontSize: "0.85rem", minWidth: 70, textAlign: "right" }}>
                      Q{(Number(item.cantidad || 0) * Number(item.precio_unitario || 0)).toFixed(2)}
                    </span>
                    {items.length > 1 && (
                      <button type="button" onClick={() => quitarItem(i)} style={s.btnDel}>✕</button>
                    )}
                  </div>
                ))}
              </div>

              <button type="button" onClick={agregarItem} style={s.btnAddItem}>+ Agregar producto</button>

              <div style={s.totalRow}>
                <span style={{ color: "var(--muted)" }}>Total estimado:</span>
                <span style={{ fontFamily: "var(--font-head)", fontSize: "1.3rem", color: "var(--green)", fontWeight: 700 }}>Q{total.toFixed(2)}</span>
              </div>

              {error && <div style={s.errorBox}>⚠️ {error}</div>}

              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setModal(false)} style={s.btnSecondary}>Cancelar</button>
                <button type="submit" disabled={loading} style={{ ...s.btnPrimary, opacity: loading ? 0.7 : 1 }}>
                  {loading ? "Registrando…" : "Registrar venta"}
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
  shell:        { display: "flex", minHeight: "100vh", fontFamily: "var(--font-body)" },
  sidebar:      { width: 220, flexShrink: 0, background: "var(--surface)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", justifyContent: "space-between", position: "sticky", top: 0, height: "100vh" },
  sidebarTop:   { padding: "1.5rem 1rem" },
  sidebarLogo:  { display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "2rem" },
  sidebarLogoText: { fontFamily: "var(--font-head)", fontSize: "1.2rem", fontWeight: 800, color: "var(--accent)" },
  nav:          { display: "flex", flexDirection: "column", gap: "0.2rem" },
  navLink:      { display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.55rem 0.75rem", borderRadius: 8, color: "var(--muted)", fontSize: "0.88rem", textDecoration: "none" },
  navLinkActive:{ background: "rgba(232,160,69,.12)", color: "var(--accent)" },
  navIcon:      { fontSize: "1rem", width: 20, textAlign: "center" },
  sidebarBottom:{ padding: "1rem", borderTop: "1px solid var(--border)" },
  userBadge:    { display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.8rem" },
  userAvatar:   { width: 32, height: 32, borderRadius: "50%", color: "#0d1117", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-head)", fontSize: "0.9rem", fontWeight: 700, flexShrink: 0 },
  logoutBtn:    { width: "100%", background: "transparent", border: "1px solid var(--border)", borderRadius: 8, color: "var(--muted)", padding: "0.45rem 0.75rem", fontSize: "0.82rem", cursor: "pointer", textAlign: "left" },
  main:         { flex: 1, padding: "2rem", overflowY: "auto" },
  topbar:       { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" },
  pageTitle:    { fontFamily: "var(--font-head)", fontSize: "1.6rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.2rem" },
  btnPrimary:   { background: "var(--accent)", color: "#0d1117", border: "none", borderRadius: 8, padding: "0.6rem 1.2rem", fontFamily: "var(--font-head)", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer" },
  btnSecondary: { background: "transparent", color: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, padding: "0.6rem 1.2rem", fontSize: "0.9rem", cursor: "pointer" },
  btnDel:       { background: "rgba(248,81,73,.1)", color: "var(--red)", border: "1px solid rgba(248,81,73,.25)", borderRadius: 6, padding: "0.3rem 0.5rem", fontSize: "0.8rem", cursor: "pointer", flexShrink: 0 },
  btnAddItem:   { background: "transparent", color: "var(--muted)", border: "1px dashed var(--border)", borderRadius: 8, padding: "0.5rem", fontSize: "0.85rem", cursor: "pointer", width: "100%" },
  successBox:   { background: "rgba(63,185,80,.12)", border: "1px solid rgba(63,185,80,.3)", borderRadius: 8, padding: "0.75rem 1rem", color: "var(--green)", marginBottom: "1rem", fontSize: "0.9rem" },
  errorBox:     { background: "rgba(248,81,73,.1)", border: "1px solid rgba(248,81,73,.3)", borderRadius: 8, padding: "0.7rem 1rem", color: "var(--red)", fontSize: "0.85rem" },
  tableWrap:    { overflowX: "auto", border: "1px solid var(--border)", borderRadius: 12 },
  table:        { width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" },
  th:           { padding: "0.75rem 1rem", textAlign: "left", borderBottom: "1px solid var(--border)", color: "var(--muted)", fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" },
  td:           { padding: "0.75rem 1rem", borderBottom: "1px solid var(--border)", color: "var(--text)", verticalAlign: "middle" },
  badge:        { display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: 20, fontSize: "0.75rem", fontWeight: 500 },
  idBadge:      { fontFamily: "monospace", fontSize: "0.82rem", background: "var(--surface2)", padding: "0.15rem 0.4rem", borderRadius: 4, color: "var(--muted)" },
  overlay:      { position: "fixed", inset: 0, background: "rgba(0,0,0,.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "1rem" },
  modalBox:     { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, width: "100%", maxWidth: 680, maxHeight: "92vh", overflowY: "auto", padding: "1.75rem" },
  modalHeader:  { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" },
  modalTitle:   { fontFamily: "var(--font-head)", fontSize: "1.2rem", fontWeight: 700, color: "var(--text)" },
  closeBtn:     { background: "transparent", border: "none", color: "var(--muted)", fontSize: "1.1rem", cursor: "pointer" },
  form:         { display: "flex", flexDirection: "column", gap: "1rem" },
  formGrid:     { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" },
  label:        { display: "block", fontSize: "0.8rem", color: "var(--muted)", fontWeight: 500, marginBottom: "0.35rem" },
  input:        { background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: "0.6rem 0.8rem", color: "var(--text)", fontSize: "0.88rem", outline: "none", width: "100%" },
  sectionTitle: { fontFamily: "var(--font-head)", fontSize: "0.85rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", paddingTop: "0.5rem", borderTop: "1px solid var(--border)" },
  itemRow:      { display: "flex", gap: "0.5rem", alignItems: "center" },
  totalRow:     { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 1rem", background: "var(--surface2)", borderRadius: 8, border: "1px solid var(--border)" },
};