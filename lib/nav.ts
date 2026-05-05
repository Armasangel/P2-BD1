export type NavItem = { href: string; icon: string; label: string };

export const NAV_DUENO: NavItem[] = [
  { href: "/dashboard",          icon: "◈",  label: "Dashboard"    },
  { href: "/productos",          icon: "🌿", label: "Productos"    },
  { href: "/inventario/entrada", icon: "⬇",  label: "Entrada stock" },
  { href: "/proveedores",        icon: "🚚", label: "Proveedores"  },
  { href: "/ventas",             icon: "🧾", label: "Ventas"       },
  { href: "/reportes",           icon: "📊", label: "Reportes"     },
];

export const NAV_EMPLEADO: NavItem[] = [
  { href: "/dashboard",          icon: "◈",  label: "Dashboard"    },
  { href: "/productos",          icon: "🌿", label: "Productos"    },
  { href: "/inventario/entrada", icon: "⬇",  label: "Entrada stock" },
  { href: "/ventas",             icon: "🧾", label: "Ventas"       },
];

export const NAV_COMPRADOR: NavItem[] = [
  { href: "/dashboard", icon: "◈",  label: "Dashboard"   },
  { href: "/pedidos",   icon: "🛒", label: "Mis pedidos" },
];

export function getNav(tipo_usuario: string): NavItem[] {
  if (tipo_usuario === "DUENO")    return NAV_DUENO;
  if (tipo_usuario === "EMPLEADO") return NAV_EMPLEADO;
  return NAV_COMPRADOR;
}

export const ROL_COLOR: Record<string, string> = {
  DUENO:     "var(--accent)",
  EMPLEADO:  "var(--blue)",
  COMPRADOR: "var(--green)",
};

export const ROL_LABEL: Record<string, string> = {
  DUENO:     "Dueño",
  EMPLEADO:  "Empleado",
  COMPRADOR: "Comprador",
};