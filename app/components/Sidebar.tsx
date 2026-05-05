// components/Sidebar.tsx — Sidebar reutilizable con nav basado en rol
"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NavItem, ROL_COLOR, ROL_LABEL } from "@/lib/nav";

interface SidebarProps {
  usuario: { nombre: string; tipo_usuario: string };
  nav: NavItem[];
  activeHref: string;
}

export default function Sidebar({ usuario, nav, activeHref }: SidebarProps) {
  const router = useRouter();
  const rolColor = ROL_COLOR[usuario.tipo_usuario] ?? "var(--muted)";
  const rolLabel = ROL_LABEL[usuario.tipo_usuario] ?? usuario.tipo_usuario;
  const inicial  = usuario.nombre[0]?.toUpperCase() ?? "?";

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/login");
  }

  return (
    <aside style={s.sidebar}>
      <div style={s.sidebarTop}>
        <div style={s.sidebarLogo}>
          <span>🌱</span>
          <span style={s.sidebarLogoText}>AgroStock</span>
        </div>
        <nav style={s.nav}>
          {nav.map(item => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                ...s.navLink,
                ...(item.href === activeHref ? s.navLinkActive : {}),
              }}
            >
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
        <button onClick={handleLogout} style={s.logoutBtn}>← Salir</button>
      </div>
    </aside>
  );
}

const s: Record<string, React.CSSProperties> = {
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
};