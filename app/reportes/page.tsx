"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getNav, ROL_COLOR, ROL_LABEL } from "@/lib/nav";

type ReporteData = {
  ventas_detalle:        any[];
  stock_bajo:            any[];
  kardex:                any[];
  clientes_activos:      any[];
  productos_no_vendidos: any[];
  ventas_por_empleado:   any[];
  ranking_productos:     any[];
  ventas_por_categoria:  any[];
};

function exportCSV(data: any[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const rows    = data.map(row =>
    headers.map(h => {
      const val = row[h];
      if (val === null || val === undefined) return "";
      const str = String(val);
      return str.includes(",") || str.includes('"') || str.includes("\n")
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    }).join(",")
  );
  const csv  = [headers.join(","), ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function ReportesPage() {
  const router  = useRouter();
  const [usuario, setUsuario] = useState<any>(null);
  const [data, setData]       = useState<ReporteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [tab, setTab]         = useState(0);

  useEffect(() => {
    fetch("/api/sesion").then(r => r.json()).then(d => {
      if (!d.usuario) { router.replace("/login"); return; }
      // Solo DUENO puede ver reportes
      if (d.usuario.tipo_usuario !== "DUENO") { router.replace("/dashboard"); return; }
      setUsuario(d.usuario);
    });
    fetch("/api/reportes")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setError("Error al cargar reportes"); setLoading(false); });
  }, []);

  if (!usuario) return <div style={{ padding: "2rem", color: "var(--muted)" }}>Cargando…</div>;

  const nav      = getNav(usuario.tipo_usuario);
  const rolColor = ROL_COLOR[usuario.tipo_usuario] ?? "var(--muted)";
  const rolLabel = ROL_LABEL[usuario.tipo_usuario] ?? usuario.tipo_usuario;
  const inicial  = usuario.nombre[0]?.toUpperCase() ?? "?";

  const tabs = [
    { label: "🏆 Ranking productos",    key: "ranking_productos"     },
    { label: "📂 Ventas por categoría", key: "ventas_por_categoria"  },
    { label: "👥 Ventas por empleado",  key: "ventas_por_empleado"   },
    { label: "🧾 Detalle de ventas",    key: "ventas_detalle"        },
    { label: "⚠️ Stock bajo mínimo",   key: "stock_bajo"            },
    { label: "📋 Kardex",              key: "kardex"                },
    { label: "✅ Clientes activos",     key: "clientes_activos"      },
    { label: "🚫 Sin ventas",          key: "productos_no_vendidos"  },
  ];

  const currentKey  = tabs[tab].key as keyof ReporteData;
  const currentData = data ? data[currentKey] : [];

  const sqlInfo: Record<string, { tipo: string; color: string; desc: string }> = {
    ranking_productos:    { tipo: "CTE (WITH) + RANK()",     color: "var(--accent)", desc: "Usa WITH … AS para calcular totales y luego RANK() OVER para posicionar productos por ingresos." },
    ventas_por_categoria: { tipo: "VIEW",                    color: "var(--blue)",   desc: "Consume directamente la vista v_ventas_por_categoria definida en el esquema con JOIN + GROUP BY." },
    ventas_por_empleado:  { tipo: "GROUP BY + HAVING + AGG", color: "var(--green)",  desc: "Agrupa ventas por empleado usando COUNT, SUM, AVG, MAX. HAVING filtra empleados con al menos 1 venta." },
    ventas_detalle:       { tipo: "JOIN múltiple (3 tablas)", color: "var(--accent)", desc: "JOIN entre venta, usuario (cliente), usuario (empleado) y detalle_venta para mostrar información completa." },
    stock_bajo:           { tipo: "JOIN múltiple (5 tablas)", color: "var(--blue)",   desc: "JOIN entre bodega_producto, producto, categoria, marca y bodega para identificar déficit de stock." },
    kardex:               { tipo: "JOIN múltiple",            color: "var(--green)",  desc: "JOIN entre kardex, producto y bodega para mostrar el historial de movimientos con nombres legibles." },
    clientes_activos:     { tipo: "Subquery EXISTS",          color: "var(--accent)", desc: "Filtra clientes usando WHERE EXISTS (SELECT 1 FROM venta WHERE …) — subquery correlacionado." },
    productos_no_vendidos:{ tipo: "Subquery NOT IN",          color: "var(--blue)",   desc: "Encuentra productos usando WHERE id_producto NOT IN (SELECT DISTINCT id_producto FROM detalle_venta)." },
  };

  const info = sqlInfo[currentKey];

  return (
    <div style={s.shell}>
      <aside style={s.sidebar}>
        <div style={s.sidebarTop}>
          <div style={s.sidebarLogo}><span>🌱</span><span style={s.sidebarLogoText}>AgroStock</span></div>
          <nav style={s.nav}>
            {nav.map(item => (
              <Link key={item.href} href={item.href} style={{ ...s.navLink, ...(item.href === "/reportes" ? s.navLinkActive : {}) }}>
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
            <h1 style={s.pageTitle}>Reportes</h1>
            <p style={{ color: "var(--muted)", fontSize: "0.88rem" }}>Consultas analíticas en tiempo real desde la base de datos</p>
          </div>
          <button
            onClick={() => exportCSV(currentData, `${currentKey}_${Date.now()}.csv`)}
            style={s.btnExport}
            disabled={!currentData?.length}
          >
            ⬇ Exportar CSV
          </button>
        </div>

        {error && <div style={s.errorBox}>⚠️ {error}</div>}

        <div style={s.tabsWrap}>
          {tabs.map((t, i) => (
            <button key={t.key} onClick={() => setTab(i)} style={{ ...s.tabBtn, ...(tab === i ? s.tabBtnActive : {}) }}>
              {t.label}
            </button>
          ))}
        </div>

        {info && (
          <div style={{ ...s.sqlBadge, borderColor: info.color + "44" }}>
            <span style={{ ...s.sqlTag, background: info.color + "22", color: info.color }}>{info.tipo}</span>
            <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>{info.desc}</span>
          </div>
        )}

        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--muted)" }}>Cargando datos…</div>
        ) : !currentData?.length ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--muted)" }}>Sin datos disponibles</div>
        ) : (
          <div style={s.tableWrap}>
            <DynamicTable data={currentData} />
          </div>
        )}
      </main>
    </div>
  );
}

