// components/StatsRow.jsx
import React from "react";
import { Link } from "react-router-dom";
import useAuthStore from "../store/authStore";

// Icons
export const DocketIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#f97316"
    strokeWidth="2"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M9 9h6M9 13h6M9 17h4" />
  </svg>
);

export const TaskboardIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#f97316"
    strokeWidth="2"
  >
    <rect x="3" y="3" width="7" height="9" rx="1" />
    <rect x="14" y="3" width="7" height="5" rx="1" />
    <rect x="14" y="12" width="7" height="9" rx="1" />
    <rect x="3" y="16" width="7" height="5" rx="1" />
  </svg>
);

export const ApplicationIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#f97316"
    strokeWidth="2"
  >
    <path d="M9 11l3 3L22 4" />
    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
  </svg>
);

export const DeadlineIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#f97316"
    strokeWidth="2"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
);

// StatCard Component
export const StatCard = ({
  icon,
  title,
  count,
  status = "Active",
  link = "#",
  loading = false,
}) => (
  <div style={styles.statCard}>
    <div style={styles.statCardContent}>
      <div style={styles.iconWrapper}>{icon}</div>
      <div style={styles.statInfo}>
        <span style={styles.statTitle}>{title}</span>
        {loading ? (
          <div style={styles.countSpinnerWrapper}>
            <div style={styles.countSpinner}></div>
          </div>
        ) : (
          <span style={styles.statCount}>{count}</span>
        )}
      </div>
    </div>
    <div style={styles.statCardFooter}>
      <span style={styles.statusBadge}>{status}</span>
      <Link to={link} style={styles.viewMoreLink}>
        View More
      </Link>
    </div>
  </div>
);

// Main StatsRow Component
export default function StatsRow() {
  const { stats, isStatsLoading } = useAuthStore();

  return (
    <div style={styles.statsRow} className="stats-row">
      <StatCard
        icon={<DocketIcon />}
        title="Docket"
        count={stats.dockets}
        link="/docket"
        loading={isStatsLoading}
      />
      <StatCard
        icon={<TaskboardIcon />}
        title="Taskboard"
        count={stats.tasks}
        link="/task"
        loading={isStatsLoading}
      />
      <StatCard
        icon={<ApplicationIcon />}
        title="Application"
        count={stats.applications}
        link="/application"
        loading={isStatsLoading}
      />
      <StatCard
        icon={<DeadlineIcon />}
        title="Deadline"
        count={stats.deadlines}
        link="/deadline"
        loading={isStatsLoading}
      />
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// Styles
// Updated Styles
const styles = {
  statsRow: {
    display: "grid",
    // Changed to auto-fit with minmax for responsiveness
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "15px",
    marginBottom: "20px",
  },
  statCard: {
    backgroundColor: "#fff",
    borderRadius: "12px",
    padding: "20px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    border: "1px solid #fee2e2",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  statCardContent: {
    display: "flex",
    alignItems: "flex-start",
    gap: "15px",
    marginBottom: "15px",
  },
  iconWrapper: {
    width: "48px",
    height: "48px",
    minWidth: "48px", // Prevent shrinking on small screens
    backgroundColor: "#fff7ed",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  statInfo: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    flex: 1,
    overflow: "hidden", // Prevents text overflow breaking layout
  },
  statTitle: {
    fontSize: "13px",
    color: "#6b7280",
    marginBottom: "5px",
    whiteSpace: "nowrap",
  },
  statCount: {
    fontSize: "28px",
    fontWeight: "700",
    color: "#111827",
  },
  statCardFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderTop: "1px solid #f3f4f6",
    paddingTop: "12px",
  },
  statusBadge: {
    fontSize: "12px",
    color: "#22c55e",
    fontWeight: "500",
  },
  viewMoreLink: {
    fontSize: "12px",
    color: "#6b7280",
    textDecoration: "none",
  },
  countSpinnerWrapper: {
    height: "36px",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  countSpinner: {
    width: "24px",
    height: "24px",
    border: "3px solid #f3f4f6",
    borderTop: "3px solid #f97316",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
};
