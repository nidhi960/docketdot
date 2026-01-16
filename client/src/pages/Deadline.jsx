import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Plus, Trash2, Eye, Edit, Upload, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "react-toastify";
import DeleteConfirmModal from "../components/DeleteConfirmModal";
import StatsRow from "../components/StatsRow";
import useAuthStore from "../store/authStore";
import UpcomingRemindersSection from "../components/UpcomingReminders";

const WORK_TYPES = [
  "Provisional",
  "Ordinary",
  "Ordinary+F18",
  "NP",
  "NP+F18",
  "Convention",
  "Convention+F18",
  "Form 3",
  "Form 4",
  "Form 6",
  "Form 8",
  "Form 9",
  "Form 13",
  "Form 18",
  "Form 25",
  "Form 26",
  "Form 27",
  "Form 28",
  "Form 29",
  "Response to Hearing",
  "Proof of Right",
  "Certificate for Translation Verification",
  "Priority Document",
  "Response to FER",
  "Annuity Fee",
  "Others",
];

const FIELD_OPTIONS = [
  { value: "", label: "Select Field" },
  // { value: "docket_number", label: "Docket Number" },
  // { value: "application_no", label: "Application No" },
  // { value: "worktype", label: "Action" },
  // { value: "deadline_date", label: "Deadline Date" },
  // { value: "app_number", label: "Application Number" },
  { value: "emails", label: "Emails" },
  { value: "status", label: "Status" },
  // { value: "insertby", label: "Inserted By" },
];

