import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { noticesApi } from '../../api/notices.api';
import { useAuth } from '../../contexts/AuthContext';
import type { Role } from '../../types';

const RESIDENT_NOTICES_UPDATED_EVENT = 'resident-notices-updated';

function DashboardIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6V11h-6v9Zm0-18v7h6V2h-6Z" />
    </svg>
  );
}

function BuildingsIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M3 21h18" />
      <path d="M5 21V7l7-4 7 4v14" />
      <path d="M9 10h.01M15 10h.01M9 14h.01M15 14h.01" />
    </svg>
  );
}

function UsersIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function StructureIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M12 3v5" />
      <path d="M6 10v4" />
      <path d="M18 10v4" />
      <path d="M12 8H7a1 1 0 0 0-1 1v1" />
      <path d="M12 8h5a1 1 0 0 1 1 1v1" />
      <rect x="3" y="14" width="6" height="7" rx="1" />
      <rect x="15" y="14" width="6" height="7" rx="1" />
      <rect x="9" y="3" width="6" height="5" rx="1" />
    </svg>
  );
}

function FeesIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M12 1v22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14.5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function PaymentsIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
      <path d="M6 15h4" />
    </svg>
  );
}

function DebtIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6l4 2" />
    </svg>
  );
}

function NoticesIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M4 5h16v10H7l-3 3V5Z" />
      <path d="M8 9h8" />
      <path d="M8 12h5" />
    </svg>
  );
}

function ReportsIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-6" />
      <path d="M22 20v-9" />
    </svg>
  );
}

function ExchangeRateIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M17 1v4h4" />
      <path d="M3 11V7a4 4 0 0 1 4-4h14" />
      <path d="M7 23v-4H3" />
      <path d="M21 13v4a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

function ProfileIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

interface NavItem {
  label: string;
  path: string;
  roles: Role[];
  icon: ({ className }: { className?: string }) => JSX.Element;
}

const NAV_ITEMS: NavItem[] = [
  // Superadmin
  { label: 'Dashboard', path: '/superadmin', roles: ['superadmin'], icon: DashboardIcon },
  { label: 'Condominios', path: '/superadmin/condominios', roles: ['superadmin'], icon: BuildingsIcon },
  { label: 'Usuarios', path: '/superadmin/usuarios', roles: ['superadmin'], icon: UsersIcon },
  // Admin
  { label: 'Dashboard', path: '/admin', roles: ['admin'], icon: DashboardIcon },
  { label: 'Estructura', path: '/admin/estructura', roles: ['admin'], icon: StructureIcon },
  { label: 'Cuotas', path: '/admin/cuotas', roles: ['admin'], icon: FeesIcon },
  { label: 'Pagos', path: '/admin/pagos', roles: ['admin'], icon: PaymentsIcon },
  { label: 'Deudas y Moras', path: '/admin/deudas', roles: ['admin'], icon: DebtIcon },
  { label: 'Comunicados', path: '/admin/comunicados', roles: ['admin'], icon: NoticesIcon },
  { label: 'Reportes', path: '/admin/reportes', roles: ['admin'], icon: ReportsIcon },
  { label: 'Usuarios', path: '/admin/usuarios', roles: ['admin'], icon: UsersIcon },
  // Accountant
  { label: 'Dashboard', path: '/contador', roles: ['accountant'], icon: DashboardIcon },
  { label: 'Tipo de Cambio', path: '/contador/tipo-cambio', roles: ['accountant'], icon: ExchangeRateIcon },
  { label: 'Estado de Cuenta Global', path: '/contador/estado-cuenta', roles: ['accountant'], icon: ReportsIcon },
  // Resident
  { label: 'Mi Estado de Cuenta', path: '/residente', roles: ['resident'], icon: DashboardIcon },
  { label: 'Comunicados', path: '/residente/comunicados', roles: ['resident'], icon: NoticesIcon },
  { label: 'Mi Perfil', path: '/residente/perfil', roles: ['resident'], icon: ProfileIcon },
];

export function Sidebar() {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [unreadNoticeCount, setUnreadNoticeCount] = useState(0);

  const items = NAV_ITEMS.filter(item => user && item.roles.includes(user.role));

  useEffect(() => {
    if (user?.role !== 'resident' || !user.condominium_id) {
      setUnreadNoticeCount(0);
      return;
    }

    const loadUnreadCount = () => {
      noticesApi.getUnreadCount(user.condominium_id!)
        .then(response => setUnreadNoticeCount(response.data.count))
        .catch(() => setUnreadNoticeCount(0));
    };

    loadUnreadCount();
    window.addEventListener(RESIDENT_NOTICES_UPDATED_EVENT, loadUnreadCount);
    return () => window.removeEventListener(RESIDENT_NOTICES_UPDATED_EVENT, loadUnreadCount);
  }, [user]);

  return (
    <aside
      className={`bg-primary-800 text-white flex flex-col transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      } min-h-screen`}
    >
      <div className="flex items-center justify-between p-4 border-b border-primary-700" style={{ height: '65px' }}>
        {!collapsed && (
          <span className="font-bold text-lg truncate">Condominios</span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded hover:bg-primary-700 ml-auto"
          title="Colapsar menú"
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>
      <nav className="flex-1 py-4">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path.split('/').length === 2}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 text-sm hover:bg-primary-700 transition-colors ${
                isActive ? 'bg-primary-700 border-r-2 border-white font-medium' : ''
              }`
            }
            title={collapsed ? item.label : undefined}
          >
            <div className="relative shrink-0">
              <item.icon className="h-5 w-5 shrink-0" />
              {user?.role === 'resident' && item.path === '/residente/comunicados' && unreadNoticeCount > 0 && (
                <span className="absolute -top-2 -right-2 min-w-[1.1rem] h-[1.1rem] rounded-full bg-red-600 px-1 text-[10px] font-bold text-white flex items-center justify-center">
                  {unreadNoticeCount > 99 ? '99+' : unreadNoticeCount}
                </span>
              )}
            </div>
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
