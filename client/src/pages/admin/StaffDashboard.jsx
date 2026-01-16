import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Eye, ChevronRight, X, Download } from "lucide-react";
import { toast } from "react-toastify";

// Icons
const MyWorkIcon = () => (
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

const DeadlineIcon = () => (
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

// Stat Card Component
const StatCard = ({ icon, title, count, status = "Active", link = "#" }) => (
  <div style={styles.statCard}>
    <div style={styles.statCardContent}>
      <div style={styles.iconWrapper}>{icon}</div>
      <div style={styles.statInfo}>
        <span style={styles.statTitle}>{title}</span>
        <span style={styles.statCount}>{count}</span>
      </div>
    </div>
    {/* <div style={styles.statCardFooter}>
      <span style={styles.statusBadge}>{status}</span>
      <Link to={link} style={styles.viewMoreLink}>
        View More
      </Link>
    </div> */}
  </div>
);

// Quick Action Card Component
const QuickActionCard = ({
  title,
  subtitle,
  link = "#",
  color = "#f97316",
}) => (
  <Link to={link} style={{ ...styles.quickActionCard, borderTopColor: color }}>
    <div>
      <h4 style={{ ...styles.quickActionTitle, color }}>{title}</h4>
      <span style={styles.quickActionSubtitle}>{subtitle}</span>
    </div>
    <ChevronRight size={20} color={color} />
  </Link>
);

// Filter Button Component
const FilterButton = ({ label, active, onClick }) => (
  <button
    type="button"
    className={`filter-btn ${active ? "active" : ""}`}
    onClick={onClick}
    style={{
      ...styles.filterBtn,
      ...(active ? styles.filterBtnActive : {}),
    }}
  >
    {label}
  </button>
);

// Task Detail Modal Component
const TaskDetailModal = ({ task, onClose, onDownload }) => {
  if (!task) return null;

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

  const getStatusStyle = (status) => {
    switch (status) {
      case "Completed":
        return { backgroundColor: "#dcfce7", color: "#16a34a" };
      case "Pending":
        return { backgroundColor: "#fef3c7", color: "#d97706" };
      case "In Progress":
        return { backgroundColor: "#dbeafe", color: "#2563eb" };
      default:
        return { backgroundColor: "#f3f4f6", color: "#6b7280" };
    }
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>Task Details</h2>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={styles.modalBody}>
          {/* Status Badge */}
          <div style={styles.modalStatusRow}>
            <span
              style={{
                ...styles.modalStatusBadge,
                ...getStatusStyle(task.status || task.task_status),
              }}
            >
              {task.status || task.task_status || "Pending"}
            </span>
          </div>

          {/* Details Grid */}
          <div style={styles.detailsGrid}>
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>anovIP Reference</span>
              <span style={styles.detailValue}>
                {task.anovip_reference || task.docket_no || "--"}
              </span>
            </div>
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Client</span>
              <span style={styles.detailValue}>
                {task.client || task.client_name || "--"}
              </span>
            </div>
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Work Type</span>
              <span style={styles.detailValue}>
                {task.worktype || task.work_type || "--"}
              </span>
            </div>
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Territory Manager</span>
              <span style={styles.detailValue}>
                {task.tm || task.territory_manager?.name || "--"}
              </span>
            </div>
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Created Date</span>
              <span style={styles.detailValue}>
                {formatDate(task.date || task.createdAt)}
              </span>
            </div>
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Internal Deadline</span>
              <span style={styles.detailValue}>
                {formatDate(task.deadline || task.internal_deadline)}
              </span>
            </div>
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Country</span>
              <span style={styles.detailValue}>{task.country || "--"}</span>
            </div>
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Application Type</span>
              <span style={styles.detailValue}>
                {task.application_type || "--"}
              </span>
            </div>
          </div>

          {/* Assignment Section */}
          <div style={styles.sectionTitle}>Assignment Details</div>
          <div style={styles.detailsGrid}>
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Prepared By</span>
              <span style={styles.detailValue}>
                {task.prepared ||
                  task.prepared_by_name ||
                  task.prepared_by?.name ||
                  "--"}
              </span>
            </div>
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Review By</span>
              <span style={styles.detailValue}>
                {task.review ||
                  task.review_by_name ||
                  task.review_by?.name ||
                  "--"}
              </span>
            </div>
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Final Review By</span>
              <span style={styles.detailValue}>
                {task.final_review ||
                  task.final_review_by_name ||
                  task.final_review_by?.name ||
                  "--"}
              </span>
            </div>
          </div>

          {/* Title/Description Section */}
          {(task.title || task.description) && (
            <>
              <div style={styles.sectionTitle}>Description</div>
              <div style={styles.descriptionBox}>
                {task.title && <p style={styles.taskTitle}>{task.title}</p>}
                {task.description && (
                  <p style={styles.taskDescription}>{task.description}</p>
                )}
              </div>
            </>
          )}

          {/* Document Section */}
          {/* Document Section - Updated for S3 files */}
          {task.files && task.files.length > 0 && (
            <>
              <div style={styles.sectionTitle}>Attached Documents</div>
              <div style={styles.filesContainer}>
                {task.files.map((file, idx) => (
                  <div key={idx} style={styles.documentBox}>
                    <span style={styles.documentName}>
                      {file.filename || "Document"}
                    </span>
                    <button
                      onClick={() => onDownload(file.key, file.filename)}
                      style={styles.downloadLink}
                    >
                      <Download size={14} /> Download
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div style={styles.modalFooter}>
          <button style={styles.closeModalBtn} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Staff Dashboard Component
export default function StaffDashboard() {
  const [stats, setStats] = useState({
    myWork: 0,
    deadlines: 0,
    application: 0,
  });
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [activeFilter, setActiveFilter] = useState("All");
  const [selectedTask, setSelectedTask] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const recordsPerPage = 10;

  // Fetch Stats
  const fetchStats = async () => {
    try {
      const res = await axios.get(`/api/tasks/staff/stats`);
      setStats(res.data);
    } catch (err) {
      if (!import.meta.env.PROD) console.error("Error fetching stats", err);
      setStats({ myWork: 0, deadlines: 0, application: 0 });
    }
  };

  // Fetch Tasks
  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", currentPage);
      params.append("limit", recordsPerPage);
      params.append("filter", activeFilter.toLowerCase());
      const res = await axios.get(
        `/api/tasks/staff/tasks?${params.toString()}`
      );
      const tasksData = res.data.tasks || res.data || [];
      setTasks(tasksData);
      const total = res.data.total || res.data.totalRecords || tasksData.length;
      setTotalRecords(total);
    } catch (err) {
      if (!import.meta.env.PROD) console.error("Error fetching tasks", err);
      setTasks([]);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  };

  // Add after fetchTasks function
  const handleDownloadFile = async (fileKey, filename) => {
    try {
      const res = await axios.get(
        `/api/tasks/download-url?fileKey=${encodeURIComponent(fileKey)}`
      );
      const link = document.createElement("a");
      link.href = res.data.downloadUrl;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error("File not found");
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);
  useEffect(() => {
    fetchTasks();
  }, [currentPage, activeFilter]);

  const handleViewTask = (task) => {
    setSelectedTask(task);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedTask(null);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "--";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "--";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
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
      {/* Task Detail Modal */}
      {showModal && (
        <TaskDetailModal
          task={selectedTask}
          onClose={handleCloseModal}
          onDownload={handleDownloadFile}
        />
      )}

      {/* Top Row - Stats and Quick Actions */}
      <div style={styles.topRow}>
        <div style={styles.statsGrid}>
          <StatCard
            icon={<MyWorkIcon />}
            title="My Work"
            count={stats.myWork}
            link="/my-work"
          />
          <StatCard
            icon={<DeadlineIcon />}
            title="Upcoming Deadlines (Next 7 Days)"
            count={stats.deadlines}
            link="/deadline"
          />
          <StatCard
            icon={<DeadlineIcon />}
            title="Application"
            count={stats.application}
            link="/application"
          />
        </div>
        <div style={styles.quickActionsGrid}>
          <QuickActionCard
            title="Prior Art Search"
            subtitle="Search Now"
            link="/prior-art-search"
            color="#f97316"
          />
          <QuickActionCard
            title="Drafting"
            subtitle="Draft Now"
            link="/drafting"
            color="#f97316"
          />
          <QuickActionCard
            title="Form Generation"
            subtitle="Generate Form"
            link="/application"
            color="#f97316"
          />
        </div>
      </div>

      {/* Prepare Task Table */}
      <div style={styles.tableCard}>
        <div style={styles.tableHeader}>
          <div style={styles.tableHeaderLeft}>
            <h3 style={styles.tableTitle}>My Tasks</h3>
            <div className="filter-group" style={styles.filterGroup}>
              {["All", "Prepare", "Review", "Final Review"].map((filter) => (
                <FilterButton
                  key={filter}
                  label={filter}
                  active={activeFilter === filter}
                  onClick={() => {
                    setActiveFilter(filter);
                    setCurrentPage(1);
                  }}
                />
              ))}
            </div>
          </div>
          {/* <div style={styles.tableHeaderRight}>
            <button style={styles.downloadBtn}>Download Document</button>
            <Link to="/task" style={styles.viewAllBtn}>
              View All
            </Link>
          </div> */}
        </div>

        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Sr no.</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>TM</th>
                <th style={styles.th}>anovIP Reference</th>
                <th style={styles.th}>Client</th>
                <th style={styles.th}>Worktype</th>
                <th style={styles.th}>Deadline</th>
                <th style={styles.th}>Prepared</th>
                <th style={styles.th}>Review</th>
                <th style={styles.th}>Final Review</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="12" style={styles.tdCenter}>
                    Loading...
                  </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan="12" style={styles.tdCenter}>
                    No data
                  </td>
                </tr>
              ) : (
                tasks.map((task, index) => (
                  <tr key={task._id || index} style={styles.tr}>
                    <td style={styles.td}>
                      {(currentPage - 1) * recordsPerPage + index + 1}
                    </td>
                    <td style={styles.td}>
                      {formatDate(task.date || task.createdAt)}
                    </td>
                    <td style={styles.td}>{task.tm || "--"}</td>
                    <td style={styles.td}>
                      {task.anovip_reference || task.docket_no || "--"}
                    </td>
                    <td style={styles.td}>
                      {task.client || task.client_name || "--"}
                    </td>
                    <td style={styles.td}>
                      {task.worktype || task.work_type || "--"}
                    </td>
                    <td style={styles.td}>
                      {formatDate(task.deadline || task.internal_deadline)}
                    </td>
                    <td style={styles.td}>
                      {task.prepared || task.prepared_by_name || "--"}
                    </td>
                    <td style={styles.td}>
                      {task.review || task.review_by_name || "--"}
                    </td>
                    <td style={styles.td}>
                      {task.final_review || task.final_review_by_name || "--"}
                    </td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.statusPill,
                          backgroundColor:
                            task.status === "Completed" ||
                            task.task_status === "Completed"
                              ? "#dcfce7"
                              : task.status === "Pending" ||
                                task.task_status === "Pending"
                              ? "#fef3c7"
                              : task.status === "In Progress" ||
                                task.task_status === "In Progress"
                              ? "#dbeafe"
                              : "#f3f4f6",
                          color:
                            task.status === "Completed" ||
                            task.task_status === "Completed"
                              ? "#16a34a"
                              : task.status === "Pending" ||
                                task.task_status === "Pending"
                              ? "#d97706"
                              : task.status === "In Progress" ||
                                task.task_status === "In Progress"
                              ? "#2563eb"
                              : "#6b7280",
                        }}
                      >
                        {task.status || task.task_status || "--"}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span
                        style={styles.viewLink}
                        onClick={() => handleViewTask(task)}
                      >
                        View <Eye size={14} color="#22c55e" />
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={styles.pagination}>
          <span style={styles.paginationInfo}>
            Showing{" "}
            <strong>
              {totalRecords > 0 ? (currentPage - 1) * recordsPerPage + 1 : 0}
            </strong>{" "}
            of <strong>{totalRecords}</strong> orders
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

const styles = {
  container: { padding: "0" },
  topRow: {
    display: "flex",
    gap: "20px",
    marginBottom: "20px",
    flexWrap: "wrap",
  },
  statsGrid: { display: "flex", gap: "15px", flex: "0 0 auto" },
  statCard: {
    backgroundColor: "#fff",
    borderRadius: "12px",
    padding: "20px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    minWidth: "280px",
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
  quickActionsGrid: {
    display: "flex",
    gap: "15px",
    flex: "1",
    minWidth: "300px",
  },
  quickActionCard: {
    flex: "1",
    backgroundColor: "#fffbf5",
    borderRadius: "12px",
    padding: "20px",
    borderTop: "3px solid #f97316",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    textDecoration: "none",
    transition: "box-shadow 0.2s",
    cursor: "pointer",
  },
  quickActionTitle: {
    fontSize: "15px",
    fontWeight: "600",
    margin: "0 0 5px 0",
  },
  quickActionSubtitle: { fontSize: "12px", color: "#6b7280" },
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
    flexWrap: "wrap",
    gap: "15px",
  },
  tableHeaderLeft: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
    flexWrap: "wrap",
  },
  tableHeaderRight: { display: "flex", gap: "10px" },
  tableTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#111827",
    margin: 0,
  },
  filterGroup: { display: "flex", gap: "8px" },
  filterBtn: {
    padding: "8px 16px",
    fontSize: "12px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#fddcab",
    borderRadius: "20px",
    backgroundColor: "#fff",
    cursor: "pointer",
    color: "#f97316",
    fontWeight: "500",
    transition: "all 0.2s",
  },
  filterBtnActive: { backgroundColor: "#fff7ed", borderColor: "#f97316" },
  downloadBtn: {
    padding: "8px 16px",
    fontSize: "12px",
    border: "1px solid #fddcab",
    borderRadius: "6px",
    backgroundColor: "#fff",
    color: "#f97316",
    cursor: "pointer",
    fontWeight: "500",
  },
  viewAllBtn: {
    padding: "8px 16px",
    fontSize: "12px",
    border: "1px solid #e5e7eb",
    borderRadius: "6px",
    backgroundColor: "#fff",
    color: "#6b7280",
    textDecoration: "none",
    fontWeight: "500",
  },
  tableWrapper: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "13px" },
  th: {
    textAlign: "left",
    padding: "12px 10px",
    color: "#f97316",
    fontWeight: "600",
    borderBottom: "1px solid #f3f4f6",
    whiteSpace: "nowrap",
  },
  tr: { borderBottom: "1px solid #f3f4f6" },
  td: { padding: "14px 10px", color: "#374151", whiteSpace: "nowrap" },
  tdCenter: { padding: "40px", textAlign: "center", color: "#9ca3af" },
  statusPill: {
    padding: "4px 10px",
    borderRadius: "12px",
    fontSize: "11px",
    fontWeight: "500",
  },
  viewLink: {
    color: "#111827",
    textDecoration: "none",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontWeight: "500",
    cursor: "pointer",
  },
  pagination: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "20px",
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
  // Modal Styles
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "20px",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: "16px",
    width: "100%",
    maxWidth: "700px",
    maxHeight: "90vh",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 24px",
    borderBottom: "1px solid #f3f4f6",
  },
  modalTitle: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#111827",
    margin: 0,
  },
  closeBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#6b7280",
    padding: "4px",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  modalBody: { padding: "24px", overflowY: "auto", flex: 1 },
  modalStatusRow: { marginBottom: "20px" },
  modalStatusBadge: {
    padding: "6px 16px",
    borderRadius: "20px",
    fontSize: "13px",
    fontWeight: "500",
  },
  detailsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "16px",
    marginBottom: "24px",
  },
  detailItem: { display: "flex", flexDirection: "column", gap: "4px" },
  detailLabel: { fontSize: "12px", color: "#6b7280", fontWeight: "500" },
  detailValue: { fontSize: "14px", color: "#111827", fontWeight: "500" },
  sectionTitle: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#f97316",
    marginBottom: "12px",
    paddingTop: "8px",
    borderTop: "1px solid #f3f4f6",
  },
  descriptionBox: {
    backgroundColor: "#f9fafb",
    borderRadius: "8px",
    padding: "16px",
    marginBottom: "24px",
  },
  taskTitle: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#111827",
    margin: "0 0 8px 0",
  },
  taskDescription: {
    fontSize: "13px",
    color: "#374151",
    margin: 0,
    lineHeight: "1.5",
  },
  documentBox: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderRadius: "8px",
    padding: "12px 16px",
  },
  documentName: { fontSize: "13px", color: "#374151" },
  downloadLink: {
    fontSize: "13px",
    color: "#f97316",
    fontWeight: "500",
    textDecoration: "none",
  },
  modalFooter: {
    padding: "16px 24px",
    borderTop: "1px solid #f3f4f6",
    display: "flex",
    justifyContent: "flex-end",
  },
  closeModalBtn: {
    padding: "10px 24px",
    fontSize: "14px",
    border: "none",
    borderRadius: "8px",
    backgroundColor: "#f97316",
    color: "#fff",
    cursor: "pointer",
    fontWeight: "500",
  },
  // Add to styles object
  filesContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginBottom: "24px",
  },
  downloadLink: {
    fontSize: "13px",
    color: "#f97316",
    fontWeight: "500",
    textDecoration: "none",
    background: "none",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
};
