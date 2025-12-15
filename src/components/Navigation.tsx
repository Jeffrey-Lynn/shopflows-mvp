'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const DashboardIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
);

const UsersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const DepartmentsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const SettingsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const MenuIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const CloseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const LogoutIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const ArrowLeftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const BuildingIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
    <path d="M9 22v-4h6v4" />
    <path d="M8 6h.01" />
    <path d="M16 6h.01" />
    <path d="M8 10h.01" />
    <path d="M16 10h.01" />
  </svg>
);

export function Navigation() {
  const { session, logout, isPlatformAdmin } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [orgName, setOrgName] = useState<string | null>(null);

  // Fetch org name when platform admin is managing a specific org
  useEffect(() => {
    const fetchOrgName = async () => {
      if (isPlatformAdmin && session?.orgId) {
        const { data } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', session.orgId)
          .single();
        if (data) {
          setOrgName(data.name);
        }
      } else {
        setOrgName(null);
      }
    };
    fetchOrgName();
  }, [isPlatformAdmin, session?.orgId]);

  const isManagingOrg = isPlatformAdmin && session?.orgId && orgName;

  const baseNavItems: NavItem[] = [
    { label: 'Dashboard', href: '/admin', icon: <DashboardIcon /> },
    { label: 'Users', href: '/admin/users', icon: <UsersIcon /> },
    { label: 'Departments', href: '/admin/departments', icon: <DepartmentsIcon /> },
  ];

  const platformAdminItems: NavItem[] = [
    ...baseNavItems,
    { label: 'Settings', href: '/admin/settings', icon: <SettingsIcon /> },
  ];

  const navItems = isPlatformAdmin ? platformAdminItems : baseNavItems;

  const handleLogout = async () => {
    await logout();
    window.location.href = '/admin/login';
  };

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Top Navigation Bar */}
      <nav className="top-nav" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        minHeight: '60px',
        backgroundColor: '#1a1a1a',
        borderBottom: '1px solid #2a2a2a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        zIndex: 1000,
      }}>
        {/* Logo and Org Context */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              background: 'none',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            className="mobile-menu-btn"
          >
            {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
          
          {isManagingOrg ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Link 
                href="/platform" 
                style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(139, 92, 246, 0.1)',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                  color: '#8b5cf6',
                  fontSize: '12px',
                  fontWeight: 500,
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <ArrowLeftIcon />
                <span className="back-text">Platform</span>
              </Link>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                padding: '6px 12px',
                borderRadius: '6px',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
              }}>
                <BuildingIcon />
                <span style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#3b82f6',
                }} className="org-name-text">
                  {orgName}
                </span>
              </div>
            </div>
          ) : (
            <Link href="/admin" style={{ textDecoration: 'none' }}>
              <span style={{
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.25em',
                color: '#3b82f6',
                textTransform: 'uppercase',
              }}>
                ShopFlows
              </span>
            </Link>
          )}
        </div>

        {/* Desktop Nav Links */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }} className="desktop-nav">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 500,
                color: isActive(item.href) ? '#3b82f6' : '#a0a0a0',
                backgroundColor: isActive(item.href) ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                transition: 'all 0.15s ease',
              }}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </div>

        {/* User Info & Logout */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
          }} className="user-info">
            <span style={{
              fontSize: '14px',
              fontWeight: 500,
              color: '#ffffff',
            }}>
              {session?.name || session?.email || 'User'}
            </span>
            <span style={{
              fontSize: '11px',
              color: '#666666',
              textTransform: 'capitalize',
            }}>
              {session?.role?.replace('_', ' ')}
            </span>
          </div>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              borderRadius: '8px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#ef4444',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <LogoutIcon />
            <span className="logout-text">Logout</span>
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          style={{
            position: 'fixed',
            top: '60px',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999,
          }}
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Menu */}
      <div
        style={{
          position: 'fixed',
          top: '60px',
          left: 0,
          width: '280px',
          height: 'calc(100vh - 60px)',
          backgroundColor: '#1a1a1a',
          borderRight: '1px solid #2a2a2a',
          transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.2s ease',
          zIndex: 1000,
          overflowY: 'auto',
          padding: '16px',
        }}
        className="mobile-menu"
      >
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileMenuOpen(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '14px 16px',
              borderRadius: '10px',
              textDecoration: 'none',
              fontSize: '15px',
              fontWeight: 500,
              color: isActive(item.href) ? '#3b82f6' : '#a0a0a0',
              backgroundColor: isActive(item.href) ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
              marginBottom: '4px',
              transition: 'all 0.15s ease',
            }}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </div>

      {/* Spacer for fixed nav */}
      <div className="nav-spacer" style={{ height: '60px' }} />

      {/* Responsive Styles */}
      <style jsx global>{`
        .nav-spacer {
          height: calc(60px + env(safe-area-inset-top, 0px)) !important;
        }
        @media (min-width: 768px) {
          .mobile-menu-btn {
            display: none !important;
          }
          .mobile-menu {
            display: none !important;
          }
        }
        @media (max-width: 767px) {
          .desktop-nav {
            display: none !important;
          }
          .user-info {
            display: none !important;
          }
          .logout-text {
            display: none !important;
          }
          .back-text {
            display: none !important;
          }
          .org-name-text {
            max-width: 100px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }
      `}</style>
    </>
  );
}

export default Navigation;
