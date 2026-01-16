import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { Eye } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from "recharts";
import useAuthStore from "../../store/authStore";
import { toast } from "react-toastify";

// Import role-specific dashboard components
import StaffDashboard from "./StaffDashboard";
import ClientDashboard from "./ClientDashboard";
import {
  ApplicationIcon,
  DeadlineIcon,
  DocketIcon,
  StatCard,
  TaskboardIcon,
} from "../../components/StatsRow";

// Admin/Manager Dashboard Component
function AdminManagerDashboard() {
  const [dockets, setDockets] = useState([]);
  const { stats, isStatsLoading } = useAuthStore();
  const [performanceData, setPerformanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [chartFilter, setChartFilter] = useState("1Y");
  const recordsPerPage = 5;
  const navigate = useNavigate();

  const handleViewDocket = (docket) => {
    navigate("/docket", { state: { viewDocket: docket, showDetail: true } });
  };

  const fetchDockets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", currentPage);
      params.append("limit", recordsPerPage);
      const res = await axios.get(`/api/dockets?${params.toString()}`);
      const docketsData = res.data.dockets || res.data || [];
      setDockets(docketsData);
      const total =
        res.data.total ||
        res.data.totalRecords ||
        res.data.count ||
        docketsData.length;
      setTotalRecords(total);
    } catch (err) {
      if (!import.meta.env.PROD) console.error("Error fetching dockets", err);
      toast.error(
        err?.response?.data?.message || "Some occurred. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchPerformanceData = async () => {
    try {
      const res = await axios.get(
        `/api/dockets/performance?filter=${chartFilter}`
      );
      setPerformanceData(res.data);
      // setPerformanceData([
      //   { month: "Jan", bar: 28, area: 12 },
      //   { month: "Feb", bar: 62, area: 18 },
      //   { month: "Mar", bar: 45, area: 22 },
      //   { month: "Apr", bar: 55, area: 15 },
      //   { month: "May", bar: 38, area: 20 },
      //   { month: "Jun", bar: 25, area: 18 },
      //   { month: "Jul", bar: 18, area: 12 },
      //   { month: "Aug", bar: 35, area: 15 },
      //   { month: "Sep", bar: 78, area: 25 },
      //   { month: "Oct", bar: 48, area: 18 },
      //   { month: "Nov", bar: 42, area: 20 },
      //   { month: "Dec", bar: 55, area: 35 },
      // ]);
    } catch (err) {
      if (!import.meta.env.PROD)
        console.error("Error fetching performance data", err);
      toast.error(
        err?.response?.data?.message || "Error fetching performance data."
      );
    }
  };

  useEffect(() => {
    fetchPerformanceData();
  }, []);
  useEffect(() => {
    fetchDockets();
  }, [currentPage]);
  useEffect(() => {
    fetchPerformanceData();
  }, [chartFilter]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "--";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "--";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "2-digit",
    });
  };

  const totalPages = Math.ceil(totalRecords / recordsPerPage) || 1;
  const canGoNext = currentPage < totalPages;
  const canGoPrev = currentPage > 1;

  const getPageNumbers = () => {
    const pages = [];
    let startPage = Math.max(1, currentPage - 1);
    let endPage = Math.min(totalPages, startPage + 2);
    if (endPage - startPage < 2 && totalPages >= 3)
      startPage = Math.max(1, endPage - 2);
    for (let i = startPage; i <= endPage; i++) pages.push(i);
    return pages;
  };

  return (
    <div style={styles.container}>
      <div style={styles.statsRow} className="stats-row">
        <div style={styles.statsLeft}>
          <div style={styles.statsGrid} className="stats-grid">
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
          </div>
        </div>
        <div style={styles.chartCard} className="chart-card">
          <div style={styles.chartHeader} className="chart-header">
            <h3 style={styles.chartTitle}>Performance</h3>
            <div style={styles.chartFilters} className="chart-filters">
              {["ALL", "1M", "6M", "1Y"].map((f) => (
                <button
                  key={f}
                  onClick={() => setChartFilter(f)}
                  style={{
                    ...styles.filterBtn,
                    ...(chartFilter === f ? styles.filterBtnActive : {}),
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div style={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart
                data={performanceData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="greenAreaGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
                    <stop
                      offset="100%"
                      stopColor="#22c55e"
                      stopOpacity={0.05}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f0f0f0"
                />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#999" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#999" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="area"
                  stroke="#22c55e"
                  strokeWidth={2}
                  fill="url(#greenAreaGradient)"
                  dot={{
                    fill: "#22c55e",
                    r: 4,
                    strokeWidth: 2,
                    stroke: "#fff",
                  }}
                />
                <Bar
                  dataKey="bar"
                  fill="#f97316"
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <div style={styles.tableCard}>
        <div style={styles.tableHeader}>
          <h3 style={styles.tableTitle}>Docket</h3>
          <Link to="/docket" style={styles.viewAllBtn}>
            View All
          </Link>
        </div>
        <div style={styles.tableWrapper} className="table-wrapper">
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Sr no.</th>
                <th style={styles.th}>Instruction Date</th>
                <th style={styles.th}>anovIP Ref.Number</th>
                <th style={styles.th}>Service</th>
                <th style={styles.th}>Application Type</th>
                <th style={styles.th}>Date of Filing</th>
                <th style={styles.th}>Country of Filing</th>
                <th style={styles.th}>Insert By</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" style={styles.tdCenter}>
                    Loading...
                  </td>
                </tr>
              ) : dockets.length === 0 ? (
                <tr>
                  <td colSpan="9" style={styles.tdCenter}>
                    No records found
                  </td>
                </tr>
              ) : (
                dockets.map((docket, index) => (
                  <tr key={docket._id} style={styles.tr}>
                    <td style={styles.td}>
                      {(currentPage - 1) * recordsPerPage + index + 1}
                    </td>
                    <td style={styles.td}>
                      {formatDate(docket.instruction_date)}
                    </td>
                    <td style={styles.td}>{docket.docket_no}</td>
                    <td style={styles.td}>{docket.service_name}</td>
                    <td style={styles.td}>{docket.application_type}</td>
                    <td style={styles.td}>{formatDate(docket.filling_date)}</td>
                    <td style={styles.td}>{docket.filling_country}</td>
                    <td style={styles.td}>
                      {docket.inserted_by || docket.email}
                    </td>
                    <td style={styles.td}>
                      <span
                        style={styles.viewLink}
                        onClick={() => handleViewDocket(docket)}
                      >
                        View{" "}
                        <span style={styles.viewIcon}>
                          <Eye style={{ scale: "0.7" }} />
                        </span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div style={styles.pagination}>
          <span style={styles.paginationInfo}>
            Showing{" "}
            <strong>
              {(currentPage - 1) * recordsPerPage + 1}-
              {Math.min(currentPage * recordsPerPage, totalRecords)}
            </strong>{" "}
            of <strong>{totalRecords.toLocaleString()}</strong> orders
          </span>
          <div style={styles.paginationBtns}>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={!canGoPrev}
              style={{
                ...styles.pageBtn,
                opacity: !canGoPrev ? 0.5 : 1,
                cursor: !canGoPrev ? "not-allowed" : "pointer",
              }}
            >
              ←
            </button>
            {getPageNumbers().map((p) => (
              <button
                key={p}
                onClick={() => setCurrentPage(p)}
                style={{
                  ...styles.pageBtn,
                  ...(currentPage === p ? styles.pageBtnActive : {}),
                }}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={!canGoNext}
              style={{
                ...styles.pageBtn,
                opacity: !canGoNext ? 0.5 : 1,
                cursor: !canGoNext ? "not-allowed" : "pointer",
              }}
            >
              →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Dashboard Component with Role-Based Rendering
function Index() {
  const { user } = useAuthStore();

  // Get user role name (handle different possible structures)
  const getRoleName = () => {
    if (!user || !user.role_id) return null;
    // Handle both object and string role_id
    if (typeof user.role_id === "object") {
      return user.role_id.name?.toLowerCase();
    }
    return user.role_id?.toLowerCase();
  };

  const roleName = getRoleName();

  // Render dashboard based on user role
  const renderDashboard = () => {
    switch (roleName) {
      case "admin":
      case "manager":
        return <AdminManagerDashboard />;
      case "staff":
        return <StaffDashboard />;
      case "client":
        return <ClientDashboard />;
      default:
        // Fallback to admin dashboard or show a message
        return (
          <div style={styles.container}>
            <div style={styles.noAccessCard}>
              <h2>Welcome to Dashboard</h2>
              <p>
                Your role ({roleName || "unknown"}) doesn't have a specific
                dashboard configured.
              </p>
              <p>Please contact administrator for access.</p>
            </div>
          </div>
        );
    }
  };

  return renderDashboard();
}

const styles = {
  container: { padding: "0" },
  statsRow: {
    display: "flex",
    gap: "20px",
    marginBottom: "20px",
    flexWrap: "wrap",
  },
  statsLeft: { flex: "1", minWidth: "300px" },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "15px",
  },
  statCard: {
    backgroundColor: "#fff",
    borderRadius: "12px",
    padding: "20px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
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
  },
  statTitle: { fontSize: "13px", color: "#6b7280", marginBottom: "5px" },
  statCount: { fontSize: "28px", fontWeight: "700", color: "#111827" },
  statCardFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderTop: "1px solid #f3f4f6",
    paddingTop: "12px",
  },
  statusBadge: { fontSize: "12px", color: "#22c55e", fontWeight: "500" },
  viewMoreLink: { fontSize: "12px", color: "#6b7280", textDecoration: "none" },
  chartCard: {
    flex: "1.2",
    backgroundColor: "#fff",
    borderRadius: "12px",
    padding: "20px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    minWidth: "400px",
  },
  chartHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "15px",
  },
  chartTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#111827",
    margin: 0,
  },
  chartFilters: { display: "flex", gap: "5px" },
  filterBtn: {
    padding: "6px 12px",
    fontSize: "12px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#e5e7eb",
    borderRadius: "6px",
    backgroundColor: "#fff",
    cursor: "pointer",
    color: "#6b7280",
  },
  filterBtnActive: {
    backgroundColor: "#f97316",
    color: "#fff",
    borderColor: "#f97316",
  },
  chartContainer: { width: "100%", height: "200px" },
  tableCard: {
    backgroundColor: "#fff",
    borderRadius: "12px",
    padding: "20px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  },
  tableHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },
  tableTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#111827",
    margin: 0,
  },
  viewAllBtn: {
    padding: "8px 16px",
    fontSize: "12px",
    border: "1px solid #f97316",
    borderRadius: "6px",
    backgroundColor: "#fff",
    color: "#f97316",
    textDecoration: "none",
    fontWeight: "500",
  },
  tableWrapper: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "13px" },
  th: {
    textAlign: "left",
    padding: "12px 10px",
    color: "#6b7280",
    fontWeight: "600",
    borderBottom: "1px solid #f3f4f6",
    whiteSpace: "nowrap",
  },
  tr: { borderBottom: "1px solid #f3f4f6" },
  td: { padding: "14px 10px", color: "#374151", whiteSpace: "nowrap" },
  tdCenter: { padding: "30px", textAlign: "center", color: "#9ca3af" },
  viewLink: {
    color: "#111827",
    textDecoration: "none",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontWeight: "500",
    cursor: "pointer",
  },
  viewIcon: { color: "#22c55e", fontSize: "10px", cursor: "pointer" },
  pagination: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: "15px",
  },
  paginationInfo: { fontSize: "13px", color: "#6b7280" },
  paginationBtns: { display: "flex", gap: "5px" },
  pageBtn: {
    width: "32px",
    height: "32px",
    border: "1px solid #e5e7eb",
    borderRadius: "6px",
    backgroundColor: "#fff",
    cursor: "pointer",
    fontSize: "13px",
    color: "#374151",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  pageBtnActive: {
    backgroundColor: "#f97316",
    color: "#fff",
    borderColor: "#f97316",
  },
  noAccessCard: {
    backgroundColor: "#fff",
    borderRadius: "12px",
    padding: "40px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    textAlign: "center",
  },
};

export default Index;