function DynamicTable({ data }: { data: any[] }) {
  if (!data.length) return null;
  const headers = Object.keys(data[0]);

  const formatVal = (key: string, val: any) => {
    if (val === null || val === undefined) return <span style={{ color: "var(--muted)" }}>—</span>;
    const s = String(val);
    if (["total", "monto_total", "ingresos_totales", "total_venta", "deuda_pendiente", "total_pagado", "precio_unitario", "ticket_promedio", "venta_maxima", "subtotal"].includes(key))
      return `Q${Number(val).toFixed(2)}`;
    if (key.includes("fecha")) return new Date(val).toLocaleDateString("es-GT");
    if (typeof val === "boolean") return val ? "✅" : "❌";
    if (key === "ranking") return <span style={{ fontWeight: 700, color: "var(--accent)" }}>#{val}</span>;
    const estadoColors: Record<string, string> = { PAGADO: "var(--green)", PENDIENTE: "var(--accent)", CONFIRMADO: "var(--blue)", ENTREGADO: "var(--muted)" };
    if (key === "estado_venta" && estadoColors[s])
      return <span style={{ color: estadoColors[s], fontWeight: 500 }}>{s}</span>;
    return s;
  };

  const friendlyHeader = (h: string) => h.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.86rem" }}>
      <thead>
        <tr>
          {headers.map(h => (
            <th key={h} style={{ padding: "0.7rem 1rem", textAlign: "left", borderBottom: "1px solid var(--border)", color: "var(--muted)", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
              {friendlyHeader(h)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,.02)" }}>
            {headers.map(h => (
              <td key={h} style={{ padding: "0.7rem 1rem", borderBottom: "1px solid var(--border)", color: "var(--text)", verticalAlign: "middle" }}>
                {formatVal(h, row[h])}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
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
  btnExport:    { background: "rgba(63,185,80,.15)", color: "var(--green)", border: "1px solid rgba(63,185,80,.3)", borderRadius: 8, padding: "0.6rem 1.2rem", fontFamily: "var(--font-head)", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer" },
  errorBox:     { background: "rgba(248,81,73,.1)", border: "1px solid rgba(248,81,73,.3)", borderRadius: 8, padding: "0.75rem 1rem", color: "var(--red)", marginBottom: "1rem" },
  tabsWrap:     { display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "1rem" },
  tabBtn:       { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "0.45rem 0.9rem", color: "var(--muted)", fontSize: "0.82rem", cursor: "pointer", whiteSpace: "nowrap" },
  tabBtnActive: { background: "rgba(232,160,69,.12)", borderColor: "rgba(232,160,69,.4)", color: "var(--accent)" },
  sqlBadge:     { display: "flex", alignItems: "flex-start", gap: "0.75rem", padding: "0.75rem 1rem", border: "1px solid", borderRadius: 8, marginBottom: "1rem", background: "rgba(255,255,255,.02)" },
  sqlTag:       { display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: 6, fontSize: "0.75rem", fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 },
  tableWrap:    { overflowX: "auto", border: "1px solid var(--border)", borderRadius: 12 },
};