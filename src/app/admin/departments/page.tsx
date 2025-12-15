'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useDepartments } from '@/modules/departments/hooks/useDepartments';
import { DepartmentForm } from '@/modules/departments/components/DepartmentForm';
import { UserDepartmentAssignment } from '@/modules/departments/components/UserDepartmentAssignment';
import { 
  deactivateDepartment, 
  reactivateDepartment,
  Department 
} from '@/modules/departments/services/departmentService';

// =============================================================================
// STYLES
// =============================================================================

const s = {
  page: {
    minHeight: '100vh',
    padding: '20px',
    maxWidth: '900px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '24px',
    flexWrap: 'wrap' as const,
    gap: '12px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  backBtn: {
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#888888',
    backgroundColor: 'transparent',
    border: '1px solid #2a2a2a',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  } as React.CSSProperties,
  logo: {
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.2em',
    color: '#666666',
  },
  title: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#ffffff',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#666666',
    marginBottom: '24px',
  },
  addBtn: {
    padding: '10px 20px',
    borderRadius: '8px',
    backgroundColor: '#3b82f6',
    fontSize: '14px',
    fontWeight: 600,
    color: '#ffffff',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  } as React.CSSProperties,
  section: {
    marginBottom: '32px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#ffffff',
    marginBottom: '16px',
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid #2a2a2a',
  },
  tableHeader: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 1fr 140px',
    gap: '12px',
    padding: '12px 16px',
    fontSize: '11px',
    fontWeight: 600,
    color: '#666666',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    borderBottom: '1px solid #2a2a2a',
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 1fr 140px',
    gap: '12px',
    padding: '14px 16px',
    fontSize: '14px',
    color: '#999999',
    borderBottom: '1px solid #1a1a1a',
    alignItems: 'center',
  },
  deptName: {
    color: '#ffffff',
    fontWeight: 500,
  },
  deptDescription: {
    fontSize: '12px',
    color: '#666666',
    marginTop: '2px',
  },
  badge: {
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600,
  },
  activeBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    color: '#22c55e',
  },
  inactiveBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: '#ef4444',
  },
  countBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    color: '#3b82f6',
  },
  actions: {
    display: 'flex',
    gap: '8px',
  },
  actionBtn: {
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 500,
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  } as React.CSSProperties,
  editBtn: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    color: '#3b82f6',
  },
  deactivateBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: '#ef4444',
  },
  reactivateBtn: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    color: '#22c55e',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '40px',
    color: '#666666',
  },
  loading: {
    textAlign: 'center' as const,
    padding: '40px',
    color: '#666666',
  },
  error: {
    fontSize: '14px',
    color: '#ef4444',
    padding: '12px 16px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: '12px',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    marginBottom: '16px',
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
  },
  tab: {
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#888888',
    backgroundColor: 'transparent',
    border: '1px solid #2a2a2a',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  } as React.CSSProperties,
  tabActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
    color: '#ffffff',
  },
  showInactive: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
  },
  checkboxLabel: {
    fontSize: '13px',
    color: '#888888',
    cursor: 'pointer',
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

export default function DepartmentsPage() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const orgId = session?.orgId || session?.shopId;
  const { departments, loading, error, refresh } = useDepartments(orgId);

  const [activeTab, setActiveTab] = useState<'departments' | 'assignments'>('departments');
  const [showForm, setShowForm] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const isAdmin = session?.role === 'shop_admin' || session?.role === 'platform_admin';

  // Auth check
  useEffect(() => {
    if (!authLoading && (!session?.isAuthenticated || !isAdmin)) {
      router.replace('/admin');
    }
  }, [authLoading, session, isAdmin, router]);

  const handleAddDepartment = () => {
    setEditingDepartment(null);
    setShowForm(true);
  };

  const handleEditDepartment = (dept: Department) => {
    setEditingDepartment(dept);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingDepartment(null);
    refresh();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingDepartment(null);
  };

  const handleDeactivate = async (deptId: string) => {
    setActionError(null);
    const result = await deactivateDepartment(deptId);
    if (!result.success) {
      setActionError(result.error || 'Failed to deactivate department');
    } else {
      refresh();
    }
  };

  const handleReactivate = async (deptId: string) => {
    setActionError(null);
    const result = await reactivateDepartment(deptId);
    if (!result.success) {
      setActionError(result.error || 'Failed to reactivate department');
    } else {
      refresh();
    }
  };

  // Filter departments based on showInactive
  const filteredDepartments = showInactive 
    ? departments 
    : departments.filter(d => d.isActive);

  if (authLoading) {
    return <div style={s.loading}>Loading...</div>;
  }

  if (!isAdmin) {
    return <div style={s.emptyState}>Access denied. Admin only.</div>;
  }

  return (
    <main style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.headerLeft}>
          <button
            style={s.backBtn}
            onClick={() => router.push('/admin')}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#3b82f6';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#2a2a2a';
              e.currentTarget.style.color = '#888888';
            }}
          >
            ← Back
          </button>
          <span style={s.logo}>SHOPFLOWS</span>
        </div>
        <button
          style={s.addBtn}
          onClick={handleAddDepartment}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#2563eb';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#3b82f6';
          }}
        >
          + Add Department
        </button>
      </div>

      <h1 style={s.title}>Departments</h1>
      <p style={s.subtitle}>Manage departments and user assignments</p>

      {/* Tabs */}
      <div style={s.tabs}>
        <button
          style={activeTab === 'departments' ? { ...s.tab, ...s.tabActive } : s.tab}
          onClick={() => setActiveTab('departments')}
        >
          Departments
        </button>
        <button
          style={activeTab === 'assignments' ? { ...s.tab, ...s.tabActive } : s.tab}
          onClick={() => setActiveTab('assignments')}
        >
          User Assignments
        </button>
      </div>

      {actionError && <div style={s.error}>{actionError}</div>}
      {error && <div style={s.error}>{error}</div>}

      {/* Departments Tab */}
      {activeTab === 'departments' && (
        <div style={s.section}>
          {/* Show inactive toggle */}
          <label style={s.showInactive}>
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              style={s.checkbox}
            />
            <span style={s.checkboxLabel}>Show inactive departments</span>
          </label>

          <div style={s.card}>
            {loading ? (
              <div style={s.loading}>Loading departments...</div>
            ) : filteredDepartments.length === 0 ? (
              <div style={s.emptyState}>
                {departments.length === 0 
                  ? 'No departments yet. Click "Add Department" to create one.'
                  : 'No active departments. Check "Show inactive" to see deactivated departments.'}
              </div>
            ) : (
              <>
                <div style={s.tableHeader}>
                  <span>Department</span>
                  <span>Users</span>
                  <span>Jobs</span>
                  <span>Status</span>
                  <span>Actions</span>
                </div>
                {filteredDepartments.map(dept => (
                  <div key={dept.id} style={s.tableRow}>
                    <div>
                      <div style={s.deptName}>{dept.name}</div>
                      {dept.description && (
                        <div style={s.deptDescription}>{dept.description}</div>
                      )}
                    </div>
                    <span>
                      <span style={{ ...s.badge, ...s.countBadge }}>
                        {dept.userCount || 0}
                      </span>
                    </span>
                    <span>
                      <span style={{ ...s.badge, ...s.countBadge }}>
                        {dept.jobCount || 0}
                      </span>
                    </span>
                    <span>
                      <span style={{ 
                        ...s.badge, 
                        ...(dept.isActive ? s.activeBadge : s.inactiveBadge) 
                      }}>
                        {dept.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </span>
                    <div style={s.actions}>
                      <button
                        style={{ ...s.actionBtn, ...s.editBtn }}
                        onClick={() => handleEditDepartment(dept)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.25)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.15)';
                        }}
                      >
                        Edit
                      </button>
                      {dept.isActive ? (
                        <button
                          style={{ ...s.actionBtn, ...s.deactivateBtn }}
                          onClick={() => handleDeactivate(dept.id)}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.25)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
                          }}
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          style={{ ...s.actionBtn, ...s.reactivateBtn }}
                          onClick={() => handleReactivate(dept.id)}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(34, 197, 94, 0.25)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(34, 197, 94, 0.15)';
                          }}
                        >
                          Reactivate
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* User Assignments Tab */}
      {activeTab === 'assignments' && orgId && (
        <UserDepartmentAssignment
          orgId={orgId}
          departments={departments}
          onAssignmentChange={refresh}
        />
      )}

      {/* Department Form Modal */}
      {showForm && orgId && (
        <DepartmentForm
          orgId={orgId}
          department={editingDepartment}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      )}
    </main>
  );
}
