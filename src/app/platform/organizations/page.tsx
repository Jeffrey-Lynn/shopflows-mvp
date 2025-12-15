"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

// Inject global styles for animations
const globalStyles = `
  @keyframes org-spin {
    to { transform: rotate(360deg); }
  }
  .org-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #2a2a2a;
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: org-spin 1s linear infinite;
    margin: 0 auto;
  }
  .spinner-icon {
    animation: org-spin 1s linear infinite;
  }
`;

interface Organization {
  id: string;
  name: string;
  created_at: string;
  contact_email: string | null;
  user_count: number;
  department_count: number;
}

interface CreateOrgForm {
  name: string;
  contactEmail: string;
  description: string;
}

interface FormErrors {
  name?: string;
  contactEmail?: string;
  general?: string;
}

// Icons
const BuildingIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
    <path d="M9 22v-4h6v4" />
    <path d="M8 6h.01" />
    <path d="M16 6h.01" />
    <path d="M8 10h.01" />
    <path d="M16 10h.01" />
    <path d="M8 14h.01" />
    <path d="M16 14h.01" />
  </svg>
);

const UsersIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const DepartmentsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const ArrowLeftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const CalendarIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const SpinnerIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="spinner-icon">
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

const s = {
  page: {
    minHeight: "100vh",
    padding: "20px",
    maxWidth: "1200px",
    margin: "0 auto",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "24px",
    flexWrap: "wrap" as const,
    gap: "12px",
  },
  backLink: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    color: "#666666",
    textDecoration: "none",
    fontSize: "14px",
    marginBottom: "16px",
    transition: "color 0.15s ease",
  },
  title: {
    fontSize: "28px",
    fontWeight: 700,
    color: "#ffffff",
    marginBottom: "8px",
  },
  subtitle: {
    fontSize: "14px",
    color: "#666666",
    marginBottom: "24px",
  },
  createBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 20px",
    borderRadius: "10px",
    backgroundColor: "#3b82f6",
    border: "none",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.15s ease",
  } as React.CSSProperties,
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: "20px",
  },
  card: {
    backgroundColor: "#1a1a1a",
    borderRadius: "16px",
    padding: "24px",
    border: "1px solid #2a2a2a",
    transition: "all 0.15s ease",
  },
  cardHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: "16px",
  },
  orgIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "12px",
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#3b82f6",
  },
  orgName: {
    fontSize: "18px",
    fontWeight: 600,
    color: "#ffffff",
    marginBottom: "4px",
  },
  orgEmail: {
    fontSize: "13px",
    color: "#666666",
  },
  statsRow: {
    display: "flex",
    gap: "20px",
    marginBottom: "16px",
  },
  stat: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "13px",
    color: "#999999",
  },
  dateRow: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "12px",
    color: "#666666",
    marginBottom: "20px",
  },
  manageBtn: {
    width: "100%",
    padding: "12px",
    borderRadius: "10px",
    backgroundColor: "transparent",
    border: "1px solid #3b82f6",
    color: "#3b82f6",
    fontSize: "14px",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.15s ease",
  } as React.CSSProperties,
  emptyState: {
    textAlign: "center" as const,
    padding: "60px 20px",
    color: "#666666",
  },
  emptyIcon: {
    width: "64px",
    height: "64px",
    borderRadius: "16px",
    backgroundColor: "#1a1a1a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 16px",
    color: "#444444",
  },
  // Modal styles
  modalOverlay: {
    position: "fixed" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2000,
    padding: "20px",
  },
  modal: {
    backgroundColor: "#1a1a1a",
    borderRadius: "16px",
    border: "1px solid #2a2a2a",
    width: "100%",
    maxWidth: "480px",
    maxHeight: "90vh",
    overflow: "auto",
  },
  modalHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 24px",
    borderBottom: "1px solid #2a2a2a",
  },
  modalTitle: {
    fontSize: "18px",
    fontWeight: 600,
    color: "#ffffff",
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#666666",
    cursor: "pointer",
    padding: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "6px",
    transition: "all 0.15s ease",
  } as React.CSSProperties,
  modalBody: {
    padding: "24px",
  },
  formGroup: {
    marginBottom: "20px",
  },
  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: 500,
    color: "#a0a0a0",
    marginBottom: "8px",
  },
  required: {
    color: "#ef4444",
    marginLeft: "2px",
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #2a2a2a",
    backgroundColor: "#0a0a0a",
    color: "#ffffff",
    fontSize: "14px",
    outline: "none",
    transition: "border-color 0.15s ease",
  } as React.CSSProperties,
  inputError: {
    borderColor: "#ef4444",
  },
  textarea: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #2a2a2a",
    backgroundColor: "#0a0a0a",
    color: "#ffffff",
    fontSize: "14px",
    outline: "none",
    resize: "vertical" as const,
    minHeight: "100px",
    fontFamily: "inherit",
    transition: "border-color 0.15s ease",
  } as React.CSSProperties,
  errorText: {
    fontSize: "12px",
    color: "#ef4444",
    marginTop: "6px",
  },
  generalError: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.2)",
    borderRadius: "10px",
    padding: "12px 14px",
    marginBottom: "20px",
    fontSize: "13px",
    color: "#ef4444",
  },
  modalFooter: {
    display: "flex",
    gap: "12px",
    justifyContent: "flex-end",
    padding: "20px 24px",
    borderTop: "1px solid #2a2a2a",
  },
  cancelBtn: {
    padding: "12px 20px",
    borderRadius: "10px",
    backgroundColor: "transparent",
    border: "1px solid #2a2a2a",
    color: "#a0a0a0",
    fontSize: "14px",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.15s ease",
  } as React.CSSProperties,
  submitBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 20px",
    borderRadius: "10px",
    backgroundColor: "#3b82f6",
    border: "none",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.15s ease",
  } as React.CSSProperties,
  submitBtnDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  successToast: {
    position: "fixed" as const,
    bottom: "24px",
    right: "24px",
    backgroundColor: "#10b981",
    color: "#ffffff",
    padding: "14px 20px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "14px",
    fontWeight: 500,
    zIndex: 3000,
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
  },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function OrganizationsPage() {
  const router = useRouter();
  const { session, loading: authLoading, loginAdmin } = useAuth();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState<CreateOrgForm>({
    name: "",
    contactEmail: "",
    description: "",
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const isPlatformAdmin = session?.role === "platform_admin";

  useEffect(() => {
    if (!authLoading && (!session?.isAuthenticated || !isPlatformAdmin)) {
      router.replace("/admin/login");
    }
  }, [authLoading, session, isPlatformAdmin, router]);

  useEffect(() => {
    const fetchOrgs = async () => {
      if (!isPlatformAdmin) return;

      try {
        // Fetch all organizations
        const { data: orgsData, error } = await supabase
          .from("organizations")
          .select("id, name, created_at, contact_email")
          .order("name", { ascending: true });

        if (error) throw error;

        if (orgsData && orgsData.length > 0) {
          const orgIds = orgsData.map(o => o.id);

          // Get user and department counts per org
          const [userCounts, deptCounts] = await Promise.all([
            supabase.from("users").select("org_id").in("org_id", orgIds),
            supabase.from("departments").select("org_id").in("org_id", orgIds),
          ]);

          const userCountMap = new Map<string, number>();
          const deptCountMap = new Map<string, number>();

          (userCounts.data || []).forEach(u => {
            userCountMap.set(u.org_id, (userCountMap.get(u.org_id) || 0) + 1);
          });

          (deptCounts.data || []).forEach(d => {
            deptCountMap.set(d.org_id, (deptCountMap.get(d.org_id) || 0) + 1);
          });

          const mapped: Organization[] = orgsData.map(org => ({
            id: org.id,
            name: org.name,
            created_at: org.created_at,
            contact_email: org.contact_email,
            user_count: userCountMap.get(org.id) || 0,
            department_count: deptCountMap.get(org.id) || 0,
          }));

          setOrgs(mapped);
        } else {
          setOrgs([]);
        }
      } catch (err) {
        console.error("Error fetching organizations:", err);
      } finally {
        setLoading(false);
      }
    };

    if (isPlatformAdmin) fetchOrgs();
  }, [isPlatformAdmin]);

  // Fetch orgs function for refresh
  const refreshOrgs = useCallback(async () => {
    try {
      const { data: orgsData, error } = await supabase
        .from("organizations")
        .select("id, name, created_at, contact_email")
        .order("name", { ascending: true });

      if (error) throw error;

      if (orgsData && orgsData.length > 0) {
        const orgIds = orgsData.map(o => o.id);

        const [userCounts, deptCounts] = await Promise.all([
          supabase.from("users").select("org_id").in("org_id", orgIds),
          supabase.from("departments").select("org_id").in("org_id", orgIds),
        ]);

        const userCountMap = new Map<string, number>();
        const deptCountMap = new Map<string, number>();

        (userCounts.data || []).forEach(u => {
          userCountMap.set(u.org_id, (userCountMap.get(u.org_id) || 0) + 1);
        });

        (deptCounts.data || []).forEach(d => {
          deptCountMap.set(d.org_id, (deptCountMap.get(d.org_id) || 0) + 1);
        });

        const mapped: Organization[] = orgsData.map(org => ({
          id: org.id,
          name: org.name,
          created_at: org.created_at,
          contact_email: org.contact_email,
          user_count: userCountMap.get(org.id) || 0,
          department_count: deptCountMap.get(org.id) || 0,
        }));

        setOrgs(mapped);
      } else {
        setOrgs([]);
      }
    } catch (err) {
      console.error("Error refreshing organizations:", err);
    }
  }, []);

  const handleManageOrg = (org: Organization) => {
    // Update session to set this org as active context
    loginAdmin({
      orgId: org.id,
      userId: session?.userId || "",
      email: session?.email || "",
      name: session?.name || "",
      role: "platform_admin",
    });
    // Navigate to admin dashboard for this org
    router.push("/admin");
  };

  // Modal handlers
  const openCreateModal = () => {
    setFormData({ name: "", contactEmail: "", description: "" });
    setFormErrors({});
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setFormData({ name: "", contactEmail: "", description: "" });
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      errors.name = "Organization name is required";
    } else if (formData.name.trim().length < 2) {
      errors.name = "Name must be at least 2 characters";
    }

    // Email validation
    if (!formData.contactEmail.trim()) {
      errors.contactEmail = "Contact email is required";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.contactEmail.trim())) {
        errors.contactEmail = "Please enter a valid email address";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSubmitting(true);
    setFormErrors({});

    try {
      const { data, error } = await supabase
        .from("organizations")
        .insert({
          name: formData.name.trim(),
          contact_email: formData.contactEmail.trim(),
          description: formData.description.trim() || null,
        })
        .select()
        .single();

      if (error) {
        // Handle duplicate name error
        if (error.code === "23505" || error.message.includes("duplicate")) {
          setFormErrors({ name: "An organization with this name already exists" });
        } else {
          setFormErrors({ general: error.message || "Failed to create organization" });
        }
        return;
      }

      // Success
      closeCreateModal();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      
      // Refresh the list
      await refreshOrgs();

    } catch (err) {
      setFormErrors({ general: "An unexpected error occurred. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof CreateOrgForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (formErrors[field as keyof FormErrors]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  if (authLoading || !session?.isAuthenticated) {
    return (
      <div style={s.emptyState}>
        <div style={{
          width: "40px",
          height: "40px",
          border: "3px solid #2a2a2a",
          borderTopColor: "#3b82f6",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
          margin: "0 auto",
        }} />
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!isPlatformAdmin) {
    return <div style={s.emptyState}>Access denied. Platform admin only.</div>;
  }

  return (
    <main style={s.page}>
      {/* Back Link */}
      <Link 
        href="/platform" 
        style={s.backLink}
        onMouseEnter={(e) => { e.currentTarget.style.color = '#3b82f6'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = '#666666'; }}
      >
        <ArrowLeftIcon />
        Back to Platform Dashboard
      </Link>

      {/* Header */}
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Organizations</h1>
          <p style={{ ...s.subtitle, marginBottom: 0 }}>
            Manage all organizations on the platform
          </p>
        </div>
        <button
          onClick={openCreateModal}
          style={s.createBtn}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#2563eb'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#3b82f6'; }}
        >
          <PlusIcon />
          Create Organization
        </button>
      </div>

      {/* Organizations Grid */}
      {loading ? (
        <div style={s.emptyState}>
          <div className="org-spinner" />
          <p style={{ marginTop: "16px" }}>Loading organizations...</p>
        </div>
      ) : orgs.length === 0 ? (
        <div style={s.emptyState}>
          <div style={s.emptyIcon}>
            <BuildingIcon />
          </div>
          <h3 style={{ color: "#ffffff", marginBottom: "8px" }}>No organizations yet</h3>
          <p>Create your first organization to get started.</p>
          <button
            onClick={openCreateModal}
            style={{ ...s.createBtn, marginTop: "20px" }}
          >
            <PlusIcon />
            Create Organization
          </button>
        </div>
      ) : (
        <div style={s.grid}>
          {orgs.map(org => (
            <div
              key={org.id}
              style={s.card}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#3b82f6';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#2a2a2a';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={s.cardHeader}>
                <div>
                  <div style={s.orgName}>{org.name}</div>
                  <div style={s.orgEmail}>{org.contact_email || "No contact email"}</div>
                </div>
                <div style={s.orgIcon}>
                  <BuildingIcon />
                </div>
              </div>

              <div style={s.statsRow}>
                <div style={s.stat}>
                  <UsersIcon />
                  <span>{org.user_count} users</span>
                </div>
                <div style={s.stat}>
                  <DepartmentsIcon />
                  <span>{org.department_count} departments</span>
                </div>
              </div>

              <div style={s.dateRow}>
                <CalendarIcon />
                <span>Created {formatDate(org.created_at)}</span>
              </div>

              <button
                onClick={() => handleManageOrg(org)}
                style={s.manageBtn}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#3b82f6';
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#3b82f6';
                }}
              >
                Manage Organization
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create Organization Modal */}
      {showCreateModal && (
        <div 
          style={s.modalOverlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeCreateModal();
          }}
        >
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}>Create Organization</h2>
              <button
                onClick={closeCreateModal}
                style={s.closeBtn}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#ffffff'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#666666'; }}
              >
                <CloseIcon />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={s.modalBody}>
                {formErrors.general && (
                  <div style={s.generalError}>{formErrors.general}</div>
                )}

                <div style={s.formGroup}>
                  <label style={s.label}>
                    Organization Name<span style={s.required}>*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Enter organization name"
                    style={{
                      ...s.input,
                      ...(formErrors.name ? s.inputError : {}),
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = formErrors.name ? '#ef4444' : '#2a2a2a'; }}
                    disabled={submitting}
                  />
                  {formErrors.name && (
                    <div style={s.errorText}>{formErrors.name}</div>
                  )}
                </div>

                <div style={s.formGroup}>
                  <label style={s.label}>
                    Contact Email<span style={s.required}>*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => handleInputChange("contactEmail", e.target.value)}
                    placeholder="contact@organization.com"
                    style={{
                      ...s.input,
                      ...(formErrors.contactEmail ? s.inputError : {}),
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = formErrors.contactEmail ? '#ef4444' : '#2a2a2a'; }}
                    disabled={submitting}
                  />
                  {formErrors.contactEmail && (
                    <div style={s.errorText}>{formErrors.contactEmail}</div>
                  )}
                </div>

                <div style={s.formGroup}>
                  <label style={s.label}>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    placeholder="Brief description of the organization (optional)"
                    style={s.textarea}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = '#2a2a2a'; }}
                    disabled={submitting}
                  />
                </div>
              </div>

              <div style={s.modalFooter}>
                <button
                  type="button"
                  onClick={closeCreateModal}
                  style={s.cancelBtn}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#444444'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2a2a2a'; }}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    ...s.submitBtn,
                    ...(submitting ? s.submitBtnDisabled : {}),
                  }}
                  onMouseEnter={(e) => { if (!submitting) e.currentTarget.style.backgroundColor = '#2563eb'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#3b82f6'; }}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <SpinnerIcon />
                      Creating...
                    </>
                  ) : (
                    <>
                      <PlusIcon />
                      Create Organization
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {showSuccess && (
        <div style={s.successToast}>
          <CheckIcon />
          Organization created successfully!
        </div>
      )}

      {/* Global styles for animations */}
      <style dangerouslySetInnerHTML={{ __html: globalStyles }} />
    </main>
  );
}
