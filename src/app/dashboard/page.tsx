"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

// Icons
const ClockIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const BriefcaseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
);

const UserIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const LogoutIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const s = {
  page: {
    minHeight: "100vh",
    padding: "20px",
    paddingTop: "calc(env(safe-area-inset-top, 0px) + 20px)",
    maxWidth: "600px",
    margin: "0 auto",
  },
  header: {
    marginBottom: "32px",
  },
  logo: {
    fontSize: "11px",
    fontWeight: 600,
    letterSpacing: "0.25em",
    color: "#3b82f6",
    textTransform: "uppercase" as const,
    marginBottom: "24px",
    display: "block",
  },
  welcome: {
    fontSize: "28px",
    fontWeight: 700,
    color: "#ffffff",
    marginBottom: "8px",
  },
  subtitle: {
    fontSize: "14px",
    color: "#666666",
  },
  clockSection: {
    backgroundColor: "#1a1a1a",
    borderRadius: "20px",
    padding: "32px 24px",
    border: "1px solid #2a2a2a",
    marginBottom: "24px",
    textAlign: "center" as const,
  },
  clockStatus: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    marginBottom: "16px",
  },
  clockStatusText: {
    fontSize: "14px",
    color: "#666666",
  },
  clockStatusActive: {
    color: "#10b981",
  },
  hoursDisplay: {
    fontSize: "48px",
    fontWeight: 700,
    color: "#ffffff",
    marginBottom: "8px",
  },
  hoursLabel: {
    fontSize: "14px",
    color: "#666666",
    marginBottom: "24px",
  },
  clockBtn: {
    width: "100%",
    padding: "20px",
    borderRadius: "16px",
    border: "none",
    fontSize: "18px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
  } as React.CSSProperties,
  clockInBtn: {
    backgroundColor: "#10b981",
    color: "#ffffff",
  },
  clockOutBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    border: "2px solid #ef4444",
    color: "#ef4444",
  },
  section: {
    marginBottom: "24px",
  },
  sectionTitle: {
    fontSize: "16px",
    fontWeight: 600,
    color: "#ffffff",
    marginBottom: "16px",
  },
  jobsCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: "16px",
    padding: "20px",
    border: "1px solid #2a2a2a",
  },
  emptyJobs: {
    textAlign: "center" as const,
    padding: "32px 16px",
    color: "#666666",
    fontSize: "14px",
  },
  jobItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px",
    backgroundColor: "#0a0a0a",
    borderRadius: "12px",
    marginBottom: "12px",
  },
  jobInfo: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  jobIcon: {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#3b82f6",
  },
  jobTitle: {
    fontSize: "15px",
    fontWeight: 600,
    color: "#ffffff",
    marginBottom: "2px",
  },
  jobMeta: {
    fontSize: "13px",
    color: "#666666",
  },
  jobStatus: {
    padding: "6px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: 500,
  },
  navGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "12px",
  },
  navCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: "16px",
    padding: "20px",
    border: "1px solid #2a2a2a",
    textDecoration: "none",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: "12px",
    transition: "all 0.15s ease",
    cursor: "pointer",
  } as React.CSSProperties,
  navIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  navLabel: {
    fontSize: "14px",
    fontWeight: 500,
    color: "#ffffff",
  },
  logoutBtn: {
    width: "100%",
    padding: "16px",
    borderRadius: "12px",
    backgroundColor: "transparent",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    color: "#ef4444",
    fontSize: "15px",
    fontWeight: 500,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    marginTop: "32px",
    transition: "all 0.15s ease",
  } as React.CSSProperties,
};