const DeadlinePage = () => {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isDetailView, setIsDetailView] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [activeTab, setActiveTab] = useState("view");
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteDeadlineId, setDeleteDeadlineId] = useState(null);
  const [docketSuggestions, setDocketSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [importing, setImporting] = useState(false);
  const [remindersKey, setRemindersKey] = useState(0);
  const fileInputRef = React.useRef(null);
  const [records, setRecords] = useState([]);
  const { updateStats } = useAuthStore();
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
  });
  const [filters, setFilters] = useState({
    start_date: "",
    end_date: "",
    docket_number: "",
    application_no: "",
    worktype: "",
    deadline_date: "",
    selected_field: "",
    dynamic_search: "",
  });

  const initialFormState = {
    docket_id: "", // Added: stores the actual docket ID for submission
    docket_number: "", // Display field - shows docket_no to user
    application_no: "",
    app_number: "",
    worktype: "",
    deadline_date: "",
    remarks: "",
    remainder1: "",
    remainder2: "",
    remainder3: "",
    remainder4: "",
    remainder5: "",
    remainder6: "",
    emails: [""],
    status: "ON",
    insertby: "",
  };
  const [formData, setFormData] = useState(initialFormState);

  // KEY CHANGE: Remove 'filters' from dependency array and pass as argument
  const fetchDeadlines = useCallback(
    async (page = 1, currentFilters) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page, limit: 10 });

        // Use the passed 'currentFilters' instead of state 'filters'
        const filtersToUse = currentFilters || filters;

        Object.entries(filtersToUse).forEach(([key, value]) => {
          if (key === "selected_field" || key === "dynamic_search") return;
          if (value) {
            params.append(
              key,
              typeof value === "string" ? value.trim() : value
            );
          }
        });

        if (filtersToUse.selected_field && filtersToUse.dynamic_search) {
          params.append(
            filtersToUse.selected_field,
            filtersToUse.dynamic_search.trim()
          );
        }

        const res = await axios.get(`/api/deadlines?${params.toString()}`);
        setRecords(res.data.deadlines || []);
        setPagination({
          currentPage: res.data.currentPage,
          totalPages: res.data.totalPages,
          totalRecords: res.data.totalRecords,
        });
      } catch (err) {
        console.error("Error fetching deadlines:", err);
        toast.error("Error fetching data");
      } finally {
        setLoading(false);
      }
    },
    [] // No dependencies here, purely functional
  );

  useEffect(() => {
    fetchDeadlines();
  }, []);

  // KEY CHANGE: Explicitly pass 'filters' to fetchDeadlines
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDeadlines(1, filters);
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [filters, fetchDeadlines]);

  const handleDocketSearch = async (value) => {
    setFormData((prev) => ({
      ...prev,
      docket_number: value,
      // Clear docket_id because the user is typing a new value
      // that hasn't been selected from the list yet
      docket_id: "",
    }));

    // Remove the !isEditMode check so it works for both Create and Edit
    if (value.length > 1) {
      try {
        const res = await axios.get(`/api/deadlines/lookup-docket/${value}`);
        setDocketSuggestions(res.data);
        setShowSuggestions(res.data.length > 0);
      } catch (err) {
        setDocketSuggestions([]);
        setShowSuggestions(false);
      }
    } else {
      setDocketSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectDocket = (docket) => {
    setFormData((prev) => ({
      ...prev,
      docket_id: docket._id || docket.id, // Store the docket ID
      docket_number: docket.docket_no, // Display the docket number
      application_no: docket.application_no || "",
    }));
    setShowSuggestions(false);
  };

  const calculateRemainders = (deadlineDateStr) => {
    if (!deadlineDateStr) return {};
    const deadlineDate = new Date(deadlineDateStr);
    const today = new Date();
    const timeDiff = deadlineDate.getTime() - today.getTime();
    const totalDays = Math.floor(timeDiff / (1000 * 3600 * 24));
    if (totalDays <= 0) return {};

    const remainder6 = new Date(deadlineDate);
    const remainder5 = new Date(remainder6);
    remainder5.setDate(remainder6.getDate() - 1);
    const remainder1 = new Date(today);
    remainder1.setDate(today.getDate() + Math.floor(totalDays / 2));
    const totalDaysBetween = Math.floor(
      (remainder6.getTime() - remainder1.getTime()) / (1000 * 3600 * 24)
    );
    const avgStep = Math.floor(totalDaysBetween / 4);
    const remainder2 = new Date(remainder1);
    remainder2.setDate(remainder1.getDate() + avgStep);
    const remainder3 = new Date(remainder2);
    remainder3.setDate(remainder2.getDate() + avgStep);
    const remainder4 = new Date(remainder3);
    remainder4.setDate(remainder3.getDate() + avgStep);

    const formatDate = (date) => date.toISOString().split("T")[0];
    return {
      remainder1: formatDate(remainder1),
      remainder2: formatDate(remainder2),
      remainder3: formatDate(remainder3),
      remainder4: formatDate(remainder4),
      remainder5: formatDate(remainder5),
      remainder6: formatDate(remainder6),
    };
  };

  const handleDeadlineDateChange = (e) => {
    const value = e.target.value;
    const remainders = calculateRemainders(value);
    setFormData((prev) => ({ ...prev, deadline_date: value, ...remainders }));
  };

  const addEmail = () =>
    setFormData((prev) => ({ ...prev, emails: [...prev.emails, ""] }));
  const removeEmail = (index) => {
    if (formData.emails.length > 1) {
      setFormData((prev) => ({
        ...prev,
        emails: prev.emails.filter((_, i) => i !== index),
      }));
    }
  };
  const handleEmailChange = (index, value) => {
    const newEmails = [...formData.emails];
    newEmails[index] = value;
    setFormData((prev) => ({ ...prev, emails: newEmails }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateNew = () => {
    setFormData(initialFormState);
    setIsEditMode(false);
    setEditingRecordId(null);
    setShowModal(true);
  };

  const handleEdit = (record) => {
    setFormData({
      ...initialFormState,
      ...record,
      docket_id: record.docket_id || record.docket?._id || "", // Handle docket_id from record
      docket_number: record.docket_number || record.docket?.docket_no || "",
      deadline_date: record.deadline_date
        ? record.deadline_date.split("T")[0]
        : "",
      remainder1: record.remainder1 ? record.remainder1.split("T")[0] : "",
      remainder2: record.remainder2 ? record.remainder2.split("T")[0] : "",
      remainder3: record.remainder3 ? record.remainder3.split("T")[0] : "",
      remainder4: record.remainder4 ? record.remainder4.split("T")[0] : "",
      remainder5: record.remainder5 ? record.remainder5.split("T")[0] : "",
      remainder6: record.remainder6 ? record.remainder6.split("T")[0] : "",
      emails: record.emails?.length > 0 ? record.emails : [""],
    });
    setEditingRecordId(record._id);
    setIsEditMode(true);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData(initialFormState);
    setIsEditMode(false);
    setEditingRecordId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Create a copy of data to clean up before sending
    const payload = { ...formData };

    // SAFETY CHECK: Ensure docket_id is a string, not an object
    if (payload.docket_id && typeof payload.docket_id === "object") {
      payload.docket_id = payload.docket_id._id || payload.docket_id.id;
    }

    if (!payload.docket_id) {
      return toast.error("Please select a valid docket from the suggestions.");
    }

    try {
      if (isEditMode && editingRecordId) {
        // Use payload instead of formData
        const res = await axios.put(
          `/api/deadlines/${editingRecordId}`,
          payload
        );
        const updatedRecord = res.data.data || res.data;

        setRecords((prev) =>
          prev.map((d) => (d._id === editingRecordId ? updatedRecord : d))
        );
        toast.success("Updated successfully");
      } else {
        // Use payload instead of formData
        const res = await axios.post(`/api/deadlines`, payload);
        const newRecord = res.data.data || res.data;

        setRecords((prev) => [newRecord, ...prev]);
        setPagination((prev) => ({
          ...prev,
          totalRecords: prev.totalRecords + 1,
        }));
        updateStats("deadlines", 1);
        toast.success("Created successfully");
      }
      setRemindersKey((prev) => prev + 1);
      handleCloseModal();
    } catch (err) {
      console.error("Deadline Save Error:", err);
      toast.error(
        err.response?.data?.message || "Format error. Please re-select docket."
      );
    }
  };

  const handleDelete = (id) => {
    setDeleteDeadlineId(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(`/api/deadlines/${deleteDeadlineId}`);
      setRecords((prev) => prev.filter((r) => r._id !== deleteDeadlineId));
      setPagination((prev) => ({
        ...prev,
        totalRecords: Math.max(0, prev.totalRecords - 1),
      }));
      updateStats("deadlines", -1);
      toast.success("Deadline Deleted Successfully");
      setRemindersKey((prev) => prev + 1);
    } catch (err) {
      if (!import.meta.env.PROD) console.error("Error deleting deadline:", err);
      toast.error(
        err?.response?.data?.message || "Something occurred. Please try again."
      );
    } finally {
      setShowDeleteModal(false);
      setDeleteDeadlineId(null);
    }
  };

  const handleViewDetail = (record) => {
    setSelectedRecord(record);
    setActiveTab("view");
    setIsDetailView(true);
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      const res = await axios.get(
        `/api/deadlines/export/excel?${params.toString()}`
      );
      const exportData = res.data.map((d) => ({
        "Docket ID": d.docket_id,
        "Docket Number": d.docket_number,
        "Application No": d.application_no,
        "App Number": d.app_number,
        Action: d.worktype,
        "Deadline Date": d.deadline_date?.split("T")[0],
        Status: d.status,
        Remarks: d.remarks,
        Emails: d.emails?.join(", "),
        "Created At": d.createdAt?.split("T")[0],
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Deadlines");
      XLSX.writeFile(
        wb,
        `Deadlines_${new Date().toISOString().split("T")[0]}.xlsx`
      );
    } catch (err) {
      if (!import.meta.env.PROD) console.error("Error exporting data:", err);
      toast.error(
        err?.response?.data?.message || "Something occurred. Please try again."
      );
    }
  };

  // Add after handleExport function (around line 340)

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImporting(true);

    try {
      const reader = new FileReader();

      reader.onload = async (event) => {
        try {
          const data = new Uint8Array(event.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          if (jsonData.length === 0) {
            toast.error("No data found in the file");
            setImporting(false);
            return;
          }

          // Map Excel columns to API fields
          const mappedData = jsonData.map((row) => ({
            docket_number: row["Docket Number"] || "",
            application_no: row["Application No"] || "",
            app_number: row["App Number"] || "",
            worktype: row["Action"] || row["WorkType"] || "",
            deadline_date: parseExcelDate(row["Deadline Date"]),
            status: row["Status"] || "ON",
            remarks: row["Remarks"] || "",
            emails: row["Emails"]
              ? row["Emails"].split(",").map((e) => e.trim())
              : [],
            remainder1: parseExcelDate(row["Remainder 1"]),
            remainder2: parseExcelDate(row["Remainder 2"]),
            remainder3: parseExcelDate(row["Remainder 3"]),
            remainder4: parseExcelDate(row["Remainder 4"]),
            remainder5: parseExcelDate(row["Remainder 5"]),
            remainder6: parseExcelDate(row["Remainder 6"]),
          }));

          // Send to bulk import API
          const res = await axios.post("/api/deadlines/bulk-import", {
            deadlines: mappedData,
          });

          const importedCount = res.data.imported || mappedData.length;
          toast.success(`Successfully imported ${importedCount} records`);

          // Refresh the list
          fetchDeadlines(1);
          updateStats("deadlines", importedCount);
          setRemindersKey((prev) => prev + 1);

          if (res.data.errors?.length > 0) {
            toast.warning(`${res.data.errors.length} records failed to import`);
          }
        } catch (parseError) {
          console.error("Parse error:", parseError);
          toast.error("Error parsing Excel file. Please check the format.");
        }
        setImporting(false);
      };

      reader.onerror = () => {
        toast.error("Error reading file");
        setImporting(false);
      };

      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error("Import error:", err);
      toast.error(
        err?.response?.data?.message || "Import failed. Please try again."
      );
      setImporting(false);
    }

    // Reset file input
    e.target.value = "";
  };

  // Helper function to parse Excel dates
  const parseExcelDate = (value) => {
    if (!value) return "";

    // If it's already a date string
    if (typeof value === "string") {
      const parsed = new Date(value);
      return isNaN(parsed.getTime()) ? "" : parsed.toISOString().split("T")[0];
    }

    // If it's an Excel serial number
    if (typeof value === "number") {
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + value * 86400000);
      return date.toISOString().split("T")[0];
    }

    return "";
  };

  // Download template function
  const downloadTemplate = () => {
    const templateData = [
      {
        "Docket Number": "SAMPLE-001",
        "Application No": "APP-001",
        "App Number": "",
        Action: "Provisional",
        "Deadline Date": "2025-02-15",
        Status: "ON",
        Remarks: "Sample remark",
        Emails: "email1@example.com, email2@example.com",
        "Remainder 1": "",
        "Remainder 2": "",
        "Remainder 3": "",
        "Remainder 4": "",
        "Remainder 5": "",
        "Remainder 6": "",
      },
    ];

    // Add a second sheet with valid options
    const optionsData = WORK_TYPES.map((w, i) => ({
      "#": i + 1,
      "Valid Action/WorkType Values": w,
    }));

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wsOptions = XLSX.utils.json_to_sheet(optionsData);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.utils.book_append_sheet(wb, wsOptions, "Valid Options");

    // Auto-size columns
    const colWidths = Object.keys(templateData[0]).map((key) => ({
      wch: Math.max(key.length, 20),
    }));
    ws["!cols"] = colWidths;

    XLSX.writeFile(wb, "deadline_import_template.xlsx");
    toast.success("Template downloaded");
  };

  const formatDisplayDate = (dateStr) =>
    !dateStr ? "-" : new Date(dateStr).toLocaleDateString("en-GB");

  return (
    <div className="p-0">
      <StatsRow />
      <UpcomingRemindersSection key={remindersKey} />
      <DeleteConfirmModal
        show={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        message="Are you sure you want to delete this deadline?"
      />

      {/* Filter Section */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3">
            {/* 1. Start Date (Added for Range Filtering) */}
            <div className="col-md-2">
              <div className="form-floating">
                <input
                  type="date"
                  className="form-control"
                  id="start_date"
                  value={filters.start_date || ""}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, start_date: e.target.value }))
                  }
                />
                <label htmlFor="start_date">Start Date</label>
              </div>
            </div>

            {/* 2. End Date */}
            <div className="col-md-2">
              <div className="form-floating">
                <input
                  type="date"
                  className="form-control"
                  id="end_date"
                  value={filters.end_date || ""}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, end_date: e.target.value }))
                  }
                />
                <label htmlFor="end_date">End Date</label>
              </div>
            </div>

            {/* 3. Docket No */}
            <div className="col-md-2">
              <div className="form-floating">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Docket No."
                  value={filters.docket_number || ""}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      docket_number: e.target.value,
                    }))
                  }
                />
                <label>Docket No.</label>
              </div>
            </div>

            {/* 4. Application No */}
            <div className="col-md-2">
              <div className="form-floating">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Application No"
                  value={filters.application_no || ""}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      application_no: e.target.value,
                    }))
                  }
                />
                <label>Application No</label>
              </div>
            </div>

            {/* 5. Work Type (Dropdown) */}
            <div className="col-md-2">
              <div className="form-floating">
                <select
                  className="form-select"
                  value={filters.worktype || ""}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, worktype: e.target.value }))
                  }
                >
                  <option value="">All</option>
                  {WORK_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <label>Work Type</label>
              </div>
            </div>

            {/* 6. Specific Deadline Date */}
            <div className="col-md-2">
              <div className="form-floating">
                <input
                  type="date"
                  className="form-control"
                  value={filters.deadline_date || ""}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      deadline_date: e.target.value,
                    }))
                  }
                />
                <label>Deadline Date</label>
              </div>
            </div>

            {/* 7. Dynamic Field Selection */}
            <div className="col-md-2">
              <div className="form-floating">
                <select
                  className="form-select"
                  value={filters.selected_field || ""}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      selected_field: e.target.value,
                      dynamic_search: "",
                    }))
                  }
                >
                  {FIELD_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <label>Select Field</label>
              </div>
            </div>

            {/* 8. Dynamic Search Value (Conditional) */}
            {filters.selected_field && (
              <div className="col-md-2">
                <div className="form-floating">
                  <input
                    type={
                      [
                        "deadline_date",
                        "remainder1",
                        "remainder2",
                        "remainder3",
                        "remainder4",
                        "remainder5",
                        "remainder6",
                      ].includes(filters.selected_field)
                        ? "date"
                        : "text"
                    }
                    className="form-control"
                    placeholder="Search Value"
                    value={filters.dynamic_search || ""}
                    onChange={(e) =>
                      setFilters((f) => ({
                        ...f,
                        dynamic_search: e.target.value,
                      }))
                    }
                  />
                  <label>Search Value</label>
                </div>
              </div>
            )}
          </div>
          <div className="mt-3 d-flex gap-2">
            <button className="btn btn-primary" onClick={handleCreateNew}>
              <Plus size={16} className="me-1" />
              Create New
            </button>

            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              accept=".xlsx,.xls"
              onChange={handleImport}
            />

            <button
              className="btn btn-info text-white"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
            >
              <Upload size={16} className="me-1" />
              {importing ? "Importing..." : "Import"}
            </button>

            <button className="btn btn-success" onClick={handleExport}>
              <Download size={16} className="me-1" />
              Export
            </button>

            <button className="btn btn-secondary" onClick={downloadTemplate}>
              <Download size={16} className="me-1" />
              Template
            </button>
          </div>
        </div>
      </div>

      {/* Table Section */}
      {/* Table Section */}
      <div style={styles.tableCard}>
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Sr No.</th>
                <th style={styles.th}>Docket Number</th>
                <th style={styles.th}>Application Number</th>
                <th style={styles.th}>Work Type</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Deadline Date</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={styles.tdCenter}>
                    Loading...
                  </td>
                </tr>
              ) : records.length > 0 ? (
                records.map((r, i) => (
                  <tr key={r._id} style={styles.tr}>
                    <td style={styles.td}>
                      {(pagination.currentPage - 1) * 10 + i + 1}
                    </td>
                    <td style={styles.td}>{r.docket_number}</td>
                    <td style={styles.td}>{r.application_no}</td>
                    <td style={styles.td}>{r.worktype}</td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.statusBadge,
                          backgroundColor:
                            r.status === "ON" ? "#dcfce7" : "#f3f4f6",
                          color: r.status === "ON" ? "#16a34a" : "#6b7280",
                        }}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {formatDisplayDate(r.deadline_date)}
                    </td>
                    <td style={styles.td}>
                      <span
                        style={styles.viewLink}
                        onClick={() => handleViewDetail(r)}
                      >
                        View{" "}
                        <span style={styles.viewIcon}>
                          <Eye style={{ scale: "0.7" }} />
                        </span>
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" style={styles.tdCenter}>
                    No records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={styles.pagination}>
          <span style={styles.paginationInfo}>
            Showing{" "}
            <strong>
              {(pagination.currentPage - 1) * 10 + 1}-
              {Math.min(pagination.currentPage * 10, pagination.totalRecords)}
            </strong>{" "}
            of <strong>{pagination.totalRecords.toLocaleString()}</strong>{" "}
            records
          </span>
          <div style={styles.paginationBtns}>
            <button
              onClick={() => fetchDeadlines(pagination.currentPage - 1)}
              disabled={pagination.currentPage <= 1}
              style={{
                ...styles.pageBtn,
                opacity: pagination.currentPage <= 1 ? 0.5 : 1,
                cursor: pagination.currentPage <= 1 ? "not-allowed" : "pointer",
              }}
            >
              ←
            </button>
            {[...Array(pagination.totalPages)]
              .map((_, i) => (
                <button
                  key={i}
                  onClick={() => fetchDeadlines(i + 1)}
                  style={{
                    ...styles.pageBtn,
                    ...(pagination.currentPage === i + 1
                      ? styles.pageBtnActive
                      : {}),
                  }}
                >
                  {i + 1}
                </button>
              ))
              .slice(
                Math.max(0, pagination.currentPage - 3),
                pagination.currentPage + 2
              )}
            <button
              onClick={() => fetchDeadlines(pagination.currentPage + 1)}
              disabled={pagination.currentPage >= pagination.totalPages}
              style={{
                ...styles.pageBtn,
                opacity:
                  pagination.currentPage >= pagination.totalPages ? 0.5 : 1,
                cursor:
                  pagination.currentPage >= pagination.totalPages
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              →
            </button>
          </div>
        </div>
      </div>

      {/* --- VIEW DETAILS MODAL --- */}
      {isDetailView && selectedRecord && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.6)", zIndex: 1050 }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content shadow">
              <div className="modal-header border-bottom py-3">
                <h5 className="modal-title fw-bold">Deadline Details</h5>
                <button
                  className="btn-close"
                  onClick={() => setIsDetailView(false)}
                ></button>
              </div>
              <div className="modal-body p-4">
                <div className="row g-3">
                  <div className="col-md-4">
                    <strong>Docket Number:</strong>
                    <br /> {selectedRecord.docket_number}
                  </div>
                  <div className="col-md-4">
                    <strong>Application No:</strong>
                    <br /> {selectedRecord.application_no}
                  </div>
                  <div className="col-md-4">
                    <strong>App Number:</strong>
                    <br /> {selectedRecord.app_number || "-"}
                  </div>
                  <div className="col-md-4">
                    <strong>Action:</strong>
                    <br /> {selectedRecord.worktype}
                  </div>
                  <div className="col-md-4">
                    <strong>Deadline Date:</strong>
                    <br /> {formatDisplayDate(selectedRecord.deadline_date)}
                  </div>
                  <div className="col-md-4">
                    <strong>Status:</strong>
                    <br />
                    <span
                      className={`badge ${
                        selectedRecord.status === "ON"
                          ? "bg-success"
                          : "bg-secondary"
                      }`}
                    >
                      {selectedRecord.status}
                    </span>
                  </div>
                  <div className="col-md-12 mt-3">
                    <strong>Remarks:</strong>
                    <br /> {selectedRecord.remarks || "-"}
                  </div>
                  <div className="col-md-12 mt-2">
                    <strong>Emails:</strong>
                    <br /> {selectedRecord.emails?.join(", ") || "-"}
                  </div>
                  <div className="col-12">
                    <hr />
                  </div>
                  <div className="col-12">
                    <h6 className="fw-bold">Remainder Dates</h6>
                  </div>
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <div className="col-md-2 col-4" key={n}>
                      <small className="text-muted d-block">R{n}</small>
                      {formatDisplayDate(selectedRecord[`remainder${n}`])}
                    </div>
                  ))}
                </div>
              </div>
              <div className="modal-footer border-top">
                <button
                  className="btn btn-warning btn-sm"
                  onClick={() => {
                    handleEdit(selectedRecord);
                    setIsDetailView(false);
                  }}
                >
                  <Edit size={14} className="me-1" /> Edit Record
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => {
                    handleDelete(selectedRecord._id);
                    setIsDetailView(false);
                  }}
                >
                  <Trash2 size={14} className="me-1" /> Delete
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setIsDetailView(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- CREATE / EDIT MODAL (PREVIOUS EXACT LOGIC RESTORED) --- */}
      {showModal && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1060 }}
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {isEditMode ? "Edit Deadline" : "Add Deadline"}
                </h5>
                <button
                  className="btn-close"
                  onClick={handleCloseModal}
                ></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6 position-relative">
                      <div className="form-floating">
                        <input
                          type="text"
                          className={`form-control ${
                            formData.docket_id ? "is-valid" : ""
                          }`}
                          name="docket_number"
                          placeholder="Docket Number"
                          value={formData.docket_number}
                          onChange={(e) => handleDocketSearch(e.target.value)}
                          onFocus={() => {
                            // Show suggestions if user has typed something but hasn't selected a docket yet
                            if (
                              formData.docket_number.length > 1 &&
                              !formData.docket_id
                            ) {
                              setShowSuggestions(true);
                            }
                          }}
                          onBlur={() =>
                            // Timeout is necessary so the onMouseDown of the suggestion can fire
                            setTimeout(() => setShowSuggestions(false), 200)
                          }
                          required
                          autoComplete="off"
                        />
                        <label>Docket Number</label>
                      </div>

                      {/* Status Messages */}
                      {formData.docket_number && !formData.docket_id && (
                        <small className="text-warning">
                          Please select a docket from the dropdown
                        </small>
                      )}
                      {formData.docket_id && (
                        <small className="text-success">
                          ✓ Docket selected (ID:{" "}
                          {typeof formData.docket_id === "string"
                            ? formData.docket_id.slice(-6)
                            : (formData.docket_id?._id || "").slice(-6)}
                          )
                        </small>
                      )}

                      {/* Suggestion Dropdown Box */}
                      {showSuggestions &&
                        formData.docket_number.length > 1 &&
                        !formData.docket_id && (
                          <div
                            className="position-absolute w-100 bg-white border rounded shadow mt-1"
                            style={{
                              zIndex: 1000,
                              maxHeight: 200,
                              overflowY: "auto",
                            }}
                          >
                            {docketSuggestions.length > 0 ? (
                              // IF MATCHES FOUND: Show the list
                              docketSuggestions.map((d, i) => (
                                <div
                                  key={i}
                                  className="p-2 border-bottom suggestion-hover"
                                  style={{ cursor: "pointer" }}
                                  onMouseDown={() => selectDocket(d)}
                                >
                                  <strong>{d.docket_no}</strong>
                                  <br />
                                  <small className="text-muted">
                                    {d.title
                                      ? d.title.substring(0, 45) + "..."
                                      : "No title"}
                                  </small>
                                </div>
                              ))
                            ) : (
                              // IF NO MATCHES FOUND: Show this message
                              <div className="p-3 text-center">
                                <div className="text-danger fw-bold small">
                                  No match found
                                </div>
                                <small className="text-muted">
                                  Check the docket number and try again
                                </small>
                              </div>
                            )}
                          </div>
                        )}
                    </div>
                    <div className="col-md-6">
                      <div className="form-floating">
                        <input
                          type="text"
                          className="form-control"
                          name="application_no"
                          placeholder="Application No"
                          value={formData.application_no}
                          onChange={handleInputChange}
                          required
                        />
                        <label>Corresponding Application No</label>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="form-floating">
                        <select
                          className="form-select"
                          name="worktype"
                          value={formData.worktype}
                          onChange={handleInputChange}
                          required
                        >
                          <option value="">Select</option>
                          {WORK_TYPES.map((w) => (
                            <option key={w} value={w}>
                              {w}
                            </option>
                          ))}
                        </select>
                        <label>WorkType</label>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="form-floating">
                        <input
                          type="date"
                          className="form-control"
                          name="deadline_date"
                          value={formData.deadline_date}
                          onChange={handleDeadlineDateChange}
                          required
                        />
                        <label>Deadline Date</label>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="form-floating">
                        <input
                          type="text"
                          className="form-control"
                          name="app_number"
                          placeholder="Application Number"
                          value={formData.app_number}
                          onChange={handleInputChange}
                        />
                        <label>Application Number</label>
                      </div>
                    </div>
                    {formData.deadline_date && (
                      <div className="col-12">
                        <label className="fw-bold mb-2">
                          Remainder Dates (Auto-calculated)
                        </label>
                        <div className="row g-2">
                          {[1, 2, 3, 4, 5, 6].map((n) => (
                            <div className="col-md-2" key={n}>
                              <label className="small">R{n}</label>
                              <input
                                type="date"
                                className="form-control form-control-sm"
                                name={`remainder${n}`}
                                value={formData[`remainder${n}`]}
                                onChange={handleInputChange}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="col-md-12">
                      <div className="form-floating">
                        <textarea
                          className="form-control"
                          name="remarks"
                          placeholder="Remarks"
                          style={{ height: 80 }}
                          value={formData.remarks}
                          onChange={handleInputChange}
                        ></textarea>
                        <label>Remarks</label>
                      </div>
                    </div>
                    <div className="col-md-12">
                      <label className="fw-bold mb-2">Email Addresses</label>
                      {formData.emails.map((email, idx) => (
                        <div key={idx} className="d-flex gap-2 mb-2">
                          <input
                            type="email"
                            className="form-control"
                            placeholder="Enter Email"
                            value={email}
                            onChange={(e) =>
                              handleEmailChange(idx, e.target.value)
                            }
                          />
                          {idx > 0 && (
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => removeEmail(idx)}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                      <a type="button" className=" btn-link" onClick={addEmail}>
                        + Add Another Email
                      </a>
                    </div>
                    <div className="col-md-6">
                      <div className="form-floating">
                        <select
                          className="form-select"
                          name="status"
                          value={formData.status}
                          onChange={handleInputChange}
                        >
                          <option value="ON">ON</option>
                          <option value="OFF">OFF</option>
                          <option value="COMPLETED">COMPLETED</option>
                          <option value="PENDING">PENDING</option>
                        </select>
                        <label>Status</label>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCloseModal}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={!formData.docket_id && !isEditMode}
                  >
                    {isEditMode ? "Update" : "Submit"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  tableCard: {
    backgroundColor: "#fff",
    borderRadius: "12px",
    padding: "20px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  },
  tableWrapper: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "13px",
  },
  th: {
    textAlign: "left",
    padding: "12px 10px",
    color: "#6b7280",
    fontWeight: "600",
    borderBottom: "1px solid #f3f4f6",
    whiteSpace: "nowrap",
  },
  tr: {
    borderBottom: "1px solid #f3f4f6",
  },
  td: {
    padding: "14px 10px",
    color: "#374151",
    whiteSpace: "nowrap",
  },
  tdCenter: {
    padding: "30px",
    textAlign: "center",
    color: "#9ca3af",
  },
  statusBadge: {
    padding: "4px 10px",
    borderRadius: "4px",
    fontSize: "12px",
    fontWeight: "500",
  },
  viewLink: {
    color: "#111827",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontWeight: "500",
    cursor: "pointer",
  },
  viewIcon: {
    color: "#22c55e",
  },
  pagination: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: "15px",
  },
  paginationInfo: {
    fontSize: "13px",
    color: "#6b7280",
  },
  paginationBtns: {
    display: "flex",
    gap: "5px",
  },
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
};

export default DeadlinePage;
