"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getNav, ROL_COLOR, ROL_LABEL } from "@/lib/nav";

type Producto = {
  id_producto: number;
  codigo_producto: string;
  nombre_producto: string;
  precio_unitario: number | null;
  precio_mayoreo: number | null;
  unidad_medida: string;
  nombre_categoria: string;
  nombre_marca: string;
  estado_producto: boolean;
};

type ItemCarrito = {
  producto: Producto;
  cantidad: number;
  precio: number;
};

export default function PedidosPage() {
  const router = useRouter();
  const [usuario, setUsuario]   = useState<any>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [carrito, setCarrito]   = useState<ItemCarrito[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("Todos");
  const [tipoVenta, setTipoVenta] = useState<"MINORISTA"|"MAYORISTA">("MINORISTA");
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const [misVentas, setMisVentas] = useState<any[]>([]);
  const [vistaActiva, setVistaActiva] = useState<"catalogo"|"mis-pedidos">("catalogo");

  useEffect(() => {
    fetch("/api/sesion").then(r => r.json()).then(d => {
      if (!d.usuario) { router.replace("/login"); return; }
      if (d.usuario.tipo_usuario !== "COMPRADOR") { router.replace("/dashboard"); return; }
      setUsuario(d.usuario);
    });
    fetch("/api/productos").then(r => r.json()).then(d => {
      setProductos((d.productos || []).filter((p: Producto) => p.estado_producto));
    });
  }, []);

  useEffect(() => {
    if (usuario) {
      fetch("/api/ventas").then(r => r.json()).then(d => {
        const todas = d.ventas || [];
        setMisVentas(todas.filter((v: any) => v.nombre_cliente === usuario.nombre));
      });
    }
  }, [usuario]);

  const categorias = ["Todos", ...Array.from(new Set(productos.map(p => p.nombre_categoria)))];

  const productosFiltrados = productos.filter(p => {
    const matchBusqueda = p.nombre_producto.toLowerCase().includes(busqueda.toLowerCase()) ||
                          p.nombre_marca.toLowerCase().includes(busqueda.toLowerCase()) ||
                          p.codigo_producto.toLowerCase().includes(busqueda.toLowerCase());
    const matchCategoria = categoriaFiltro === "Todos" || p.nombre_categoria === categoriaFiltro;
    return matchBusqueda && matchCategoria;
  });

  function precioProducto(p: Producto): number {
    if (tipoVenta === "MAYORISTA" && p.precio_mayoreo) return Number(p.precio_mayoreo);
    return Number(p.precio_unitario ?? 0);
  }

  function agregarAlCarrito(p: Producto) {
    const precio = precioProducto(p);
    if (!precio) return;
    setCarrito(prev => {
      const existe = prev.find(item => item.producto.id_producto === p.id_producto);
      if (existe) {
        return prev.map(item =>
          item.producto.id_producto === p.id_producto
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        );
      }
      return [...prev, { producto: p, cantidad: 1, precio }];
    });
    setCarritoAbierto(true);
  }

  function cambiarCantidad(id: number, delta: number) {
    setCarrito(prev => {
      const updated = prev.map(item =>
        item.producto.id_producto === id
          ? { ...item, cantidad: Math.max(1, item.cantidad + delta) }
          : item
      );
      return updated;
    });
  }

  function quitarItem(id: number) {
    setCarrito(prev => prev.filter(item => item.producto.id_producto !== id));
  }

  const totalCarrito = carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
  const cantidadCarrito = carrito.reduce((sum, item) => sum + item.cantidad, 0);

  async function handlePedido() {
    if (!usuario || carrito.length === 0) return;
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/ventas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_usuario:   usuario.id_usuario,
          id_empleado:  null,
          tipo_venta:   tipoVenta,
          tipo_entrega: "EN_TIENDA",
          items: carrito.map(item => ({
            id_producto:    item.producto.id_producto,
            cantidad:       item.cantidad,
            precio_unitario: item.precio,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Error al procesar pedido"); return; }
      setSuccess(`🎉 Pedido #${data.id_venta} enviado por Q${Number(data.total).toFixed(2)}. ¡Gracias por tu compra!`);
      setCarrito([]);
      setCarritoAbierto(false);
      // Refrescar mis pedidos
      fetch("/api/ventas").then(r => r.json()).then(d => {
        setMisVentas((d.ventas || []).filter((v: any) => v.nombre_cliente === usuario.nombre));
      });
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

  const ESTADO_COLORS: Record<string, string> = {
    PENDIENTE:  "var(--accent)",
    CONFIRMADO: "var(--blue)",
    ENTREGADO:  "var(--muted)",
    PAGADO:     "var(--green)",
  };

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
                ...(item.href === "/pedidos" ? s.navLinkActive : {}),
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
            <h1 style={s.pageTitle}>Mis Pedidos</h1>
            <p style={{ color: "var(--muted)", fontSize: "0.88rem" }}>
              Explora el catálogo y realiza tu pedido
            </p>
          </div>
          {/* Botón carrito flotante */}
          <button
            onClick={() => setCarritoAbierto(!carritoAbierto)}
            style={{ ...s.btnCarrito, ...(cantidadCarrito > 0 ? s.btnCarritoActivo : {}) }}
          >
            🛒 Carrito
            {cantidadCarrito > 0 && (
              <span style={s.cartBadge}>{cantidadCarrito}</span>
            )}
          </button>
        </div>

        {/* Tabs: Catálogo / Mis pedidos */}
        <div style={s.tabs}>
          <button
            onClick={() => setVistaActiva("catalogo")}
            style={{ ...s.tabBtn, ...(vistaActiva === "catalogo" ? s.tabBtnActive : {}) }}
          >
            🌿 Catálogo
          </button>
          <button
            onClick={() => setVistaActiva("mis-pedidos")}
            style={{ ...s.tabBtn, ...(vistaActiva === "mis-pedidos" ? s.tabBtnActive : {}) }}
          >
            🧾 Mis pedidos ({misVentas.length})
          </button>
        </div>

        {success && <div style={s.successBox}>{success}</div>}
        {error   && <div style={s.errorBox}>⚠️ {error}</div>}

        {/* ── CATÁLOGO ── */}
        {vistaActiva === "catalogo" && (
          <>
            {/* Filtros */}
            <div style={s.filtros}>
              <input
                style={s.buscador}
                placeholder="Buscar producto, marca, código…"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
              />
              <select
                style={s.selectFiltro}
                value={categoriaFiltro}
                onChange={e => setCategoriaFiltro(e.target.value)}
              >
                {categorias.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div style={s.tipoVentaSwitch}>
                <button
                  onClick={() => setTipoVenta("MINORISTA")}
                  style={{ ...s.switchBtn, ...(tipoVenta === "MINORISTA" ? s.switchBtnActive : {}) }}
                >
                  Minorista
                </button>
                <button
                  onClick={() => setTipoVenta("MAYORISTA")}
                  style={{ ...s.switchBtn, ...(tipoVenta === "MAYORISTA" ? s.switchBtnActive : {}) }}
                >
                  Mayorista
                </button>
              </div>
            </div>

            <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginBottom: "1rem" }}>
              {productosFiltrados.length} producto(s) · Precios {tipoVenta === "MAYORISTA" ? "mayoristas" : "al detalle"}
            </p>

            {/* Grid de productos */}
            <div style={s.productosGrid}>
              {productosFiltrados.map(p => {
                const precio = precioProducto(p);
                const enCarrito = carrito.find(i => i.producto.id_producto === p.id_producto);
                return (
                  <div key={p.id_producto} style={s.productoCard}>
                    <div style={s.productoIcono}>
                      {p.nombre_categoria === "Fertilizantes" ? "🌱" :
                       p.nombre_categoria === "Herbicidas"    ? "🌿" :
                       p.nombre_categoria === "Insecticidas"  ? "🦟" :
                       p.nombre_categoria === "Fungicidas"    ? "🍄" :
                       p.nombre_categoria === "Semillas"      ? "🌾" :
                       p.nombre_categoria === "Herramientas"  ? "🔧" :
                       p.nombre_categoria === "Equipos de Riego" ? "💧" : "🌿"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: "var(--text)", fontSize: "0.92rem", marginBottom: "0.15rem" }}>
                        {p.nombre_producto}
                      </div>
                      <div style={{ color: "var(--muted)", fontSize: "0.75rem", marginBottom: "0.5rem" }}>
                        {p.nombre_marca} · {p.nombre_categoria}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          {precio ? (
                            <span style={{ fontFamily: "var(--font-head)", fontSize: "1.1rem", fontWeight: 700, color: "var(--green)" }}>
                              Q{precio.toFixed(2)}
                            </span>
                          ) : (
                            <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Sin precio</span>
                          )}
                          <span style={{ color: "var(--muted)", fontSize: "0.72rem", marginLeft: "0.3rem" }}>/{p.unidad_medida}</span>
                        </div>
                        {precio ? (
                          <button
                            onClick={() => agregarAlCarrito(p)}
                            style={{ ...s.btnAgregar, ...(enCarrito ? s.btnAgregado : {}) }}
                          >
                            {enCarrito ? `+1 (${enCarrito.cantidad})` : "+ Agregar"}
                          </button>
                        ) : (
                          <span style={{ color: "var(--muted)", fontSize: "0.78rem" }}>No disponible</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {productosFiltrados.length === 0 && (
              <div style={{ padding: "3rem", textAlign: "center", color: "var(--muted)" }}>
                No se encontraron productos con esos filtros.
              </div>
            )}
          </>
        )}

        {/* ── MIS PEDIDOS ── */}
        {vistaActiva === "mis-pedidos" && (
          <div>
            {misVentas.length === 0 ? (
              <div style={{ padding: "3rem", textAlign: "center", color: "var(--muted)" }}>
                <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>🧾</div>
                <p>Aún no tienes pedidos. ¡Ve al catálogo y realiza tu primer pedido!</p>
                <button onClick={() => setVistaActiva("catalogo")} style={{ ...s.btnPrimary, marginTop: "1rem" }}>
                  Ver catálogo
                </button>
              </div>
            ) : (
              <div style={s.tableWrap}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      {["#", "Fecha", "Tipo", "Items", "Total", "Estado"].map(h => (
                        <th key={h} style={s.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {misVentas.map((v, i) => (
                      <tr key={v.id_venta} style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,.02)" }}>
                        <td style={s.td}><span style={s.idBadge}>#{v.id_venta}</span></td>
                        <td style={s.td}>{new Date(v.fecha_venta).toLocaleDateString("es-GT")}</td>
                        <td style={s.td}>
                          <span style={{ ...s.badge, background: "rgba(232,160,69,.12)", color: "var(--accent)" }}>
                            {v.tipo_venta}
                          </span>
                        </td>
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
            )}
          </div>
        )}
      </main>

      {/* Panel carrito lateral */}
      {carritoAbierto && (
        <div style={s.carritoOverlay} onClick={e => e.target === e.currentTarget && setCarritoAbierto(false)}>
          <div style={s.carritoPanel}>
            <div style={s.carritoHeader}>
              <h2 style={{ fontFamily: "var(--font-head)", fontSize: "1.1rem", fontWeight: 700, color: "var(--text)" }}>
                🛒 Carrito ({cantidadCarrito})
              </h2>
              <button onClick={() => setCarritoAbierto(false)} style={s.closeBtn}>✕</button>
            </div>

            {carrito.length === 0 ? (
              <p style={{ color: "var(--muted)", padding: "1.5rem 0", fontSize: "0.9rem" }}>El carrito está vacío.</p>
            ) : (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem", overflowY: "auto", maxHeight: "50vh" }}>
                  {carrito.map(item => (
                    <div key={item.producto.id_producto} style={s.carritoItem}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, color: "var(--text)", fontSize: "0.88rem" }}>{item.producto.nombre_producto}</div>
                        <div style={{ color: "var(--muted)", fontSize: "0.75rem" }}>Q{item.precio.toFixed(2)} / {item.producto.unidad_medida}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <button onClick={() => cambiarCantidad(item.producto.id_producto, -1)} style={s.qtyBtn}>−</button>
                        <span style={{ minWidth: 24, textAlign: "center", color: "var(--text)", fontSize: "0.9rem" }}>{item.cantidad}</span>
                        <button onClick={() => cambiarCantidad(item.producto.id_producto, +1)} style={s.qtyBtn}>+</button>
                        <button onClick={() => quitarItem(item.producto.id_producto)} style={s.btnDel}>✕</button>
                      </div>
                      <div style={{ fontWeight: 600, color: "var(--green)", fontSize: "0.9rem", minWidth: 70, textAlign: "right" }}>
                        Q{(item.precio * item.cantidad).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={s.carritoTotal}>
                  <span style={{ color: "var(--muted)" }}>Total</span>
                  <span style={{ fontFamily: "var(--font-head)", fontSize: "1.3rem", fontWeight: 700, color: "var(--green)" }}>
                    Q{totalCarrito.toFixed(2)}
                  </span>
                </div>

                <div style={{ marginTop: "0.75rem", padding: "0.75rem", background: "var(--surface2)", borderRadius: 8, fontSize: "0.8rem", color: "var(--muted)" }}>
                  Tipo de venta: <strong style={{ color: "var(--accent)" }}>{tipoVenta}</strong>
                </div>

                {error && <div style={{ ...s.errorBox, marginTop: "0.75rem" }}>⚠️ {error}</div>}

                <button
                  onClick={handlePedido}
                  disabled={loading}
                  style={{ ...s.btnPrimary, width: "100%", marginTop: "1rem", opacity: loading ? 0.7 : 1 }}
                >
                  {loading ? "Procesando…" : "✅ Confirmar pedido"}
                </button>
                <button
                  onClick={() => { setCarrito([]); }}
                  style={{ ...s.btnSecondary, width: "100%", marginTop: "0.5rem" }}
                >
                  Vaciar carrito
                </button>
              </>
            )}
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
  userAvatar:  { width: 32, height: 32, borderRadius: "50%", color: "#0d1117", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-head)", fontSize: "0.9rem", fontWeight: 700, flexShrink: 0 },
  logoutBtn:   { width: "100%", background: "transparent", border: "1px solid var(--border)", borderRadius: 8, color: "var(--muted)", padding: "0.45rem 0.75rem", fontSize: "0.82rem", cursor: "pointer", textAlign: "left" },
  main:        { flex: 1, padding: "2rem", overflowY: "auto" },
  topbar:      { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" },
  pageTitle:   { fontFamily: "var(--font-head)", fontSize: "1.6rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.2rem" },
  tabs:        { display: "flex", gap: "0.4rem", marginBottom: "1.25rem" },
  tabBtn:      { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "0.5rem 1rem", color: "var(--muted)", fontSize: "0.88rem", cursor: "pointer" },
  tabBtnActive:{ background: "rgba(232,160,69,.12)", borderColor: "rgba(232,160,69,.4)", color: "var(--accent)" },
  filtros:     { display: "flex", gap: "0.75rem", marginBottom: "0.75rem", flexWrap: "wrap" },
  buscador:    { flex: "1 1 200px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "0.6rem 1rem", color: "var(--text)", fontSize: "0.9rem", outline: "none" },
  selectFiltro:{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "0.6rem 0.8rem", color: "var(--text)", fontSize: "0.88rem", outline: "none" },
  tipoVentaSwitch: { display: "flex", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" },
  switchBtn:   { background: "var(--surface)", color: "var(--muted)", border: "none", padding: "0.6rem 0.9rem", fontSize: "0.85rem", cursor: "pointer" },
  switchBtnActive: { background: "rgba(232,160,69,.15)", color: "var(--accent)" },
  productosGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "0.75rem" },
  productoCard: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "1rem", display: "flex", gap: "0.75rem", alignItems: "flex-start" },
  productoIcono: { fontSize: "1.75rem", flexShrink: 0, lineHeight: 1 },
  btnAgregar:  { background: "rgba(63,185,80,.15)", color: "var(--green)", border: "1px solid rgba(63,185,80,.3)", borderRadius: 6, padding: "0.3rem 0.7rem", fontSize: "0.8rem", cursor: "pointer", whiteSpace: "nowrap" },
  btnAgregado: { background: "rgba(88,166,255,.15)", color: "var(--blue)", borderColor: "rgba(88,166,255,.3)" },
  btnCarrito:  { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "0.6rem 1.1rem", color: "var(--muted)", fontSize: "0.9rem", cursor: "pointer", position: "relative", display: "flex", alignItems: "center", gap: "0.5rem" },
  btnCarritoActivo: { background: "rgba(63,185,80,.12)", borderColor: "rgba(63,185,80,.3)", color: "var(--green)" },
  cartBadge:   { background: "var(--green)", color: "#0d1117", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700 },
  carritoOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 200, display: "flex", justifyContent: "flex-end" },
  carritoPanel: { background: "var(--surface)", borderLeft: "1px solid var(--border)", width: 380, maxWidth: "100vw", padding: "1.75rem", overflowY: "auto", height: "100vh" },
  carritoHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" },
  closeBtn:    { background: "transparent", border: "none", color: "var(--muted)", fontSize: "1.1rem", cursor: "pointer" },
  carritoItem: { display: "flex", gap: "0.6rem", alignItems: "center", padding: "0.75rem", background: "var(--surface2)", borderRadius: 8, border: "1px solid var(--border)" },
  carritoTotal: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 1rem", background: "var(--surface2)", borderRadius: 8, border: "1px solid var(--border)" },
  qtyBtn:      { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4, width: 24, height: 24, color: "var(--text)", fontSize: "0.9rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  btnDel:      { background: "rgba(248,81,73,.1)", color: "var(--red)", border: "1px solid rgba(248,81,73,.25)", borderRadius: 4, width: 24, height: 24, fontSize: "0.75rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  successBox:  { background: "rgba(63,185,80,.12)", border: "1px solid rgba(63,185,80,.3)", borderRadius: 8, padding: "0.75rem 1rem", color: "var(--green)", marginBottom: "1rem", fontSize: "0.88rem" },
  errorBox:    { background: "rgba(248,81,73,.1)", border: "1px solid rgba(248,81,73,.3)", borderRadius: 8, padding: "0.7rem 1rem", color: "var(--red)", fontSize: "0.85rem" },
  btnPrimary:  { background: "var(--accent)", color: "#0d1117", border: "none", borderRadius: 8, padding: "0.65rem 1.25rem", fontFamily: "var(--font-head)", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer" },
  btnSecondary:{ background: "transparent", color: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, padding: "0.65rem 1rem", fontSize: "0.88rem", cursor: "pointer" },
  tableWrap:   { overflowX: "auto", border: "1px solid var(--border)", borderRadius: 12 },
  table:       { width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" },
  th:          { padding: "0.75rem 1rem", textAlign: "left", borderBottom: "1px solid var(--border)", color: "var(--muted)", fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" },
  td:          { padding: "0.75rem 1rem", borderBottom: "1px solid var(--border)", color: "var(--text)", verticalAlign: "middle" },
  badge:       { display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: 20, fontSize: "0.75rem", fontWeight: 500 },
  idBadge:     { fontFamily: "monospace", fontSize: "0.82rem", background: "var(--surface2)", padding: "0.15rem 0.4rem", borderRadius: 4, color: "var(--muted)" },
};