export default function EmployeeDashboard() {
  const router = useRouter();
  const { session, loading, logout } = useAuth();
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [todayHours, setTodayHours] = useState("0:00:00");
  const [clockInTime, setClockInTime] = useState<Date | null>(null);
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null);
  const [clockLoading, setClockLoading] = useState(false);
  const [lastSessionHours, setLastSessionHours] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  useEffect(() => {
    if (!loading && !session?.isAuthenticated) {
      router.replace("/employee/login");
    }
  }, [loading, session, router]);

  // Check clock status on page load
  useEffect(() => {
    const checkClockStatus = async () => {
      if (!session?.userId) return;

      try {
        const { data, error } = await supabase.rpc("get_clock_status", {
          p_user_id: session.userId,
        });

        console.log("[Dashboard] Clock status:", data, error);

        if (error) {
          console.error("Error checking clock status:", error);
          setStatusLoading(false);
          return;
        }

        if (data?.is_clocked_in) {
          setIsClockedIn(true);
          setCurrentEntryId(data.entry_id);
          setClockInTime(new Date(data.clock_in_time));
        } else {
          setIsClockedIn(false);
          setCurrentEntryId(null);
          setClockInTime(null);
        }
      } catch (err) {
        console.error("Error checking clock status:", err);
      } finally {
        setStatusLoading(false);
      }
    };

    if (session?.userId) {
      checkClockStatus();
    }
  }, [session?.userId]);

  // Update hours display when clocked in - update every second for live timer
  useEffect(() => {
    if (!isClockedIn || !clockInTime) return;

    const updateHours = () => {
      const now = new Date();
      const diff = now.getTime() - clockInTime.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTodayHours(`${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`);
    };

    updateHours();
    const interval = setInterval(updateHours, 1000); // Update every second

    return () => clearInterval(interval);
  }, [isClockedIn, clockInTime]);

  const handleClockIn = async () => {
    if (!session?.userId || !session?.orgId) return;

    setClockLoading(true);
    setLastSessionHours(null);

    try {
      const { data, error } = await supabase.rpc("clock_in", {
        p_user_id: session.userId,
        p_org_id: session.orgId,
      });

      console.log("[Dashboard] Clock in result:", data, error);

      if (error) {
        console.error("Error clocking in:", error);
        alert("Failed to clock in. Please try again.");
        return;
      }

      if (data?.success) {
        setIsClockedIn(true);
        setCurrentEntryId(data.entry_id);
        setClockInTime(new Date(data.clock_in_time));
      } else if (data?.error === "Already clocked in") {
        // Already clocked in, restore state
        setIsClockedIn(true);
        setCurrentEntryId(data.entry_id);
        setClockInTime(new Date(data.clock_in_time));
      } else {
        alert(data?.error || "Failed to clock in");
      }
    } catch (err) {
      console.error("Error clocking in:", err);
      alert("Failed to clock in. Please try again.");
    } finally {
      setClockLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!session?.userId) return;

    setClockLoading(true);

    try {
      const { data, error } = await supabase.rpc("clock_out", {
        p_user_id: session.userId,
      });

      console.log("[Dashboard] Clock out result:", data, error);

      if (error) {
        console.error("Error clocking out:", error);
        alert("Failed to clock out. Please try again.");
        return;
      }

      if (data?.success) {
        // Format total hours for display
        const totalHours = parseFloat(data.total_hours);
        const hours = Math.floor(totalHours);
        const minutes = Math.round((totalHours - hours) * 60);
        setLastSessionHours(`${hours}h ${minutes}m`);

        setIsClockedIn(false);
        setCurrentEntryId(null);
        setClockInTime(null);
        setTodayHours("0:00:00");
      } else {
        alert(data?.error || "Failed to clock out");
      }
    } catch (err) {
      console.error("Error clocking out:", err);
      alert("Failed to clock out. Please try again.");
    } finally {
      setClockLoading(false);
    }
  };

  const handleClockToggle = () => {
    if (isClockedIn) {
      handleClockOut();
    } else {
      handleClockIn();
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/employee/login");
  };

  if (loading || !session?.isAuthenticated) {
    return (
      <main style={s.page}>
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#666666" }}>
          Loading...
        </div>
      </main>
    );
  }

  return (
    <main style={s.page}>
      {/* Header */}
      <header style={s.header}>
        <span style={s.logo}>ShopFlows</span>
        <h1 style={s.welcome}>
          Welcome back{session.name ? `, ${session.name.split(" ")[0]}` : ""}!
        </h1>
        <p style={s.subtitle}>Here&apos;s your work overview for today</p>
      </header>

      {/* Clock In/Out Section */}
      <section style={s.clockSection}>
        <div style={s.clockStatus}>
          <div style={{
            width: "10px",
            height: "10px",
            borderRadius: "50%",
            backgroundColor: isClockedIn ? "#10b981" : "#666666",
          }} />
          <span style={{
            ...s.clockStatusText,
            ...(isClockedIn ? s.clockStatusActive : {}),
          }}>
            {isClockedIn ? "Currently Clocked In" : "Not Clocked In"}
          </span>
        </div>
        <div style={s.hoursDisplay}>{statusLoading ? "..." : todayHours}</div>
        <div style={s.hoursLabel}>
          {lastSessionHours ? `Last session: ${lastSessionHours}` : "Today's Hours"}
        </div>
        <button
          onClick={handleClockToggle}
          disabled={clockLoading || statusLoading}
          style={{
            ...s.clockBtn,
            ...(isClockedIn ? s.clockOutBtn : s.clockInBtn),
            opacity: clockLoading || statusLoading ? 0.6 : 1,
            cursor: clockLoading || statusLoading ? "not-allowed" : "pointer",
          }}
          onMouseEnter={(e) => {
            if (clockLoading || statusLoading) return;
            if (isClockedIn) {
              e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.2)";
            } else {
              e.currentTarget.style.backgroundColor = "#059669";
            }
          }}
          onMouseLeave={(e) => {
            if (isClockedIn) {
              e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.1)";
            } else {
              e.currentTarget.style.backgroundColor = "#10b981";
            }
          }}
        >
          <ClockIcon />
          {clockLoading ? "Processing..." : isClockedIn ? "Clock Out" : "Clock In"}
        </button>
      </section>

      {/* My Jobs Section */}
      <section style={s.section}>
        <h2 style={s.sectionTitle}>My Jobs</h2>
        <div style={s.jobsCard}>
          <div style={s.emptyJobs}>
            <BriefcaseIcon />
            <p style={{ marginTop: "12px" }}>No jobs assigned yet</p>
            <p style={{ fontSize: "13px", marginTop: "4px" }}>
              Jobs will appear here when assigned by your supervisor
            </p>
          </div>
        </div>
      </section>

      {/* Quick Navigation */}
      <section style={s.section}>
        <h2 style={s.sectionTitle}>Quick Actions</h2>
        <div style={s.navGrid}>
          <Link
            href="/jobs"
            style={s.navCard}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#3b82f6";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#2a2a2a";
            }}
          >
            <div style={{ ...s.navIcon, backgroundColor: "rgba(59, 130, 246, 0.1)", color: "#3b82f6" }}>
              <BriefcaseIcon />
            </div>
            <span style={s.navLabel}>All Jobs</span>
          </Link>
          <Link
            href="/profile"
            style={s.navCard}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#8b5cf6";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#2a2a2a";
            }}
          >
            <div style={{ ...s.navIcon, backgroundColor: "rgba(139, 92, 246, 0.1)", color: "#8b5cf6" }}>
              <UserIcon />
            </div>
            <span style={s.navLabel}>My Profile</span>
          </Link>
        </div>
      </section>

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        style={s.logoutBtn}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "#ef4444";
          e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.3)";
          e.currentTarget.style.backgroundColor = "transparent";
        }}
      >
        <LogoutIcon />
        Sign Out
      </button>
    </main>
  );
}