import React, { useState, useEffect, useMemo } from "react"; // Added useMemo
import axios from "axios";
import { Link } from "react-router-dom";
import { Eye, Trash, Trash2, Paperclip, Download } from "lucide-react"; // Added Icons
import { toast } from "react-toastify";
import DeleteConfirmModal from "../components/DeleteConfirmModal";
import StatsRow from "../components/StatsRow";
import useAuthStore from "../store/authStore";
import * as XLSX from "xlsx";

// --- UPPY IMPORTS ---
import Uppy from "@uppy/core";
import AwsS3Multipart from "@uppy/aws-s3-multipart";
import { DashboardModal } from "@uppy/react";
import "@uppy/core/dist/style.min.css";
import "@uppy/dashboard/dist/style.min.css";

export default function Task() {
  const [tasks, setTasks] = useState([]);
  const { updateStats } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const recordsPerPage = 10;
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState(null);
  const [users, setUsers] = useState([]);
  const [docketSuggestions, setDocketSuggestions] = useState([]);
  const [showDocketSuggestions, setShowDocketSuggestions] = useState(false);
  const [filters, setFilters] = useState({
    start_date: "",
    end_date: "",
    docket_no: "",
    task_status: "",
    country: "",
  });

  const initialFormState = {
    docket_id: "",
    docket_no: "",
    work_type: "",
    task_status: "",
    territory_manager: "",
    prepared_by: "",
    review_by: "",
    final_review_by: "",
    country: "",
    remarks: "",
    client_ref_no: "",
    pct_application_no: "",
    instruction_date: "",
    internal_deadline: "",
    official_deadline: "",
    filling_date: "",
    filling_country: "",
    reporting_date: "",
    client_name: "",
    title: "",
    application_type: "",
    files: [],
  };
  const [formData, setFormData] = useState(initialFormState);

  const [selectedFile, setSelectedFile] = useState(null);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach((key) => {
        if (filters[key]) params.append(key, filters[key]);
      });
      params.append("page", currentPage);
      params.append("limit", recordsPerPage);
      const res = await axios.get(`/api/tasks?${params.toString()}`);
      setTasks(res.data.tasks || []);
      setTotalRecords(res.data.total || 0);
    } catch (err) {
      if (!import.meta.env.PROD) console.error("Error fetching tasks", err);
      toast.error(
        err?.response?.data?.message || "Something occurred. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`/api/rbac/users`);
      setUsers(res.data.users || res.data || []);
    } catch (err) {
      if (!import.meta.env.PROD) console.error("Error fetching users", err);
      toast.error(
        err?.response?.data?.message || "Something occurred. Please try again."
      );
    }
  };

  const searchDockets = async (query) => {
    if (!query || query.length < 1) {
      setDocketSuggestions([]);
      setShowDocketSuggestions(false);
      return;
    }
    try {
      const res = await axios.get(`/api/applications/lookup-docket/${query}`);
      const results = res.data.dockets || res.data || [];

      setDocketSuggestions(results);
      // Always show the box if the user has typed 2+ characters
      setShowDocketSuggestions(true);
    } catch (err) {
      if (!import.meta.env.PROD) console.error("Error searching dockets", err);
      setDocketSuggestions([]);
      setShowDocketSuggestions(false); // Hide on error
    }
  };

  // --- UPPY STATE ---
  const [isUppyModalOpen, setIsUppyModalOpen] = useState(false);
  const [newlyUploadedFiles, setNewlyUploadedFiles] = useState([]);

  // --- INITIALIZE UPPY ---
  const uppy = useMemo(() => {
    const uppyInstance = new Uppy({
      id: "task-uploader",
      autoProceed: false,
      restrictions: {
        maxNumberOfFiles: 100,
        maxTotalFileSize: 5 * 1024 * 1024 * 1024, // 5 GB,
      },
    });

    uppyInstance.use(AwsS3Multipart, {
      limit: 4,
      async createMultipartUpload(file) {
        const res = await axios.post("/api/tasks/s3/multipart/start", {
          filename: file.name,
          contentType: file.type,
        });
        file.meta.key = res.data.key;
        return { uploadId: res.data.uploadId, key: res.data.key };
      },
      async signPart(file, { uploadId, key, partNumber }) {
        const res = await axios.post("/api/tasks/s3/multipart/sign-part", {
          uploadId,
          key,
          partNumber,
        });
        return { url: res.data.url };
      },
      async completeMultipartUpload(file, { uploadId, key, parts }) {
        const res = await axios.post("/api/tasks/s3/multipart/complete", {
          uploadId,
          key,
          parts,
        });
        return { location: res.data.location };
      },
      async abortMultipartUpload(file, { uploadId, key }) {
        await axios.post("/api/tasks/s3/multipart/abort", { uploadId, key });
      },
      async getUploadParameters(file) {
        const res = await axios.post("/api/tasks/s3/presigned-url", {
          filename: file.name,
          contentType: file.type || "application/octet-stream",
        });
        file.meta.key = res.data.key;
        return {
          method: "PUT",
          url: res.data.uploadUrl,
          headers: { "Content-Type": file.type },
        };
      },
    });

    return uppyInstance;
  }, []);

  // Handle Uppy Complete
  useEffect(() => {
    const handleComplete = (result) => {
      if (result.successful.length > 0) {
        const files = result.successful.map((f) => ({
          key: f.meta.key,
          filename: f.name,
          fileType: f.type,
          fileSize: f.size,
        }));
        setNewlyUploadedFiles((prev) => [...prev, ...files]);
        toast.success("Files uploaded!");
        setIsUppyModalOpen(false);
        uppy.cancelAll();
      }
    };
    uppy.on("complete", handleComplete);
    return () => uppy.off("complete", handleComplete);
  }, [uppy]);

  // --- FILE HANDLERS ---
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

  const handleDeleteFile = async (taskId, fileKey) => {
    if (!window.confirm("Delete file?")) return;
    try {
      const res = await axios.delete(
        `/api/tasks/${taskId}/file/${encodeURIComponent(fileKey)}`
      );
      // Update local state
      setFormData((prev) => ({ ...prev, files: res.data.data.files })); // Assuming API returns updated task
      toast.success("File deleted");
    } catch (err) {
      toast.error("Failed to delete");
    }
  };

  const renderFileList = (files, allowDelete = false) => {
    if (!files || files.length === 0) return null;
    return (
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "10px",
          marginTop: "5px",
        }}
      >
        {files.map((file, idx) => (
          <div
            key={idx}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              padding: "6px 10px",
              backgroundColor: "#f9fafb",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "12px",
            }}
          >
            <span style={{ fontWeight: 500 }}>{file.filename}</span>
            <button
              type="button"
              onClick={() => handleDownloadFile(file.key, file.filename)}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "#2563eb",
                padding: 0,
              }}
            >
              <Download size={14} />
            </button>
            {allowDelete && formData._id && (
              <button
                type="button"
                onClick={() => handleDeleteFile(formData._id, file.key)}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  color: "#ef4444",
                  padding: 0,
                }}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
    );
  };

  useEffect(() => {
    fetchTasks();
    // fetchStats();
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [filters, currentPage]);

  useEffect(() => {
    const timer = setTimeout(() => {
      // Show suggestions only if text is typed AND no docket is currently "selected" (locked in)
      if (formData.docket_no && !formData.docket_id) {
        searchDockets(formData.docket_no);
      } else {
        // Automatically hide suggestions if a docket_id is present or input is empty
        setShowDocketSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [formData.docket_no, formData.docket_id]); // Removed formData._id dependency

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === "docket_no") {
      setFormData({
        ...formData,
        [name]: value,
        docket_id: "", // Reset ID so searching can happen again
      });

      // If user clears the input, hide suggestions immediately
      if (value.length === 0) {
        setShowDocketSuggestions(false);
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({ ...filters, [name]: value });
    setCurrentPage(1);
  };

  const selectDocket = (docket) => {
    setFormData({
      ...formData,
      docket_id: docket._id,
      docket_no: docket.docket_no,
      client_ref_no: docket.client_ref || "",
      client_name: docket.firm_name || "",
      pct_application_no: docket.application_no || "",
      country: docket.filling_country || "",
      filling_country: docket.filling_country || "",
      title: docket.title || "",
      application_type: docket.application_type || "",
      instruction_date: docket.instruction_date
        ? docket.instruction_date.split("T")[0]
        : "",
      filling_date: docket.filling_date
        ? docket.filling_date.split("T")[0]
        : "",
    });
    setShowDocketSuggestions(false);
    setDocketSuggestions([]);
  };

  const handleFileChange = (e) => setSelectedFile(e.target.files[0]);

  const getUserName = (field) => {
    if (!field) return "";
    // If field is already an object with name
    if (typeof field === "object" && field.name) return field.name;
    if (typeof field === "object" && field.email) return field.email;
    // If field is just an ID string, find user
    const user = users.find((u) => u._id === field);
    return user ? user.name || user.email : "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // JSON Payload
    const payload = { ...formData };

    if (!formData.docket_id) {
      return toast.error("Please select a valid docket from the list.");
    }

    try {
      if (formData._id) {
        // UPDATE
        await axios.put(`/api/tasks/${formData._id}`, {
          ...payload,
          newFiles: newlyUploadedFiles,
        });
        toast.success("Task updated successfully");
      } else {
        // CREATE
        payload.files = newlyUploadedFiles;
        await axios.post(`/api/tasks`, payload);
        setTotalRecords((prev) => prev + 1);
        updateStats("tasks", 1);
        toast.success("Task created successfully");
      }

      // Refresh list & close
      fetchTasks();
      setShowModal(false);
      setFormData(initialFormState);
      setNewlyUploadedFiles([]);
    } catch (err) {
      toast.error(`${err?.response?.data?.message || err.message}`);
    }
  };

  const handleDelete = (id) => {
    setDeleteTaskId(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(`/api/tasks/${deleteTaskId}`);
      setTasks((prev) => prev.filter((t) => t._id !== deleteTaskId));
      setTotalRecords((prev) => prev - 1);
      updateStats("tasks", -1);
      toast.success("Task deleted successfully");
    } catch (err) {
      if (!import.meta.env.PROD) console.error("Delete failed", err);
      toast.error(
        err?.response?.data?.message || "Something occurred. Please try again."
      );
    } finally {
      setShowDeleteModal(false);
      setDeleteTaskId(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "--";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "--";
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // AFTER (fixed)
  const totalPages = Math.ceil(totalRecords / recordsPerPage) || 1;
  const canGoNext = currentPage < totalPages;
  const canGoPrev = currentPage > 1;

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 3) {
      // Show all pages if 3 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show pages around current page
      let startPage = Math.max(1, currentPage - 1);
      let endPage = Math.min(totalPages, startPage + 2);

      // Adjust start if we're near the end
      if (endPage - startPage < 2) {
        startPage = Math.max(1, endPage - 2);
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }
    return pages;
  };

  // Helper to extract ID from object or string
  const extractId = (field) => {
    if (!field) return "";
    if (typeof field === "object" && field._id) return field._id;
    return field;
  };

  const openEditModal = (task) => {
    setFormData({
      _id: task._id,
      docket_id: task.docket_id || "",
      docket_no: task.docket_no || "",
      work_type: task.work_type || "",
      task_status: task.task_status || "",
      territory_manager: extractId(task.territory_manager),
      prepared_by: extractId(task.prepared_by),
      review_by: extractId(task.review_by),
      final_review_by: extractId(task.final_review_by),
      country: task.country || "",
      remarks: task.remarks || "",
      client_ref_no: task.client_ref_no || "",
      pct_application_no: task.pct_application_no || "",
      client_name: task.client_name || "",
      title: task.title || "",
      application_type: task.application_type || "",
      filling_country: task.filling_country || "",
      instruction_date: task.instruction_date
        ? task.instruction_date.split("T")[0]
        : "",
      internal_deadline: task.internal_deadline
        ? task.internal_deadline.split("T")[0]
        : "",
      official_deadline: task.official_deadline
        ? task.official_deadline.split("T")[0]
        : "",
      filling_date: task.filling_date ? task.filling_date.split("T")[0] : "",
      reporting_date: task.reporting_date
        ? task.reporting_date.split("T")[0]
        : "",
      files: task.files || [],
    });
    setNewlyUploadedFiles([]);
    setShowModal(true);
  };

  const handleExport = () => {
    if (tasks.length === 0) {
      toast.error("No data to export");
      return;
    }

    // Map the tasks to a format suitable for Excel (matching your table headers)
    const exportData = tasks.map((task, index) => ({
      "Sr No": (currentPage - 1) * recordsPerPage + index + 1,
      Date: formatDate(task.createdAt || task.instruction_date),
      "anovIP Reference": task.docket_no || "",
      Client: task.client_ref_no || task.client_name || "",
      "Work Type": task.work_type || task.application_type || "",
      "Prepared By":
        task.prepared_by_name || getUserName(task.prepared_by) || "--",
      "Review By": task.review_by_name || getUserName(task.review_by) || "--",
      "Final Review By":
        task.final_review_by_name || getUserName(task.final_review_by) || "--",
      Country: task.country || "--",
      Remarks: task.remarks || "",
    }));

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // Create workbook and add the worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tasks");

    // Fix column widths (optional but looks better)
    const maxWidth = 20;
    worksheet["!cols"] = Object.keys(exportData[0]).map(() => ({
      wch: maxWidth,
    }));

    // Generate Excel file and trigger download
    const fileName = `Tasks_Export_${
      new Date().toISOString().split("T")[0]
    }.xlsx`;
    XLSX.writeFile(workbook, fileName);

    toast.success("Excel file downloaded successfully");
  };

  return (
    <div style={styles.container}>
      <StatsRow />

      <div style={styles.tableCard}>
        <div style={styles.tableHeaderRow}>
          <h3 style={styles.tableTitle}>Task</h3>
          <div style={styles.filtersRow}>
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Start Date</label>
              <input
                type="date"
                name="start_date"
                style={styles.filterInput}
                value={filters.start_date}
                onChange={handleFilterChange}
              />
            </div>
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>End Date</label>
              <input
                type="date"
                name="end_date"
                style={styles.filterInput}
                value={filters.end_date}
                onChange={handleFilterChange}
              />
            </div>
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Docket No.</label>
              <input
                type="text"
                name="docket_no"
                style={styles.filterInput}
                value={filters.docket_no}
                onChange={handleFilterChange}
              />
            </div>
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Task Status</label>
              <select
                name="task_status"
                style={styles.filterInput}
                value={filters.task_status}
                onChange={handleFilterChange}
              >
                <option value="">All Status</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="On Hold">On Hold</option>
              </select>
            </div>
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Country</label>
              <input
                type="text"
                name="country"
                style={styles.filterInput}
                value={filters.country}
                onChange={handleFilterChange}
              />
            </div>
            <button
              style={styles.createBtn}
              onClick={() => {
                setFormData(initialFormState);
                setShowModal(true);
              }}
            >
              Create New
            </button>
            <button style={styles.exportBtn} onClick={handleExport}>
              Export
            </button>
          </div>
        </div>
        <DeleteConfirmModal
          show={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={confirmDelete}
          message="Are you sure you want to delete this task?"
        />

        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Sr no.</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>anovIP Reference</th>
                <th style={styles.th}>Client</th>
                <th style={styles.th}>Worktype</th>
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
                  <td colSpan="9" style={styles.tdCenter}>
                    Loading...
                  </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan="9" style={styles.tdCenter}>
                    No records found
                  </td>
                </tr>
              ) : (
                tasks.map((task, index) => (
                  <tr key={task._id} style={styles.tr}>
                    <td style={styles.td}>
                      {(currentPage - 1) * recordsPerPage + index + 1}
                    </td>
                    <td style={styles.td}>
                      {formatDate(task.createdAt || task.instruction_date)}
                    </td>
                    <td style={styles.td}>{task.docket_no}</td>
                    <td style={styles.td}>
                      {task.client_ref_no || task.client_name}
                    </td>
                    <td style={styles.td}>
                      {task.work_type || task.application_type}
                    </td>
                    <td style={styles.td}>
                      {task.prepared_by_name ||
                        getUserName(task.prepared_by) ||
                        "--"}
                    </td>
                    <td style={styles.td}>
                      {task.review_by_name ||
                        getUserName(task.review_by) ||
                        "--"}
                    </td>
                    <td style={styles.td}>
                      {task.final_review_by_name ||
                        getUserName(task.final_review_by) ||
                        "--"}
                    </td>
                    <td style={styles.td}>
                      <span
                        style={{
                          padding: "4px 10px",
                          borderRadius: "12px",
                          fontSize: "11px",
                          fontWeight: "600",
                          backgroundColor:
                            task.task_status === "Completed"
                              ? "#d1fae5" // Green bg
                              : task.task_status === "In Progress"
                              ? "#dbeafe" // Blue bg
                              : task.task_status === "On Hold"
                              ? "#fee2e2" // Red bg
                              : "#f3f4f6", // Grey bg (Pending)
                          color:
                            task.task_status === "Completed"
                              ? "#065f46" // Green text
                              : task.task_status === "In Progress"
                              ? "#1e40af" // Blue text
                              : task.task_status === "On Hold"
                              ? "#991b1b" // Red text
                              : "#374151", // Grey text
                        }}
                      >
                        {task.task_status || "Pending"}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span onClick={() => openEditModal(task)}>
                        View{" "}
                        <span style={styles.viewIcon}>
                          <Eye style={{ scale: "0.7" }} />
                        </span>
                      </span>
                      &nbsp;&nbsp;
                      <span onClick={() => handleDelete(task._id)}>
                        Delete
                        <span style={{ color: "red" }}>
                          <Trash style={{ scale: "0.7" }} />
                        </span>
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

      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h5 style={styles.modalTitle}>
                {formData._id ? "Edit Task" : "Create Task"}
              </h5>
              <button
                style={styles.modalCloseBtn}
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>
            <form style={styles.modalBody} onSubmit={handleSubmit}>
              <div style={styles.formColumns}>
                <div style={styles.formColumn}>
                  <h6 style={styles.sectionTitle}>Basic</h6>
                  <div style={styles.formGrid}>
                    <div style={{ ...styles.formGroup, position: "relative" }}>
                      <label style={styles.formLabel}>Docket</label>

                      <input
                        type="text"
                        name="docket_no"
                        style={styles.formInput}
                        placeholder="Docket no."
                        value={formData.docket_no}
                        onChange={(e) => {
                          const { value } = e.target;
                          setFormData({
                            ...formData,
                            docket_no: value,
                            docket_id: "",
                          });
                        }}
                        onFocus={() => {
                          if (formData.docket_no && !formData.docket_id) {
                            setShowDocketSuggestions(true);
                          }
                        }}
                        autoComplete="off"
                        required
                      />
                      {showDocketSuggestions && (
                        <div style={styles.suggestionBox}>
                          {docketSuggestions.length > 0 ? (
                            // If matches exist, show them
                            docketSuggestions.map((d, i) => (
                              <div
                                key={i}
                                style={styles.suggestionItem}
                                onClick={() => selectDocket(d)}
                              >
                                <strong>{d.docket_no}</strong> -{" "}
                                {d.title || d.firm_name || "No title"}
                              </div>
                            ))
                          ) : (
                            // If no matches found, show this message
                            <div
                              style={{
                                ...styles.suggestionItem,
                                color: "#ef4444", // Red text for "not found"
                                textAlign: "center",
                                cursor: "default",
                              }}
                            >
                              No docket found matching "{formData.docket_no}"
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Work Type</label>
                      <select
                        name="work_type"
                        style={styles.formSelect}
                        value={formData.work_type}
                        onChange={handleInputChange}
                      >
                        <option value="">Select</option>
                        <option value="Ordinary">Ordinary</option>
                        <option value="Ordinary+F18">Ordinary+F18</option>
                        <option value="Provisional">Provisional</option>
                        <option value="Conventional">Conventional</option>
                        <option value="PCT-NP">PCT-NP</option>
                        <option value="Annuity Fee">Annuity Fee</option>
                        <option value="N/A">N/A</option>
                      </select>
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Task Status</label>
                      <select
                        name="task_status"
                        style={styles.formSelect}
                        value={formData.task_status}
                        onChange={handleInputChange}
                      >
                        <option value="">Select</option>
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="On Hold">On Hold</option>
                      </select>
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Territory Manager</label>
                      <select
                        name="territory_manager"
                        style={styles.formSelect}
                        value={formData.territory_manager}
                        onChange={handleInputChange}
                      >
                        <option value="">Select</option>
                        {users.map((u) => (
                          <option key={u._id} value={u._id}>
                            {u.name || u.email}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <h6 style={{ ...styles.sectionTitle, marginTop: "25px" }}>
                    Examinations
                  </h6>
                  <div style={styles.formGrid}>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Prepared By</label>
                      <select
                        name="prepared_by"
                        style={styles.formSelect}
                        value={formData.prepared_by}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">Select</option>
                        {users.map((u) => (
                          <option key={u._id} value={u._id}>
                            {u.name || u.email}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Review & Upload</label>
                      <select
                        name="review_by"
                        style={styles.formSelect}
                        value={formData.review_by}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">Select</option>
                        {users.map((u) => (
                          <option key={u._id} value={u._id}>
                            {u.name || u.email}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>
                        Final Review & Filled By
                      </label>
                      <select
                        name="final_review_by"
                        style={styles.formSelect}
                        value={formData.final_review_by}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">Select</option>
                        {users.map((u) => (
                          <option key={u._id} value={u._id}>
                            {u.name || u.email}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Country</label>
                      <input
                        type="text"
                        name="country"
                        style={styles.formInput}
                        placeholder="Country"
                        value={formData.country}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div style={{ ...styles.formGroup, gridColumn: "span 2" }}>
                      <label style={styles.formLabel}>Remarks</label>
                      <input
                        type="text"
                        name="remarks"
                        style={styles.formInput}
                        placeholder="Remarks"
                        value={formData.remarks}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </div>

                <div style={styles.formColumn}>
                  <h6 style={styles.sectionTitle}>Application Details</h6>
                  <div style={styles.formGrid}>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Client Ref. No.</label>
                      <input
                        type="text"
                        name="client_ref_no"
                        style={styles.formInput}
                        placeholder="Client Ref. No."
                        value={formData.client_ref_no}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>
                        PCT / Application No.
                      </label>
                      <input
                        type="text"
                        name="pct_application_no"
                        style={styles.formInput}
                        placeholder="PCT / Application No."
                        value={formData.pct_application_no}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <h6 style={{ ...styles.sectionTitle, marginTop: "25px" }}>
                    Application Dates
                  </h6>
                  <div style={styles.formGrid}>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Instruction Date</label>
                      <input
                        type="date"
                        name="instruction_date"
                        style={styles.formInput}
                        value={formData.instruction_date}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Internal Deadline</label>
                      <input
                        type="date"
                        name="internal_deadline"
                        style={styles.formInput}
                        value={formData.internal_deadline}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Official Deadline</label>
                      <input
                        type="date"
                        name="official_deadline"
                        style={styles.formInput}
                        value={formData.official_deadline}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Filling Date</label>
                      <input
                        type="date"
                        name="filling_date"
                        style={styles.formInput}
                        value={formData.filling_date}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Reporting Date</label>
                      <input
                        type="date"
                        name="reporting_date"
                        style={styles.formInput}
                        value={formData.reporting_date}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Filling Country</label>
                      <input
                        type="text"
                        name="filling_country"
                        style={styles.formInput}
                        placeholder="Filling Country"
                        value={formData.filling_country}
                        onChange={handleInputChange}
                      />
                    </div>
                    {/* REPLACED FILE INPUT SECTION */}
                    <div style={{ ...styles.formGroup, gridColumn: "span 2" }}>
                      <label style={styles.formLabel}>Task Documents</label>

                      {/* Existing Files */}
                      {formData.files && formData.files.length > 0 && (
                        <div style={{ marginBottom: "5px" }}>
                          <small style={{ color: "#666" }}>Existing:</small>
                          {renderFileList(formData.files, true)}
                        </div>
                      )}

                      {/* New Uploads */}
                      {newlyUploadedFiles.length > 0 && (
                        <div style={{ marginBottom: "5px" }}>
                          <small style={{ color: "green" }}>
                            Ready to save:
                          </small>
                          {renderFileList(newlyUploadedFiles, false)}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => setIsUppyModalOpen(true)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "8px 12px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                          backgroundColor: "#f3f4f6",
                          cursor: "pointer",
                          fontSize: "13px",
                          width: "fit-content",
                        }}
                      >
                        <Paperclip size={14} /> Attach Files
                      </button>
                    </div>
                  </div>
                  <button type="submit" style={styles.submitBtn}>
                    Submit
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPPY MODAL */}
      <DashboardModal
        uppy={uppy}
        open={isUppyModalOpen}
        onRequestClose={() => {
          uppy.cancelAll(); // ✅ Clears selected files and stops uploads on close
          setIsUppyModalOpen(false);
        }}
        closeModalOnClickOutside={false}
        theme="light"
      />
    </div> // End of main container
  );
}

const styles = {
  tableCard: {
    backgroundColor: "#fff",
    borderRadius: "12px",
    padding: "20px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  },
  tableHeaderRow: { marginBottom: "20px" },
  tableTitle: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#111827",
    margin: "0 0 15px 0",
  },
  filtersRow: {
    display: "flex",
    alignItems: "flex-end",
    gap: "12px",
    flexWrap: "wrap",
  },
  filterGroup: { display: "flex", flexDirection: "column", gap: "4px" },
  filterLabel: { fontSize: "11px", color: "#6b7280", fontWeight: "500" },
  filterInput: {
    padding: "8px 12px",
    border: "1px solid #e5e7eb",
    borderRadius: "6px",
    fontSize: "13px",
    width: "140px",
    outline: "none",
  },
  createBtn: {
    padding: "10px 20px",
    backgroundColor: "#f97316",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
  },
  exportBtn: {
    padding: "10px 20px",
    backgroundColor: "#fff",
    color: "#f97316",
    border: "1px solid #f97316",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
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
  viewIcon: { color: "#22c55e", fontSize: "10px" },
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
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    zIndex: 1000,
    paddingTop: "20px",
    overflowY: "hidden",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: "12px",
    width: "95%",
    maxWidth: "1000px",
    marginBottom: "20px",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 25px",
    borderBottom: "1px solid #f3f4f6",
  },
  modalTitle: {
    margin: 0,
    fontSize: "18px",
    fontWeight: "600",
    color: "#111827",
  },
  modalCloseBtn: {
    width: "32px",
    height: "32px",
    border: "none",
    borderRadius: "6px",
    backgroundColor: "#f3f4f6",
    cursor: "pointer",
    fontSize: "14px",
  },
  modalBody: { padding: "25px" },
  formColumns: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px" },
  formColumn: {},
  sectionTitle: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#111827",
    margin: "0 0 15px 0",
    paddingBottom: "10px",
    borderBottom: "2px solid #f97316",
  },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" },
  formGroup: { display: "flex", flexDirection: "column", gap: "6px" },
  formLabel: { fontSize: "12px", color: "#201d1bff", fontWeight: "500" },
  formInput: {
    padding: "10px 12px",
    border: "1px solid #e5e7eb",
    borderRadius: "6px",
    fontSize: "13px",
    outline: "none",
    backgroundColor: "#fff",
  },
  formInputFile: { padding: "8px 0", fontSize: "13px" },
  formSelect: {
    padding: "10px 12px",
    border: "1px solid #e5e7eb",
    borderRadius: "6px",
    fontSize: "13px",
    outline: "none",
    backgroundColor: "#fff",
  },
  suggestionBox: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    border: "1px solid #e5e7eb",
    maxHeight: "200px",
    overflowY: "auto",
    backgroundColor: "#fff",
    zIndex: 10,
    borderRadius: "6px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
  },
  suggestionItem: {
    padding: "10px 12px",
    cursor: "pointer",
    fontSize: "13px",
    borderBottom: "1px solid #f3f4f6",
  },
  submitBtn: {
    width: "100%",
    padding: "14px",
    backgroundColor: "#f97316",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    marginTop: "25px",
  },
};
