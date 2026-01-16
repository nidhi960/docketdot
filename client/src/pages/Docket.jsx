import React, { useState, useEffect } from "react";
import axios from "axios";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { Eye, Upload, Download, Paperclip, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import DeleteConfirmModal from "../components/DeleteConfirmModal";
import StatsRow from "../components/StatsRow";
import useAuthStore from "../store/authStore";
import * as XLSX from "xlsx";
import Uppy from "@uppy/core";
import AwsS3Multipart from "@uppy/aws-s3-multipart";
import { DashboardModal } from "@uppy/react";
import "@uppy/core/dist/style.min.css";
import "@uppy/dashboard/dist/style.min.css";

const COUNTRIES = [
  { code: "[AD]", name: "Andorra" },
  { code: "[AE]", name: "UAE (United Arab Emirates)" },
  { code: "[AF]", name: "Afghanistan" },
  { code: "[AG]", name: "Antigua and Barbuda" },
  { code: "[AI]", name: "Anguilla" },
  { code: "[AL]", name: "Albania" },
  { code: "[AM]", name: "Armenia" },
  { code: "[IN]", name: "India" },
  { code: "[US]", name: "USA (United States of America)" },
  { code: "[GB]", name: "Great Britain" },
];

const FileItem = ({ file, docketId, allowDelete, onDownload, onDelete }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // ✅ FIX: Reset visibility when file changes
    setIsVisible(true);

    const checkFile = async () => {
      try {
        await axios.get(
          `/api/dockets/download-url?fileKey=${encodeURIComponent(file.key)}`
        );
      } catch (error) {
        if (error.response && error.response.status === 404) {
          setIsVisible(false);
        }
      }
    };

    if (file.key) checkFile();
  }, [file.key]);

  if (!isVisible) return null;

  return (
    <div
      style={{
        /* ... your existing styles ... */ border: "1px solid #e5e7eb",
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
      {/* ... rest of your JSX ... */}
      <button
        type="button"
        onClick={() => onDownload(file.key, file.filename)}
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
      {allowDelete && docketId && (
        <button
          type="button"
          onClick={() => onDelete(docketId, file.key)}
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
  );
};
const DocketPage = () => {
  const [viewMode, setViewMode] = useState("dashboard");
  const [detailTab, setDetailTab] = useState("view");
  const [showModal, setShowModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const recordsPerPage = 10;
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState(null);
  const [clients, setClients] = React.useState([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = React.useRef(null);
  const [records, setRecords] = useState([]);
  const { updateStats } = useAuthStore();
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const initialFormState = {
    status: "docket",
    instruction_date: "",
    client_id: "",
    docket_no: "",
    service_name: "",
    client_ref: "",
    currency: "",
    anovipfee: "",
    associatefee: "",
    officialfee: "",
    fee: "",
    spoc_name: "",
    phone_no: "",
    firm_name: "",
    country: "",
    email: "",
    address: "",
    application_status: "",
    due_date: "",
    application_type: "",
    filling_country: "",
    filling_date: "",
    application_no: "",
    applicant_type: "",
    title: "",
    pct_application_date: "", // Add this
    field_of_invention: "", // Add this
    application_number: "",
    existing_file_image: "",
  };
  const [formData, setFormData] = useState(initialFormState);

  const [filters, setFilters] = useState({
    start_date: "",
    end_date: "",
    docket_no: "",
    service_name: "",
    filling_country: "",
    application_type: "",
    field_selector: "",
    dynamic_search: "",
  });

  // --- UPPY STATE ---
  const [isUppyModalOpen, setIsUppyModalOpen] = useState(false);
  const [newlyUploadedFiles, setNewlyUploadedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  // --- INITIALIZE UPPY ---
  const uppy = React.useMemo(() => {
    const uppyInstance = new Uppy({
      id: "docket-uploader",
      autoProceed: false,
      restrictions: {
        maxNumberOfFiles: 100,
        maxTotalFileSize: 5 * 1024 * 1024 * 1024, // 5 GB,
      },
    });

    uppyInstance.use(AwsS3Multipart, {
      limit: 4,
      // 1. Multipart Start
      async createMultipartUpload(file) {
        const fileType = file.type || "application/octet-stream";
        const res = await axios.post("/api/dockets/s3/multipart/start", {
          filename: file.name,
          contentType: fileType,
        });
        file.meta.key = res.data.key;
        return { uploadId: res.data.uploadId, key: res.data.key };
      },
      // 2. Multipart Sign
      async signPart(file, { uploadId, key, partNumber }) {
        const res = await axios.post("/api/dockets/s3/multipart/sign-part", {
          uploadId,
          key,
          partNumber,
        });
        return { url: res.data.url };
      },
      // 3. Multipart Complete
      async completeMultipartUpload(file, { uploadId, key, parts }) {
        const res = await axios.post("/api/dockets/s3/multipart/complete", {
          uploadId,
          key,
          parts,
        });
        return { location: res.data.location };
      },
      // 4. Multipart Abort
      async abortMultipartUpload(file, { uploadId, key }) {
        await axios.post("/api/dockets/s3/multipart/abort", { uploadId, key });
      },
      // 5. Simple Upload (For small files like .docx) - THIS WAS THE ISSUE
      async getUploadParameters(file) {
        // Fix: Explicitly handle empty file types
        const fileType =
          file.type && file.type.length > 0
            ? file.type
            : "application/octet-stream";

        const res = await axios.post("/api/dockets/s3/presigned-url", {
          filename: file.name,
          contentType: fileType,
        });

        // Store key so we can save it to DB later
        file.meta.key = res.data.key;

        return {
          method: "PUT",
          url: res.data.uploadUrl,
          headers: {
            "Content-Type": fileType, // Header must match signature
          },
        };
      },
    });

    return uppyInstance;
  }, []);

  // ... inside DocketPage component ...

  // Handle Uppy Events
  useEffect(() => {
    // 1. When upload starts
    const handleUploadStart = () => {
      setIsUploading(true);
    };

    // 2. When upload completes (success or failure)
    const handleComplete = (result) => {
      setIsUploading(false); // Enable button again

      if (result.successful.length > 0) {
        const uploaded = result.successful.map((file) => ({
          key: file.meta.key,
          filename: file.name,
          mimetype: file.meta.type,
          size: file.size,
        }));

        setNewlyUploadedFiles((prev) => [...prev, ...uploaded]);
        toast.success("Files uploaded!");
        setIsUppyModalOpen(false);
        uppy.cancelAll();
      }
    };

    // 3. If upload is cancelled
    const handleCancel = () => {
      setIsUploading(false);
    };

    uppy.on("upload", handleUploadStart);
    uppy.on("complete", handleComplete);
    uppy.on("cancel-all", handleCancel);

    return () => {
      uppy.off("upload", handleUploadStart);
      uppy.off("complete", handleComplete);
      uppy.off("cancel-all", handleCancel);
    };
  }, [uppy]);

  // Cleanup
  useEffect(() => {
    return () => uppy.close();
  }, [uppy]);

  const [suggestions, setSuggestions] = useState([]);
  const [suggestions1, setSuggestions1] = useState([]);

  const fetchDockets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach((key) => {
        if (filters[key]) params.append(key, filters[key]);
      });
      params.append("page", currentPage);
      params.append("limit", recordsPerPage);
      const res = await axios.get(`/api/dockets?${params.toString()}`);

      const docketsData = res.data.dockets || res.data.data || [];

      setRecords(docketsData);

      // Handle multiple possible response structures
      const total =
        res.data.total ||
        res.data.totalRecords ||
        res.data.count ||
        res.data.pagination?.total ||
        docketsData.length;

      setTotalRecords(total);
    } catch (err) {
      if (!import.meta.env.PROD) {
        console.error("Error fetching dockets", err);
      }
      toast.error(
        err?.response?.data?.message || "Something occurred. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await axios.get(`/api/auth/clients`);
      setClients(res.data);
    } catch (err) {
      if (!import.meta.env.PROD) console.error("Failed to fetch clients", err);
      toast.error(
        err?.response?.data?.message || "Something occurred. Please try again."
      );
    }
  };

  useEffect(() => {
    if (location.state?.showDetail && location.state?.viewDocket) {
      setSelectedRecord(location.state.viewDocket);
      setViewMode("detail");
      setDetailTab("view");
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    fetchDockets();
  }, [filters, currentPage]);

  // Add this useEffect after your other useEffects

  // Track if user came from external page (Dashboard)
  const [cameFromExternal, setCameFromExternal] = useState(false);

  useEffect(() => {
    if (location.state?.showDetail && location.state?.viewDocket) {
      setSelectedRecord(location.state.viewDocket);
      setViewMode("detail");
      setDetailTab("view");
      setCameFromExternal(true); // User came from Dashboard
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  useEffect(() => {
    // Only push history state for internal navigation (not from Dashboard)
    if (viewMode === "detail" && !cameFromExternal) {
      window.history.pushState({ viewMode: "detail" }, "");
    }
  }, [viewMode, cameFromExternal]);

  useEffect(() => {
    const handlePopState = (event) => {
      if (viewMode === "detail") {
        if (cameFromExternal) {
          // Came from Dashboard - go back to Dashboard
          navigate(-1);
        } else {
          // Opened from DocketPage table - go back to list
          setViewMode("dashboard");
          setSelectedRecord(null);
        }
      }
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [viewMode, cameFromExternal, navigate]);

  useEffect(() => {
    const anovip = parseFloat(formData.anovipfee) || 0;
    const associate = parseFloat(formData.associatefee) || 0;
    const official = parseFloat(formData.officialfee) || 0;
    setFormData((prev) => ({
      ...prev,
      fee: Math.round(anovip + associate + official),
    }));
  }, [formData.anovipfee, formData.associatefee, formData.officialfee]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    if (name === "country" || name === "filling_country") {
      const query = value.toUpperCase().trim();
      const matches = COUNTRIES.filter(
        (c) =>
          c.name.toUpperCase().includes(query) ||
          c.code.toUpperCase().includes(query)
      );
      if (name === "country") setSuggestions1(query ? matches : []);
      else setSuggestions(query ? matches : []);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({ ...filters, [name]: value });
    setCurrentPage(1);
  };

  const handleFileChange = (e) => {
    setSelectedFiles(e.target.files);
  };

  const selectSuggestion = (fieldName, item) => {
    setFormData({ ...formData, [fieldName]: `${item.code} ${item.name}` });
    setSuggestions([]);
    setSuggestions1([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    const payload = {
      ...formData,
      applicants: JSON.stringify(formData.applicants),
      inventors: JSON.stringify(formData.inventors),
      priorities: JSON.stringify(formData.priorities),
    };

    try {
      if (formData._id) {
        // UPDATE
        // ✅ This part was correct, but ensure backend receives it
        const updatePayload = { ...payload, newFiles: newlyUploadedFiles };
        const res = await axios.put(
          `/api/dockets/${formData._id}`,
          updatePayload
        );

        console.log(res);

        setRecords((prev) =>
          prev.map((r) => (r._id === formData._id ? res.data.data : r))
        );
        setSelectedRecord(res.data.data);
        setFormData((prev) => ({ ...prev, files: res.data.data.files }));

        toast.success("Updated successfully");
      } else {
        // CREATE
        payload.files = newlyUploadedFiles;
        const res = await axios.post(`/api/dockets`, payload);
        console.log(res);

        setRecords((prev) => [res.data.data, ...prev]);
        setTotalRecords((prev) => prev + 1);
        updateStats("dockets", 1);
        toast.success("Created successfully");
      }

      setShowModal(false);
      // ✅ FIX: Clear uploaded files here
      setNewlyUploadedFiles([]);
      setSelectedFiles([]);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Error saving record");
    } finally {
      setIsSubmitting(false); // Re-enable button
    }
  };

  const handleReplica = (record) => {
    const { _id, createdAt, updatedAt, __v, ...replicaData } = record;

    // Ensure date fields aren't literal nulls before setting state
    const cleanedData = { ...replicaData };
    if (cleanedData.pct_application_date === null)
      cleanedData.pct_application_date = "";
    if (cleanedData.due_date === null) cleanedData.due_date = "";
    if (cleanedData.filling_date === null) cleanedData.filling_date = "";
    if (cleanedData.instruction_date === null)
      cleanedData.instruction_date = "";

    setFormData({
      ...cleanedData,
      docket_no: replicaData.docket_no + "_copy",
    });
    setShowModal(true);
  };

  const handleDelete = (id) => {
    setDeleteTaskId(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(`/api/dockets/${deleteTaskId}`);
      // Update local state instead of fetching
      setRecords((prev) => prev.filter((r) => r._id !== deleteTaskId));
      setTotalRecords((prev) => prev - 1);
      updateStats("dockets", -1);
      toast.success("Deleted successfully");
      setViewMode("dashboard");
      setSelectedRecord(null);
    } catch (err) {
      if (!import.meta.env.PROD) {
        console.error("Delete failed", err);
      }
      toast.error(
        err?.response?.data?.message || "Some occurred. Please try again."
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
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "2-digit",
    });
  };

  const handleDownloadFile = async (fileKey, filename) => {
    try {
      const res = await axios.get(
        `/api/dockets/download-url?fileKey=${encodeURIComponent(fileKey)}`
      );
      const link = document.createElement("a");
      link.href = res.data.downloadUrl;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error("File not found or access denied");
    }
  };

  const handleDeleteFile = async (docketId, fileIdOrKey) => {
    if (!window.confirm("Delete this file?")) return;
    try {
      const res = await axios.delete(
        `/api/dockets/${docketId}/file/${encodeURIComponent(fileIdOrKey)}`
      );
      if (selectedRecord && selectedRecord._id === docketId) {
        setSelectedRecord(res.data.data);
      }
      setRecords((prev) =>
        prev.map((r) => (r._id === docketId ? res.data.data : r))
      );
      toast.success("File deleted");
    } catch (err) {
      toast.error("Failed to delete file");
    }
  };

  // --- UPDATED RENDER FUNCTION (Uses FileItem) ---
  // Must be inside DocketPage to access handlers
  const renderFileList = (files, allowDelete = false, docketId = null) => {
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
        {files.map((file) => (
          // ✅ FIX: Use file.key or file._id as key
          <FileItem
            key={file.key || file._id}
            file={file}
            docketId={docketId}
            allowDelete={allowDelete}
            onDownload={handleDownloadFile}
            onDelete={handleDeleteFile}
          />
        ))}
      </div>
    );
  };

  // Add after confirmDelete function (around line 240)
  const handleExport = (exportAll = false) => {
    const dataToExport = records;

    if (dataToExport.length === 0) {
      toast.error("No data to export");
      return;
    }

    const exportData = dataToExport.map((r, index) => {
      // 1. Find the client object in the clients array that matches the ID in the record
      const client = clients.find((c) => c._id === r.client_id);

      // 2. Use the client name if found, otherwise fallback to the ID or empty string
      const clientDisplayName = client ? client.name : r.client_id || "";

      return {
        "Sr No": index + 1,
        "Instruction Date": r.instruction_date
          ? new Date(r.instruction_date).toLocaleDateString()
          : "",
        "anovIP Ref No": r.docket_no || "",
        "Client Name": clientDisplayName, // Updated this line
        Service: r.service_name || "",
        "Client Ref No": r.client_ref || "",
        Currency: r.currency || "",
        "AnovIP Fee": r.anovipfee || "",
        "Associate Fee": r.associatefee || "",
        "Official Fee": r.officialfee || "",
        "Total Fee": r.fee || "",
        "SPOC Name": r.spoc_name || "",
        "Phone No": r.phone_no || "",
        "Firm Name": r.firm_name || "",
        Country: r.country || "",
        Email: r.email || "",
        Address: r.address || "",
        "Application Status": r.application_status || "",
        "Due Date": r.due_date ? new Date(r.due_date).toLocaleDateString() : "",
        "Application Type": r.application_type || "",
        "Filing Country": r.filling_country || "",
        "Filing Date": r.filling_date
          ? new Date(r.filling_date).toLocaleDateString()
          : "",
        "Application No": r.application_no || "",
        "Applicant Type": r.applicant_type || "",
        Title: r.title || "",
        "Associate Ref No": r.associate_ref_no || "",
        "Associate SPOC Name": r.associate_spoc_name || "",
        "Associate Phone No": r.associate_phone_no || "",
        "Associate Firm Name": r.associate_firm_name || "",
        "Associate Country": r.associate_country || "",
        "Associate Email": r.associate_email || "",
        "Associate Address": r.associate_address || "",
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dockets");

    // Auto-size columns
    const colWidths = Object.keys(exportData[0] || {}).map((key) => ({
      wch: Math.max(key.length, 15),
    }));
    ws["!cols"] = colWidths;

    XLSX.writeFile(
      wb,
      `dockets_export_${new Date().toISOString().split("T")[0]}.xlsx`
    );
    toast.success(`Exported ${exportData.length} records successfully`);
  };

  // Add after handleExport function
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
            instruction_date: parseExcelDate(row["Instruction Date"]),
            docket_no: row["anovIP Ref No"] || row["Docket No"] || "",
            client_name: row["Client Name"] || "", // ✅ For lookup
            client_email: row["Client Email"] || "", // ✅ Alternative lookup
            service_name: row["Service"] || "",
            client_ref: row["Client Ref No"] || "",
            currency: row["Currency"] || "",
            anovipfee: row["AnovIP Fee"] || "",
            associatefee: row["Associate Fee"] || "",
            officialfee: row["Official Fee"] || "",
            fee: row["Total Fee"] || "",
            spoc_name: row["SPOC Name"] || "",
            phone_no: row["Phone No"] || "",
            firm_name: row["Firm Name"] || "",
            country: row["Country"] || "",
            email: row["Email"] || "",
            address: row["Address"] || "",
            application_status: row["Application Status"] || "",
            due_date: parseExcelDate(row["Due Date"]),
            application_type: row["Application Type"] || "",
            filling_country: row["Filing Country"] || "",
            filling_date: parseExcelDate(row["Filing Date"]),
            application_no: row["Application No"] || "",
            applicant_type: row["Applicant Type"] || "",
            title: row["Title"] || "",
            status: "docket",
          }));

          // Send to bulk import API
          const res = await axios.post("/api/dockets/bulk-import", {
            dockets: mappedData,
          });

          toast.success(
            `Successfully imported ${
              res.data.imported || mappedData.length
            } records`
          );
          fetchDockets(); // Refresh the list
          updateStats("dockets", res.data.imported || mappedData.length);
        } catch (err) {
          console.error("Import error:", err);

          const data = err?.response?.data;

          // 1️⃣ Show summary message
          if (data?.message) {
            toast.error(data.message);
          }

          // 2️⃣ Show row-level errors
          if (Array.isArray(data?.errors)) {
            data.errors.forEach((e) => {
              toast.error(
                `Row ${e.row} | Docket: ${e.docket_no || "N/A"} — ${e.error}`,
                { autoClose: 8000 }
              );
            });
          } else {
            // Fallback
            toast.error(
              err?.message ||
                "Import failed. Please check the file and try again."
            );
          }

          setImporting(false);
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
  // Improved helper function to parse Excel dates
  const parseExcelDate = (value) => {
    if (!value) return "";

    // If it's already a Date object
    if (value instanceof Date) {
      return value.toISOString().split("T")[0];
    }

    // If it's an Excel serial number (number)
    if (typeof value === "number") {
      // Excel serial date: days since 1899-12-30
      // But Excel has a bug treating 1900 as leap year, so adjust
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const msPerDay = 24 * 60 * 60 * 1000;
      const date = new Date(excelEpoch.getTime() + value * msPerDay);
      return date.toISOString().split("T")[0];
    }

    // If it's a string
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return "";

      // Try different date formats

      // Format: DD/MM/YYYY or DD-MM-YYYY
      const ddmmyyyy = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
      if (ddmmyyyy) {
        const [, day, month, year] = ddmmyyyy;
        const date = new Date(year, month - 1, day);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split("T")[0];
        }
      }

      // Format: MM/DD/YYYY or MM-DD-YYYY
      const mmddyyyy = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
      if (mmddyyyy) {
        const [, month, day, year] = mmddyyyy;
        const date = new Date(year, month - 1, day);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split("T")[0];
        }
      }

      // Format: YYYY-MM-DD or YYYY/MM/DD
      const yyyymmdd = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
      if (yyyymmdd) {
        const [, year, month, day] = yyyymmdd;
        const date = new Date(year, month - 1, day);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split("T")[0];
        }
      }

      // Try native Date parsing as fallback
      const parsed = new Date(trimmed);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split("T")[0];
      }
    }

    console.warn("Could not parse date:", value, typeof value);
    return "";
  };

  // Download template function
  const downloadTemplate = () => {
    const templateData = [
      {
        "Instruction Date": "2025-01-01",
        "anovIP Ref No": "SAMPLE-001",
        "Client Name": "Your Client Name Here", // ✅ Required for lookup
        Service: "Filing of Patent Application",
        "Client Ref No": "",
        Currency: "USD",
        "AnovIP Fee": "",
        "Associate Fee": "",
        "Official Fee": "",
        "Total Fee": "",
        "SPOC Name": "",
        "Phone No": "",
        "Firm Name": "",
        Country: "",
        Email: "",
        Address: "",
        "Application Status": "",
        "Due Date": "",
        "Application Type": "",
        "Filing Country": "",
        "Filing Date": "",
        "Application No": "",
        "Applicant Type": "",
        Title: "",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");

    const colWidths = Object.keys(templateData[0]).map((key) => ({
      wch: Math.max(key.length, 18),
    }));
    ws["!cols"] = colWidths;

    XLSX.writeFile(wb, "docket_import_template.xlsx");
    toast.success("Template downloaded");
  };

  const totalPages = Math.ceil(totalRecords / recordsPerPage);
  const canGoNext = currentPage < totalPages;
  const canGoPrev = currentPage > 1;
  return (
    <div style={styles.container}>
      {viewMode === "dashboard" ? (
        <>
          <StatsRow />
          {/* DOCKET TABLE CARD */}
          <div style={styles.tableCard}>
            {/* Header with Title and Filters */}
            <div style={styles.tableHeaderRow}>
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
                  placeholder=""
                  value={filters.docket_no}
                  onChange={handleFilterChange}
                />
              </div>
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>Service Name</label>
                <select
                  name="service_name"
                  style={styles.filterInput}
                  value={filters.service_name}
                  onChange={handleFilterChange}
                >
                  <option value="">All Services</option>
                  <option value="Filing of Patent Application">
                    Filing of Patent Application
                  </option>
                  <option value="Drafting of Patent Application">
                    Drafting of Patent Application
                  </option>
                  <option value="Drafting & Filing of Patent Application">
                    Drafting & Filing of Patent Application
                  </option>
                  <option value="Drafting of a Response to the Examination Report">
                    Drafting of a Response to the Examination Report
                  </option>
                  <option value="Drafting & Filing of a Response to the Examination Report">
                    Drafting & Filing of a Response to the Examination Report
                  </option>
                  <option value="Payment of Annuity">Payment of Annuity</option>
                  <option value="Filing of Request for Examination">
                    Filing of Request for Examination
                  </option>
                  <option value="Taking over Representation">
                    Taking over Representation
                  </option>
                  <option value="Filing of Working Statement">
                    Filing of Working Statement
                  </option>
                  <option value="Filing of Foreign Filing License (FFL)">
                    Filing of Foreign Filing License (FFL)
                  </option>
                </select>
              </div>
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>Country</label>
                <input
                  type="text"
                  name="filling_country"
                  style={styles.filterInput}
                  placeholder=""
                  value={filters.filling_country}
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
              {/* Add after "View All" button, before closing </div> of tableHeaderRow */}

              {/* Hidden file input for import */}
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                accept=".xlsx,.xls"
                onChange={handleImport}
              />

              {/* Import Button */}
              <button
                style={styles.importBtn}
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
              >
                <Upload size={16} />
                {importing ? "Importing..." : "Import"}
              </button>

              {/* Export Dropdown */}
              <div style={{ position: "relative", display: "inline-block" }}>
                <button
                  style={styles.exportBtn}
                  onClick={() => handleExport(false)}
                >
                  <Download size={16} />
                  Export
                </button>
              </div>

              {/* Download Template */}
              <button style={styles.templateBtn} onClick={downloadTemplate}>
                Template
              </button>
              {/* <button style={styles.viewAllBtn}>View All</button> */}
            </div>

            {/* Table */}
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Sr no.</th>
                    <th style={styles.th}>Instruction Date</th>
                    <th style={styles.th}>anovIP Ref.Number</th>
                    <th style={styles.th}>Application Number</th>
                    <th style={styles.th}>Application Type</th>
                    <th style={styles.th}>Date of Filing</th>
                    <th style={styles.th}>Country of Filing</th>
                    <th style={styles.th}>Status</th>
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
                  ) : records.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={styles.tdCenter}>
                        No records found
                      </td>
                    </tr>
                  ) : (
                    records.map((r, index) => (
                      <tr key={r._id} style={styles.tr}>
                        <td style={styles.td}>
                          {(currentPage - 1) * recordsPerPage + index + 1}
                        </td>
                        <td style={styles.td}>
                          {formatDate(r.instruction_date)}
                        </td>
                        <td style={styles.td}>{r.docket_no}</td>
                        <td style={styles.td}>{r.application_no}</td>
                        <td style={styles.td}>{r.application_type}</td>
                        <td style={styles.td}>{formatDate(r.filling_date)}</td>
                        <td style={styles.td}>{r.filling_country}</td>
                        <td style={styles.td}>{r.application_status}</td>
                        <td style={styles.td}>
                          {r.created_by
                            ? r.created_by.name || r.created_by.email
                            : "System"}
                        </td>
                        <td style={styles.td}>
                          <span
                            style={styles.viewLink}
                            onClick={() => {
                              setSelectedRecord(r);
                              setViewMode("detail");
                              setDetailTab("view");
                              setCameFromExternal(false); // Internal navigation
                            }}
                          >
                            View{" "}
                            <span style={styles.viewIcon}>
                              <Eye style={{ scale: "0.7" }}></Eye>
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
                  disabled={currentPage === 1}
                  style={{
                    ...styles.pageBtn,

                    opacity: !canGoPrev ? 0.5 : 1,
                    cursor: !canGoPrev ? "not-allowed" : "pointer",
                  }}
                >
                  ←
                </button>
                {Array.from(
                  { length: Math.min(3, totalPages || 1) },
                  (_, i) => i + 1
                ).map((p) => (
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
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
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
        </>
      ) : (
        /* DETAIL VIEW */
        <div style={styles.modalOverlay}>
          <div style={styles.detailCard}>
            <div style={styles.detailHeader}>
              <div style={styles.tabsContainer}>
                <button
                  style={{
                    ...styles.tabBtn,
                    ...(detailTab === "view" ? styles.tabBtnActive : {}),
                  }}
                  onClick={() => setDetailTab("view")}
                >
                  View
                </button>
                <button
                  style={{
                    ...styles.tabBtn,
                    ...(detailTab === "edit" ? styles.tabBtnActive : {}),
                  }}
                  onClick={() => setDetailTab("edit")}
                >
                  Edit
                </button>
              </div>
              <button
                style={styles.closeBtn}
                onClick={() => {
                  if (cameFromExternal) {
                    // Came from Dashboard - go back to Dashboard
                    navigate(-1);
                  } else {
                    // Opened from DocketPage table - go back to list
                    setViewMode("dashboard");
                    setSelectedRecord(null);
                  }
                  setCameFromExternal(false);
                }}
              >
                ✕
              </button>
            </div>
            <div style={styles.detailBody}>
              {detailTab === "view" ? (
                <div>
                  <h4 style={{ margin: "0 0 20px 0", color: "#111827" }}>
                    {selectedRecord?.title || "No Title"}
                  </h4>

                  {/* SERVICES SECTION */}
                  <div style={{ marginBottom: "25px" }}>
                    <h6
                      style={{
                        color: "#374151",
                        borderBottom: "2px solid #e5e7eb",
                        paddingBottom: "8px",
                        marginBottom: "15px",
                      }}
                    >
                      Services
                    </h6>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "12px",
                      }}
                    >
                      <p style={styles.detailRow}>
                        <strong>Instruction Date:</strong>{" "}
                        {formatDate(selectedRecord?.instruction_date)}
                      </p>
                      <p style={styles.detailRow}>
                        <strong>anovIP Ref. No.:</strong>{" "}
                        {selectedRecord?.docket_no || "-"}
                      </p>
                      <p style={styles.detailRow}>
                        <strong>Service:</strong>{" "}
                        {selectedRecord?.service_name || "-"}
                      </p>
                      <p style={styles.detailRow}>
                        <strong>Client Ref. No.:</strong>{" "}
                        {selectedRecord?.client_ref || "-"}
                      </p>
                      <p style={styles.detailRow}>
                        <strong>Currency:</strong>{" "}
                        {selectedRecord?.currency || "-"}
                      </p>
                      <p style={styles.detailRow}>
                        <strong>AnovIP Fee:</strong>{" "}
                        {selectedRecord?.anovipfee || 0}
                      </p>
                      <p style={styles.detailRow}>
                        <strong>Associate Fee:</strong>{" "}
                        {selectedRecord?.associatefee || 0}
                      </p>
                      <p style={styles.detailRow}>
                        <strong>Official Fee:</strong>{" "}
                        {selectedRecord?.officialfee || 0}
                      </p>
                      <p style={styles.detailRow}>
                        <strong>Total Fee:</strong> {selectedRecord?.fee || 0}{" "}
                        {selectedRecord?.currency}
                      </p>
                    </div>
                  </div>

                  {/* CLIENT DETAILS SECTION */}
                  <div style={{ marginBottom: "25px" }}>
                    <h6
                      style={{
                        color: "#374151",
                        borderBottom: "2px solid #e5e7eb",
                        paddingBottom: "8px",
                        marginBottom: "15px",
                      }}
                    >
                      Client Details
                    </h6>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "12px",
                      }}
                    >
                      <p style={styles.detailRow}>
                        <strong>SPOC Name:</strong>{" "}
                        {selectedRecord?.spoc_name || "-"}
                      </p>
                      <p style={styles.detailRow}>
                        <strong>Phone No:</strong>{" "}
                        {selectedRecord?.phone_no || "-"}
                      </p>
                      <p style={styles.detailRow}>
                        <strong>Firm Name:</strong>{" "}
                        {selectedRecord?.firm_name || "-"}
                      </p>
                      <p style={styles.detailRow}>
                        <strong>Country:</strong>{" "}
                        {selectedRecord?.country || "-"}
                      </p>
                      <p style={styles.detailRow}>
                        <strong>Email:</strong> {selectedRecord?.email || "-"}
                      </p>
                      <p style={styles.detailRow}>
                        <strong>Address:</strong>{" "}
                        {selectedRecord?.address || "-"}
                      </p>
                    </div>
                  </div>

                  {/* ASSOCIATE DETAILS SECTION */}
                  <div style={{ marginBottom: "25px" }}>
                    <h6
                      style={{
                        color: "#374151",
                        borderBottom: "2px solid #e5e7eb",
                        paddingBottom: "8px",
                        marginBottom: "15px",
                      }}
                    >
                      Associate Details
                    </h6>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "12px",
                      }}
                    >
                      <p style={styles.detailRow}>
                        <strong>Associate Ref. No.:</strong>{" "}
                        {selectedRecord?.associate_ref_no || "-"}
                      </p>
                      <p style={styles.detailRow}>
                        <strong>Associate SPOC Name:</strong>{" "}
                        {selectedRecord?.associate_spoc_name || "-"}
                      </p>
                      <p style={styles.detailRow}>
                        <strong>Associate Phone No.:</strong>{" "}
                        {selectedRecord?.associate_phone_no || "-"}
                      </p>
                      <p style={styles.detailRow}>
                        <strong>Associate Firm Name:</strong>{" "}
                        {selectedRecord?.associate_firm_name || "-"}
                      </p>
                      <p style={styles.detailRow}>
                        <strong>Associate Country:</strong>{" "}
                        {selectedRecord?.associate_country || "-"}
                      </p>
                      <p style={styles.detailRow}>
                        <strong>Associate Email:</strong>{" "}
                        {selectedRecord?.associate_email || "-"}
                      </p>
                      <p style={styles.detailRow}>
                        <strong>Associate Address:</strong>{" "}
                        {selectedRecord?.associate_address || "-"}
                      </p>
                    </div>
                  </div>

                  {/* STATUS SECTION */}
                  <div style={{ marginBottom: "25px" }}>
                    <h6
                      style={{
                        color: "#374151",
                        borderBottom: "2px solid #e5e7eb",
                        paddingBottom: "8px",
                        marginBottom: "15px",
                      }}
                    >
                      Status
                    </h6>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "12px",
                      }}
                    >
                      <p style={styles.detailRow}>
                        <strong>Application Status:</strong>{" "}
                        <span style={styles.statusBadgeDetail}>
                          {selectedRecord?.application_status || "-"}
                        </span>
                      </p>
                      <p style={styles.detailRow}>
                        <strong>Deadline/Due Date:</strong>{" "}
                        {formatDate(selectedRecord?.due_date)}
                      </p>
                      <p style={styles.detailRow}>
                        <strong>Application Number:</strong>{" "}
                        {selectedRecord?.application_number || "-"}
                      </p>
                    </div>
                  </div>

                  {/* APPLICATION DETAILS SECTION */}
                  <div style={{ marginBottom: "25px" }}>
                    <h6
                      style={{
                        color: "#374151",
                        borderBottom: "2px solid #e5e7eb",
                        paddingBottom: "8px",
                        marginBottom: "15px",
                      }}
                    >
                      Application Details
                    </h6>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "12px",
                      }}
                    >
                      <p style={styles.detailRow}>
                        <strong>Application Type:</strong>{" "}
                        {selectedRecord?.application_type || "-"}
                      </p>
                      <p style={styles.detailRow}>
                        <strong>Filing Country:</strong>{" "}
                        {selectedRecord?.filling_country || "-"}
                      </p>
                      <p style={styles.detailRow}>
                        <strong>Filing Date:</strong>{" "}
                        {formatDate(selectedRecord?.filling_date)}
                      </p>
                      <p style={styles.detailRow}>
                        <strong>PCT/Application No.:</strong>{" "}
                        {selectedRecord?.application_no || "-"}
                      </p>
                      <p style={styles.detailRow}>
                        <strong>Corresponding Application No.:</strong>{" "}
                        {selectedRecord?.corresponding_application_no || "-"}
                      </p>
                      <p style={styles.detailRow}>
                        <strong>Applicant Type:</strong>{" "}
                        {selectedRecord?.applicant_type || "-"}
                      </p>
                      <p style={styles.detailRow}>
                        <strong>Title:</strong> {selectedRecord?.title || "-"}
                      </p>
                      <p style={styles.detailRow}>
                        <strong>PCT Application Date:</strong>{" "}
                        {formatDate(selectedRecord?.pct_application_date)}
                      </p>
                      <p style={styles.detailRow}>
                        <strong>Field of Invention:</strong>{" "}
                        {selectedRecord?.field_of_invention || "-"}
                      </p>
                    </div>
                  </div>

                  {/* APPLICANTS SECTION */}
                  {selectedRecord?.applicants?.length > 0 && (
                    <div style={{ marginBottom: "25px" }}>
                      <h6
                        style={{
                          color: "#374151",
                          borderBottom: "2px solid #e5e7eb",
                          paddingBottom: "8px",
                          marginBottom: "15px",
                        }}
                      >
                        Applicant Names and Nationalities
                      </h6>
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          fontSize: "14px",
                        }}
                      >
                        <thead>
                          <tr style={{ backgroundColor: "#f3f4f6" }}>
                            <th
                              style={{
                                padding: "10px",
                                textAlign: "left",
                                border: "1px solid #e5e7eb",
                              }}
                            >
                              #
                            </th>
                            <th
                              style={{
                                padding: "10px",
                                textAlign: "left",
                                border: "1px solid #e5e7eb",
                              }}
                            >
                              Name
                            </th>
                            <th
                              style={{
                                padding: "10px",
                                textAlign: "left",
                                border: "1px solid #e5e7eb",
                              }}
                            >
                              Nationality
                            </th>
                            <th
                              style={{
                                padding: "10px",
                                textAlign: "left",
                                border: "1px solid #e5e7eb",
                              }}
                            >
                              Country Residence
                            </th>
                            <th
                              style={{
                                padding: "10px",
                                textAlign: "left",
                                border: "1px solid #e5e7eb",
                              }}
                            >
                              Address
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedRecord.applicants.map((applicant, index) => (
                            <tr key={index}>
                              <td
                                style={{
                                  padding: "10px",
                                  border: "1px solid #e5e7eb",
                                }}
                              >
                                {index + 1}
                              </td>
                              <td
                                style={{
                                  padding: "10px",
                                  border: "1px solid #e5e7eb",
                                }}
                              >
                                {applicant.name || "-"}
                              </td>
                              <td
                                style={{
                                  padding: "10px",
                                  border: "1px solid #e5e7eb",
                                }}
                              >
                                {applicant.nationality || "-"}
                              </td>
                              <td
                                style={{
                                  padding: "10px",
                                  border: "1px solid #e5e7eb",
                                }}
                              >
                                {applicant.country_residence || "-"}
                              </td>
                              <td
                                style={{
                                  padding: "10px",
                                  border: "1px solid #e5e7eb",
                                }}
                              >
                                {applicant.address || "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* INVENTORS SECTION */}
                  {selectedRecord?.inventors?.length > 0 && (
                    <div style={{ marginBottom: "25px" }}>
                      <h6
                        style={{
                          color: "#374151",
                          borderBottom: "2px solid #e5e7eb",
                          paddingBottom: "8px",
                          marginBottom: "15px",
                        }}
                      >
                        Inventor Names and Countries
                      </h6>
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          fontSize: "14px",
                        }}
                      >
                        <thead>
                          <tr style={{ backgroundColor: "#f3f4f6" }}>
                            <th
                              style={{
                                padding: "10px",
                                textAlign: "left",
                                border: "1px solid #e5e7eb",
                              }}
                            >
                              #
                            </th>
                            <th
                              style={{
                                padding: "10px",
                                textAlign: "left",
                                border: "1px solid #e5e7eb",
                              }}
                            >
                              Name
                            </th>
                            <th
                              style={{
                                padding: "10px",
                                textAlign: "left",
                                border: "1px solid #e5e7eb",
                              }}
                            >
                              Country
                            </th>
                            <th
                              style={{
                                padding: "10px",
                                textAlign: "left",
                                border: "1px solid #e5e7eb",
                              }}
                            >
                              Nationality
                            </th>
                            <th
                              style={{
                                padding: "10px",
                                textAlign: "left",
                                border: "1px solid #e5e7eb",
                              }}
                            >
                              Address
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedRecord.inventors.map((inventor, index) => (
                            <tr key={index}>
                              <td
                                style={{
                                  padding: "10px",
                                  border: "1px solid #e5e7eb",
                                }}
                              >
                                {index + 1}
                              </td>
                              <td
                                style={{
                                  padding: "10px",
                                  border: "1px solid #e5e7eb",
                                }}
                              >
                                {inventor.name || "-"}
                              </td>
                              <td
                                style={{
                                  padding: "10px",
                                  border: "1px solid #e5e7eb",
                                }}
                              >
                                {inventor.country || "-"}
                              </td>
                              <td
                                style={{
                                  padding: "10px",
                                  border: "1px solid #e5e7eb",
                                }}
                              >
                                {inventor.nationality || "-"}
                              </td>
                              <td
                                style={{
                                  padding: "10px",
                                  border: "1px solid #e5e7eb",
                                }}
                              >
                                {inventor.address || "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* PRIORITIES SECTION */}
                  {selectedRecord?.priorities?.length > 0 && (
                    <div style={{ marginBottom: "25px" }}>
                      <h6
                        style={{
                          color: "#374151",
                          borderBottom: "2px solid #e5e7eb",
                          paddingBottom: "8px",
                          marginBottom: "15px",
                        }}
                      >
                        Priority Names and Countries
                      </h6>
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          fontSize: "14px",
                        }}
                      >
                        <thead>
                          <tr style={{ backgroundColor: "#f3f4f6" }}>
                            <th
                              style={{
                                padding: "10px",
                                textAlign: "left",
                                border: "1px solid #e5e7eb",
                              }}
                            >
                              #
                            </th>
                            <th
                              style={{
                                padding: "10px",
                                textAlign: "left",
                                border: "1px solid #e5e7eb",
                              }}
                            >
                              Country
                            </th>
                            <th
                              style={{
                                padding: "10px",
                                textAlign: "left",
                                border: "1px solid #e5e7eb",
                              }}
                            >
                              Priority Number
                            </th>
                            <th
                              style={{
                                padding: "10px",
                                textAlign: "left",
                                border: "1px solid #e5e7eb",
                              }}
                            >
                              Priority Date
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedRecord.priorities.map((priority, index) => (
                            <tr key={index}>
                              <td
                                style={{
                                  padding: "10px",
                                  border: "1px solid #e5e7eb",
                                }}
                              >
                                {index + 1}
                              </td>
                              <td
                                style={{
                                  padding: "10px",
                                  border: "1px solid #e5e7eb",
                                }}
                              >
                                {priority.country || "-"}
                              </td>
                              <td
                                style={{
                                  padding: "10px",
                                  border: "1px solid #e5e7eb",
                                }}
                              >
                                {priority.number || "-"}
                              </td>
                              <td
                                style={{
                                  padding: "10px",
                                  border: "1px solid #e5e7eb",
                                }}
                              >
                                {formatDate(priority.date)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* FILES/DOCUMENTS SECTION */}
                  {/* FILES/DOCUMENTS SECTION - UPDATED FOR S3 */}
                  {(selectedRecord?.files?.length > 0 ||
                    selectedRecord?.file_images?.length > 0) && (
                    <div style={{ marginBottom: "25px" }}>
                      <h6
                        style={{
                          color: "#374151",
                          borderBottom: "2px solid #e5e7eb",
                          paddingBottom: "8px",
                          marginBottom: "15px",
                        }}
                      >
                        Documents
                      </h6>

                      {/* 1. Render S3 Files (New System) */}
                      {selectedRecord?.files?.length > 0 &&
                        renderFileList(selectedRecord.files, false)}

                      {/* 2. Fallback for Old Local Files (Optional: keep if you have old data) */}
                      {selectedRecord?.file_images?.length > 0 && (
                        <div
                          style={{
                            display: "flex",
                            gap: "10px",
                            flexWrap: "wrap",
                            marginTop: "10px",
                          }}
                        >
                          {selectedRecord.file_images.map((file, index) => (
                            <div
                              key={index}
                              style={{
                                border: "1px solid #ddd",
                                padding: "5px 10px",
                                borderRadius: "4px",
                              }}
                            >
                              <a
                                href={`/api/uploads/${file}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {file} (Legacy)
                              </a>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ACTION BUTTONS */}
                  <div
                    style={{ marginTop: "30px", display: "flex", gap: "10px" }}
                  >
                    <button
                      style={styles.actionBtn}
                      onClick={() => setDetailTab("edit")}
                    >
                      Edit
                    </button>
                    <button
                      style={styles.replicaBtn}
                      onClick={() => handleReplica(selectedRecord)}
                    >
                      Replica
                    </button>
                    <button
                      style={styles.deleteBtn}
                      onClick={() => {
                        handleDelete(selectedRecord._id);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSubmit(e);
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "30px",
                    }}
                  >
                    {/* LEFT COLUMN */}
                    <div>
                      <h6 style={styles.sectionTitle}>Services</h6>
                      <div style={styles.formGrid}>
                        <div style={styles.formGroup}>
                          <label style={styles.formLabel}>
                            Instruction Date
                          </label>
                          <input
                            type="date"
                            name="instruction_date"
                            style={styles.formInput}
                            required
                            value={
                              selectedRecord?.instruction_date
                                ? selectedRecord.instruction_date.split("T")[0]
                                : ""
                            }
                            onChange={(e) =>
                              setSelectedRecord({
                                ...selectedRecord,
                                instruction_date: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.formLabel}>
                            anovIP Ref. No.
                          </label>
                          <input
                            type="text"
                            name="docket_no"
                            style={styles.formInput}
                            required
                            value={selectedRecord?.docket_no || ""}
                            onChange={(e) =>
                              setSelectedRecord({
                                ...selectedRecord,
                                docket_no: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div
                          style={{ ...styles.formGroup, gridColumn: "span 2" }}
                        >
                          <label style={styles.formLabel}>Service</label>
                          <select
                            name="service_name"
                            style={styles.formSelect}
                            value={selectedRecord?.service_name || ""}
                            onChange={(e) =>
                              setSelectedRecord({
                                ...selectedRecord,
                                service_name: e.target.value,
                              })
                            }
                          >
                            <option value="">Select</option>
                            <option value="Filing of Patent Application">
                              Filing of Patent Application
                            </option>
                            <option value="Drafting of Patent Application">
                              Drafting of Patent Application
                            </option>
                            <option value="Drafting & Filing of Patent Application">
                              Drafting & Filing of Patent Application
                            </option>
                            <option value="Drafting of a Response to the Examination Report">
                              Drafting of a Response to the Examination Report
                            </option>
                            <option value="Drafting & Filing of a Response to the Examination Report">
                              Drafting & Filing of a Response to the Examination
                              Report
                            </option>
                            <option value="Payment of Annuity">
                              Payment of Annuity
                            </option>
                            <option value="Filing of Request for Examination">
                              Filing of Request for Examination
                            </option>
                            <option value="Taking over Representation">
                              Taking over Representation
                            </option>
                            <option value="Filing of Working Statement">
                              Filing of Working Statement
                            </option>
                            <option value="Filing of Foreign Filing License (FFL)">
                              Filing of Foreign Filing License (FFL)
                            </option>
                          </select>
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.formLabel}>
                            Client Ref. No.
                          </label>
                          <input
                            type="text"
                            name="client_ref"
                            style={styles.formInput}
                            value={selectedRecord?.client_ref || ""}
                            onChange={(e) =>
                              setSelectedRecord({
                                ...selectedRecord,
                                client_ref: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.formLabel}>Currency</label>
                          <select
                            name="currency"
                            style={styles.formSelect}
                            value={selectedRecord?.currency || ""}
                            onChange={(e) =>
                              setSelectedRecord({
                                ...selectedRecord,
                                currency: e.target.value,
                              })
                            }
                          >
                            <option value="">Select</option>
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                            <option value="INR">INR</option>
                          </select>
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.formLabel}>AnovIP Fee</label>
                          <input
                            type="text"
                            name="anovipfee"
                            style={styles.formInput}
                            value={selectedRecord?.anovipfee || ""}
                            onChange={(e) =>
                              setSelectedRecord({
                                ...selectedRecord,
                                anovipfee: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.formLabel}>Associate Fee</label>
                          <input
                            type="text"
                            name="associatefee"
                            style={styles.formInput}
                            value={selectedRecord?.associatefee || ""}
                            onChange={(e) =>
                              setSelectedRecord({
                                ...selectedRecord,
                                associatefee: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.formLabel}>Official Fee</label>
                          <input
                            type="text"
                            name="officialfee"
                            style={styles.formInput}
                            value={selectedRecord?.officialfee || ""}
                            onChange={(e) =>
                              setSelectedRecord({
                                ...selectedRecord,
                                officialfee: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.formLabel}>Total Fee</label>
                          <input
                            type="text"
                            name="fee"
                            style={{
                              ...styles.formInput,
                              backgroundColor: "#f3f4f6",
                            }}
                            readOnly
                            value={selectedRecord?.fee || ""}
                          />
                        </div>
                      </div>

                      {/* CLIENT DETAILS */}
                      <h6 style={{ ...styles.sectionTitle, marginTop: "25px" }}>
                        Client Details
                      </h6>
                      <div style={styles.formGrid}>
                        <div style={styles.formGroup}>
                          <label style={styles.formLabel}>SPOC Name</label>
                          <input
                            type="text"
                            name="spoc_name"
                            style={styles.formInput}
                            value={selectedRecord?.spoc_name || ""}
                            onChange={(e) =>
                              setSelectedRecord({
                                ...selectedRecord,
                                spoc_name: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.formLabel}>Phone No</label>
                          <input
                            type="text"
                            name="phone_no"
                            style={styles.formInput}
                            value={selectedRecord?.phone_no || ""}
                            onChange={(e) =>
                              setSelectedRecord({
                                ...selectedRecord,
                                phone_no: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.formLabel}>Firm Name</label>
                          <input
                            type="text"
                            name="firm_name"
                            style={styles.formInput}
                            value={selectedRecord?.firm_name || ""}
                            onChange={(e) =>
                              setSelectedRecord({
                                ...selectedRecord,
                                firm_name: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.formLabel}>Country</label>
                          <input
                            type="text"
                            name="country"
                            style={styles.formInput}
                            value={selectedRecord?.country || ""}
                            onChange={(e) =>
                              setSelectedRecord({
                                ...selectedRecord,
                                country: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div
                          style={{ ...styles.formGroup, gridColumn: "span 2" }}
                        >
                          <label style={styles.formLabel}>Email Id</label>
                          <input
                            type="email"
                            name="email"
                            style={styles.formInput}
                            value={selectedRecord?.email || ""}
                            onChange={(e) =>
                              setSelectedRecord({
                                ...selectedRecord,
                                email: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div
                          style={{ ...styles.formGroup, gridColumn: "span 2" }}
                        >
                          <label style={styles.formLabel}>Address</label>
                          <input
                            type="text"
                            name="address"
                            style={styles.formInput}
                            value={selectedRecord?.address || ""}
                            onChange={(e) =>
                              setSelectedRecord({
                                ...selectedRecord,
                                address: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                      <hr
                        style={{
                          borderTop: "5px solid rgb(249, 115, 22)",
                          opacity: "1",
                        }}
                      />
                      {/* ASSOCIATE DETAILS - NEW SECTION */}
                      <h6 style={{ ...styles.sectionTitle, marginTop: "25px" }}>
                        Associate Details
                      </h6>
                      <div style={styles.formGrid}>
                        <div
                          style={{ ...styles.formGroup, gridColumn: "span 2" }}
                        >
                          <label style={styles.formLabel}>
                            Associate Ref. No.
                          </label>
                          <input
                            type="text"
                            name="associate_ref_no"
                            style={styles.formInput}
                            value={selectedRecord?.associate_ref_no || ""}
                            onChange={(e) =>
                              setSelectedRecord({
                                ...selectedRecord,
                                associate_ref_no: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.formLabel}>
                            Associate SPOC Name
                          </label>
                          <input
                            type="text"
                            name="associate_spoc_name"
                            style={styles.formInput}
                            value={selectedRecord?.associate_spoc_name || ""}
                            onChange={(e) =>
                              setSelectedRecord({
                                ...selectedRecord,
                                associate_spoc_name: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.formLabel}>
                            Associate Phone No.
                          </label>
                          <input
                            type="text"
                            name="associate_phone_no"
                            style={styles.formInput}
                            value={selectedRecord?.associate_phone_no || ""}
                            onChange={(e) =>
                              setSelectedRecord({
                                ...selectedRecord,
                                associate_phone_no: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.formLabel}>
                            Associate Firm Name
                          </label>
                          <input
                            type="text"
                            name="associate_firm_name"
                            style={styles.formInput}
                            value={selectedRecord?.associate_firm_name || ""}
                            onChange={(e) =>
                              setSelectedRecord({
                                ...selectedRecord,
                                associate_firm_name: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.formLabel}>
                            Associate Country
                          </label>
                          <input
                            type="text"
                            name="associate_country"
                            style={styles.formInput}
                            value={selectedRecord?.associate_country || ""}
                            onChange={(e) =>
                              setSelectedRecord({
                                ...selectedRecord,
                                associate_country: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div
                          style={{ ...styles.formGroup, gridColumn: "span 2" }}
                        >
                          <label style={styles.formLabel}>
                            Associate Email
                          </label>
                          <input
                            type="email"
                            name="associate_email"
                            style={styles.formInput}
                            value={selectedRecord?.associate_email || ""}
                            onChange={(e) =>
                              setSelectedRecord({
                                ...selectedRecord,
                                associate_email: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div
                          style={{ ...styles.formGroup, gridColumn: "span 2" }}
                        >
                          <label style={styles.formLabel}>
                            Associate Address
                          </label>
                          <input
                            type="text"
                            name="associate_address"
                            style={styles.formInput}
                            value={selectedRecord?.associate_address || ""}
                            onChange={(e) =>
                              setSelectedRecord({
                                ...selectedRecord,
                                associate_address: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {/* RIGHT COLUMN */}
                    <div>
                      <h6 style={styles.sectionTitle}>Status</h6>
                      <div style={styles.formGrid}>
                        <div style={styles.formGroup}>
                          <label style={styles.formLabel}>
                            Application Status
                          </label>
                          <select
                            name="application_status"
                            style={styles.formSelect}
                            value={selectedRecord?.application_status || ""}
                            onChange={(e) =>
                              setSelectedRecord({
                                ...selectedRecord,
                                application_status: e.target.value,
                              })
                            }
                          >
                            <option value="">Select</option>
                            <option value="Inactive">Inactive</option>
                            <option value="In-Process">In-Process</option>
                            <option value="Filed">Filed</option>
                            <option value="Published">Published</option>
                            <option value="Examination due">
                              Examination due
                            </option>
                            <option value="Examination filed">
                              Examination filed
                            </option>
                            <option value="FER Issued">FER Issued</option>
                            <option value="Response to FER filed">
                              Response to FER filed
                            </option>
                            <option value="Hearing Issued">
                              Hearing Issued
                            </option>
                            <option value="Response to Hearing filed">
                              Response to Hearing filed
                            </option>
                            <option value="Granted">Granted</option>
                          </select>
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.formLabel}>
                            Deadline/Due Date
                          </label>
                          <input
                            type="date"
                            name="due_date"
                            style={styles.formInput}
                            value={
                              selectedRecord?.due_date
                                ? selectedRecord.due_date.split("T")[0]
                                : ""
                            }
                            onChange={(e) =>
                              setSelectedRecord({
                                ...selectedRecord,
                                due_date: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.formLabel}>
                            Application Number
                          </label>
                          <input
                            type="text"
                            name="application_number"
                            style={styles.formInput}
                            value={selectedRecord?.application_number || ""}
                            onChange={(e) =>
                              setSelectedRecord({
                                ...selectedRecord,
                                application_number: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>

                      {/* APPLICATION DETAILS */}
                      <h6 style={{ ...styles.sectionTitle, marginTop: "25px" }}>
                        Application Details
                      </h6>
                      <div style={styles.formGrid}>
                        <div style={styles.formGroup}>
                          <label style={styles.formLabel}>
                            Application Type
                          </label>
                          <select
                            name="application_type"
                            style={styles.formSelect}
                            value={selectedRecord?.application_type || ""}
                            onChange={(e) =>
                              setSelectedRecord({
                                ...selectedRecord,
                                application_type: e.target.value,
                              })
                            }
                          >
                            <option value="">Select</option>
                            <option value="Provisional">Provisional</option>
                            <option value="Ordinary">Ordinary</option>
                            <option value="Conventional">Conventional</option>
                            <option value="PCT-NP">PCT-NP</option>
                            <option value="Ordinary-Addition">
                              Ordinary-Addition
                            </option>
                            <option value="Conventional-Addition">
                              Conventional-Addition
                            </option>
                            <option value="PCT-NP-Addition">
                              PCT-NP-Addition
                            </option>
                            <option value="Ordinary-Divisional">
                              Ordinary-Divisional
                            </option>
                            <option value="Conventional-Divisional">
                              Conventional-Divisional
                            </option>
                            <option value="PCT-NP-Divisional">
                              PCT-NP-Divisional
                            </option>
                            <option value="others">others</option>
                          </select>
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.formLabel}>Filing Country</label>
                          <input
                            type="text"
                            name="filling_country"
                            style={styles.formInput}
                            value={selectedRecord?.filling_country || ""}
                            onChange={(e) =>
                              setSelectedRecord({
                                ...selectedRecord,
                                filling_country: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.formLabel}>Filing Date</label>
                          <input
                            type="date"
                            name="filling_date"
                            style={styles.formInput}
                            value={
                              selectedRecord?.filling_date
                                ? selectedRecord.filling_date.split("T")[0]
                                : ""
                            }
                            onChange={(e) =>
                              setSelectedRecord({
                                ...selectedRecord,
                                filling_date: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.formLabel}>
                            PCT/Application No.
                          </label>
                          <input
                            type="text"
                            name="application_no"
                            style={styles.formInput}
                            value={selectedRecord?.application_no || ""}
                            onChange={(e) =>
                              setSelectedRecord({
                                ...selectedRecord,
                                application_no: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.formLabel}>
                            Corresponding Application No.
                          </label>
                          <input
                            type="text"
                            name="corresponding_application_no"
                            style={styles.formInput}
                            value={
                              selectedRecord?.corresponding_application_no || ""
                            }
                            onChange={(e) =>
                              setSelectedRecord({
                                ...selectedRecord,
                                corresponding_application_no: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.formLabel}>Applicant Type</label>
                          <select
                            name="applicant_type"
                            style={styles.formSelect}
                            value={selectedRecord?.applicant_type || ""}
                            onChange={(e) =>
                              setSelectedRecord({
                                ...selectedRecord,
                                applicant_type: e.target.value,
                              })
                            }
                          >
                            <option value="">Select Status</option>
                            <option value="Natural person">
                              Natural person
                            </option>
                            <option value="Start-up">Start-up</option>
                            <option value="Small entity">Small entity</option>
                            <option value="Educational institution">
                              Educational institution
                            </option>
                            <option value="Others">Others</option>
                          </select>
                        </div>
                        <div
                          style={{ ...styles.formGroup, gridColumn: "span 2" }}
                        >
                          <label style={styles.formLabel}>Title</label>
                          <input
                            type="text"
                            name="title"
                            style={styles.formInput}
                            value={selectedRecord?.title || ""}
                            onChange={(e) =>
                              setSelectedRecord({
                                ...selectedRecord,
                                title: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.formLabel}>
                            PCT Application Date
                          </label>
                          <input
                            type="date"
                            name="pct_application_date"
                            style={styles.formInput}
                            value={
                              selectedRecord?.pct_application_date
                                ? selectedRecord.pct_application_date.split(
                                    "T"
                                  )[0]
                                : ""
                            }
                            onChange={(e) =>
                              setSelectedRecord({
                                ...selectedRecord,
                                pct_application_date: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.formLabel}>
                            Field of Invention
                          </label>
                          <input
                            type="text"
                            name="field_of_invention"
                            style={styles.formInput}
                            value={selectedRecord?.field_of_invention || ""}
                            onChange={(e) =>
                              setSelectedRecord({
                                ...selectedRecord,
                                field_of_invention: e.target.value,
                              })
                            }
                          />
                        </div>

                        {/* FILE PREVIEW */}
                        {selectedRecord?.file_images?.length > 0 && (
                          <div
                            style={{
                              display: "flex",
                              gap: "12px",
                              flexWrap: "wrap",
                              gridColumn: "span 2",
                            }}
                          >
                            {selectedRecord.file_images.map((file, index) => {
                              const isImage =
                                /\.(jpg|jpeg|png|gif|webp)$/i.test(file);
                              const fileName = file.split("/").pop();
                              const fileUrl = `/api/uploads/${file}`;
                              return (
                                <div
                                  key={index}
                                  style={{
                                    border: "1px solid #ddd",
                                    padding: "8px",
                                    borderRadius: "6px",
                                  }}
                                >
                                  {isImage ? (
                                    <img
                                      src={fileUrl}
                                      alt="preview"
                                      style={{
                                        width: "100px",
                                        height: "100px",
                                        objectFit: "cover",
                                      }}
                                    />
                                  ) : (
                                    <a
                                      href={fileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      download
                                      style={{
                                        textDecoration: "none",
                                        color: "#0d6efd",
                                      }}
                                    >
                                      📄 {fileName}
                                      <br />
                                      <small>Click to open / download</small>
                                    </a>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div
                          style={{ ...styles.formGroup, gridColumn: "span 2" }}
                        >
                          <div
                            style={{
                              ...styles.formGroup,
                              gridColumn: "span 2",
                            }}
                          >
                            <label style={styles.formLabel}>Documents</label>

                            {/* 1. Show Existing Files (from DB) using selectedRecord */}
                            {selectedRecord.files &&
                              selectedRecord.files.length > 0 && (
                                <div style={{ marginBottom: "8px" }}>
                                  <small style={{ color: "#666" }}>
                                    Existing:
                                  </small>
                                  {/* ✅ FIX: Pass selectedRecord.files and selectedRecord._id */}
                                  {renderFileList(
                                    selectedRecord.files,
                                    true, // Allow delete
                                    selectedRecord._id
                                  )}
                                </div>
                              )}

                            {/* 2. Show Newly Uploaded (Pending Save) */}
                            {newlyUploadedFiles.length > 0 && (
                              <div style={{ marginBottom: "8px" }}>
                                <small style={{ color: "green" }}>
                                  Ready to save:
                                </small>
                                {renderFileList(newlyUploadedFiles, false)}
                              </div>
                            )}

                            {/* 3. Uppy Button */}
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
                      </div>
                    </div>
                  </div>

                  {/* PART 2 - FULL WIDTH SECTIONS */}
                  <div style={{ marginTop: "30px" }}>
                    {/* APPLICANT NAMES AND NATIONALITIES */}
                    <h6 style={styles.sectionTitle}>
                      Applicant Names and Nationalities
                    </h6>
                    {(selectedRecord?.applicants || []).map(
                      (applicant, index) => (
                        <div
                          key={index}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr 1fr 1fr auto",
                            gap: "15px",
                            marginBottom: "15px",
                            alignItems: "end",
                          }}
                        >
                          <div style={styles.formGroup}>
                            <label style={styles.formLabel}>
                              Applicant Name
                            </label>
                            <input
                              type="text"
                              style={styles.formInput}
                              value={applicant.name || ""}
                              onChange={(e) => {
                                const updated = [
                                  ...(selectedRecord.applicants || []),
                                ];
                                updated[index] = {
                                  ...updated[index],
                                  name: e.target.value,
                                };
                                setSelectedRecord({
                                  ...selectedRecord,
                                  applicants: updated,
                                });
                              }}
                            />
                          </div>
                          <div style={styles.formGroup}>
                            <label style={styles.formLabel}>
                              Applicant Nationality
                            </label>
                            <input
                              type="text"
                              style={styles.formInput}
                              value={applicant.nationality || ""}
                              onChange={(e) => {
                                const updated = [
                                  ...(selectedRecord.applicants || []),
                                ];
                                updated[index] = {
                                  ...updated[index],
                                  nationality: e.target.value,
                                };
                                setSelectedRecord({
                                  ...selectedRecord,
                                  applicants: updated,
                                });
                              }}
                            />
                          </div>
                          <div style={styles.formGroup}>
                            <label style={styles.formLabel}>
                              Applicant Country Residence
                            </label>
                            <input
                              type="text"
                              style={styles.formInput}
                              value={applicant.country_residence || ""}
                              onChange={(e) => {
                                const updated = [
                                  ...(selectedRecord.applicants || []),
                                ];
                                updated[index] = {
                                  ...updated[index],
                                  country_residence: e.target.value,
                                };
                                setSelectedRecord({
                                  ...selectedRecord,
                                  applicants: updated,
                                });
                              }}
                            />
                          </div>
                          <div style={styles.formGroup}>
                            <label style={styles.formLabel}>
                              Applicant Address
                            </label>
                            <input
                              type="text"
                              style={styles.formInput}
                              value={applicant.address || ""}
                              onChange={(e) => {
                                const updated = [
                                  ...(selectedRecord.applicants || []),
                                ];
                                updated[index] = {
                                  ...updated[index],
                                  address: e.target.value,
                                };
                                setSelectedRecord({
                                  ...selectedRecord,
                                  applicants: updated,
                                });
                              }}
                            />
                          </div>
                          <button
                            type="button"
                            style={{
                              backgroundColor: "#ef4444",
                              color: "white",
                              border: "none",
                              padding: "10px 20px",
                              borderRadius: "6px",
                              cursor: "pointer",
                            }}
                            onClick={() => {
                              const updated = (
                                selectedRecord.applicants || []
                              ).filter((_, i) => i !== index);
                              setSelectedRecord({
                                ...selectedRecord,
                                applicants: updated,
                              });
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      )
                    )}
                    <button
                      type="button"
                      style={{
                        backgroundColor: "#10b981",
                        color: "white",
                        border: "none",
                        padding: "10px 20px",
                        borderRadius: "6px",
                        cursor: "pointer",
                        marginBottom: "20px",
                      }}
                      onClick={() => {
                        const updated = [
                          ...(selectedRecord?.applicants || []),
                          {
                            name: "",
                            nationality: "",
                            country_residence: "",
                            address: "",
                          },
                        ];
                        setSelectedRecord({
                          ...selectedRecord,
                          applicants: updated,
                        });
                      }}
                    >
                      Add Applicant
                    </button>

                    {/* INVENTOR NAMES AND COUNTRIES */}
                    <h6 style={{ ...styles.sectionTitle, marginTop: "25px" }}>
                      Inventor Names and Countries
                    </h6>
                    {(selectedRecord?.inventors || []).map(
                      (inventor, index) => (
                        <div
                          key={index}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr 1fr 1fr auto",
                            gap: "15px",
                            marginBottom: "15px",
                            alignItems: "end",
                          }}
                        >
                          <div style={styles.formGroup}>
                            <label style={styles.formLabel}>
                              Inventor Name
                            </label>
                            <input
                              type="text"
                              style={styles.formInput}
                              value={inventor.name || ""}
                              onChange={(e) => {
                                const updated = [
                                  ...(selectedRecord.inventors || []),
                                ];
                                updated[index] = {
                                  ...updated[index],
                                  name: e.target.value,
                                };
                                setSelectedRecord({
                                  ...selectedRecord,
                                  inventors: updated,
                                });
                              }}
                            />
                          </div>
                          <div style={styles.formGroup}>
                            <label style={styles.formLabel}>
                              Inventor Country
                            </label>
                            <input
                              type="text"
                              style={styles.formInput}
                              value={inventor.country || ""}
                              onChange={(e) => {
                                const updated = [
                                  ...(selectedRecord.inventors || []),
                                ];
                                updated[index] = {
                                  ...updated[index],
                                  country: e.target.value,
                                };
                                setSelectedRecord({
                                  ...selectedRecord,
                                  inventors: updated,
                                });
                              }}
                            />
                          </div>
                          <div style={styles.formGroup}>
                            <label style={styles.formLabel}>
                              Inventor Nationality
                            </label>
                            <input
                              type="text"
                              style={styles.formInput}
                              value={inventor.nationality || ""}
                              onChange={(e) => {
                                const updated = [
                                  ...(selectedRecord.inventors || []),
                                ];
                                updated[index] = {
                                  ...updated[index],
                                  nationality: e.target.value,
                                };
                                setSelectedRecord({
                                  ...selectedRecord,
                                  inventors: updated,
                                });
                              }}
                            />
                          </div>
                          <div style={styles.formGroup}>
                            <label style={styles.formLabel}>
                              Inventor Address
                            </label>
                            <input
                              type="text"
                              style={styles.formInput}
                              value={inventor.address || ""}
                              onChange={(e) => {
                                const updated = [
                                  ...(selectedRecord.inventors || []),
                                ];
                                updated[index] = {
                                  ...updated[index],
                                  address: e.target.value,
                                };
                                setSelectedRecord({
                                  ...selectedRecord,
                                  inventors: updated,
                                });
                              }}
                            />
                          </div>
                          <button
                            type="button"
                            style={{
                              backgroundColor: "#ef4444",
                              color: "white",
                              border: "none",
                              padding: "10px 20px",
                              borderRadius: "6px",
                              cursor: "pointer",
                            }}
                            onClick={() => {
                              const updated = (
                                selectedRecord.inventors || []
                              ).filter((_, i) => i !== index);
                              setSelectedRecord({
                                ...selectedRecord,
                                inventors: updated,
                              });
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      )
                    )}
                    <button
                      type="button"
                      style={{
                        backgroundColor: "#10b981",
                        color: "white",
                        border: "none",
                        padding: "10px 20px",
                        borderRadius: "6px",
                        cursor: "pointer",
                        marginBottom: "20px",
                      }}
                      onClick={() => {
                        const updated = [
                          ...(selectedRecord?.inventors || []),
                          {
                            name: "",
                            country: "",
                            nationality: "",
                            address: "",
                          },
                        ];
                        setSelectedRecord({
                          ...selectedRecord,
                          inventors: updated,
                        });
                      }}
                    >
                      Add Inventor
                    </button>

                    {/* PRIORITY NAMES AND COUNTRIES */}
                    <h6 style={{ ...styles.sectionTitle, marginTop: "25px" }}>
                      Priority Names and Countries
                    </h6>
                    {(selectedRecord?.priorities || []).map(
                      (priority, index) => (
                        <div
                          key={index}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr 1fr auto",
                            gap: "15px",
                            marginBottom: "15px",
                            alignItems: "end",
                          }}
                        >
                          <div style={styles.formGroup}>
                            <label style={styles.formLabel}>
                              Priority Country
                            </label>
                            <input
                              type="text"
                              style={styles.formInput}
                              value={priority.country || ""}
                              onChange={(e) => {
                                const updated = [
                                  ...(selectedRecord.priorities || []),
                                ];
                                updated[index] = {
                                  ...updated[index],
                                  country: e.target.value,
                                };
                                setSelectedRecord({
                                  ...selectedRecord,
                                  priorities: updated,
                                });
                              }}
                            />
                          </div>
                          <div style={styles.formGroup}>
                            <label style={styles.formLabel}>
                              Priority Number
                            </label>
                            <input
                              type="text"
                              style={styles.formInput}
                              value={priority.number || ""}
                              onChange={(e) => {
                                const updated = [
                                  ...(selectedRecord.priorities || []),
                                ];
                                updated[index] = {
                                  ...updated[index],
                                  number: e.target.value,
                                };
                                setSelectedRecord({
                                  ...selectedRecord,
                                  priorities: updated,
                                });
                              }}
                            />
                          </div>
                          <div style={styles.formGroup}>
                            <label style={styles.formLabel}>
                              Priority Date
                            </label>
                            <input
                              type="date"
                              style={styles.formInput}
                              value={
                                priority.date ? priority.date.split("T")[0] : ""
                              }
                              onChange={(e) => {
                                const updated = [
                                  ...(selectedRecord.priorities || []),
                                ];
                                updated[index] = {
                                  ...updated[index],
                                  date: e.target.value,
                                };
                                setSelectedRecord({
                                  ...selectedRecord,
                                  priorities: updated,
                                });
                              }}
                            />
                          </div>
                          <button
                            type="button"
                            style={{
                              backgroundColor: "#ef4444",
                              color: "white",
                              border: "none",
                              padding: "10px 20px",
                              borderRadius: "6px",
                              cursor: "pointer",
                            }}
                            onClick={() => {
                              const updated = (
                                selectedRecord.priorities || []
                              ).filter((_, i) => i !== index);
                              setSelectedRecord({
                                ...selectedRecord,
                                priorities: updated,
                              });
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      )
                    )}
                    <button
                      type="button"
                      style={{
                        backgroundColor: "#10b981",
                        color: "white",
                        border: "none",
                        padding: "10px 20px",
                        borderRadius: "6px",
                        cursor: "pointer",
                      }}
                      onClick={() => {
                        const updated = [
                          ...(selectedRecord?.priorities || []),
                          { country: "", number: "", date: "" },
                        ];
                        setSelectedRecord({
                          ...selectedRecord,
                          priorities: updated,
                        });
                      }}
                    >
                      Add Priority
                    </button>
                  </div>

                  {/* SUBMIT BUTTONS */}
                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      marginTop: "25px",
                      alignItems: "end",
                    }}
                  >
                    {/* Find this button inside the detail view form submission area */}
                    <button
                      type="submit"
                      disabled={isUploading} // DISABLE IF UPLOADING
                      style={{
                        ...styles.submitBtn,
                        opacity: isUploading ? 0.6 : 1, // DIM BUTTON
                        cursor: isUploading ? "not-allowed" : "pointer",
                      }}
                      onClick={async (e) => {
                        e.preventDefault();
                        try {
                          // ✅ FIX: Create a payload that includes the new files
                          const updatePayload = {
                            ...selectedRecord,
                            newFiles: newlyUploadedFiles, // Pass the Uppy files here
                          };

                          const res = await axios.put(
                            `/api/dockets/${selectedRecord._id}`,
                            updatePayload
                          );

                          // Access res.data.data - not res.data
                          const updatedRecord = res.data.data;

                          // Update records list
                          setRecords((prev) =>
                            prev.map((r) =>
                              r._id === selectedRecord._id ? updatedRecord : r
                            )
                          );

                          // Update selected record for view
                          setSelectedRecord(updatedRecord);

                          // ✅ FIX: Clear the uploaded files state
                          setNewlyUploadedFiles([]);
                          setDetailTab("view");

                          toast.success("Updated successfully");
                        } catch (err) {
                          if (!import.meta.env.PROD) {
                            console.error("Error updating", err);
                          }
                          toast.error(
                            err?.response?.data?.message ||
                              "Some occurred. Please try again."
                          );
                        }
                      }}
                    >
                      {isSubmitting
                        ? "Updating..."
                        : isUploading
                        ? "Uploading Files..."
                        : "Update"}
                    </button>
                    <button
                      type="button"
                      style={{
                        ...styles.viewAllBtn,
                        flex: "none",
                        padding: "14px 30px",
                      }}
                      onClick={() => setDetailTab("view")}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
      <DeleteConfirmModal
        show={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        message="Are you sure you want to delete this task?"
      />
      {/* CREATE/EDIT MODAL */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h5 style={{ margin: 0, fontSize: "18px", fontWeight: "600" }}>
                {formData._id ? "Edit Docket" : "Create Docket"}
              </h5>
              <button
                style={styles.modalCloseBtn}
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>
            <form style={styles.modalBody} onSubmit={handleSubmit}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "30px",
                }}
              >
                {/* LEFT COLUMN */}
                <div>
                  <h6 style={styles.sectionTitle}>Services</h6>
                  <div style={styles.formGrid}>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Instruction Date</label>
                      <input
                        type="date"
                        name="instruction_date"
                        style={styles.formInput}
                        required
                        value={
                          formData.instruction_date
                            ? formData.instruction_date.split("T")[0]
                            : ""
                        }
                        onChange={handleInputChange}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>anovIP Ref. No.</label>
                      <input
                        type="text"
                        name="docket_no"
                        style={styles.formInput}
                        required
                        value={formData.docket_no}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div style={{ ...styles.formGroup, gridColumn: "span 2" }}>
                      <label style={styles.formLabel}>Client</label>
                      <select
                        name="client_id"
                        style={styles.formSelect}
                        value={formData.client_id}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">Select Client</option>

                        {clients.map((client) => (
                          <option key={client._id} value={client._id}>
                            {client.name}
                          </option>
                        ))}
                      </select>
                      <Link to="/create">Client not exist? Add Client</Link>

                      <label style={styles.formLabel}>Service</label>
                      <select
                        name="service_name"
                        style={styles.formSelect}
                        value={formData.service_name}
                        onChange={handleInputChange}
                      >
                        <option value="">Select</option>
                        <option value="Filing of Patent Application">
                          Filing of Patent Application
                        </option>
                        <option value="Drafting of Patent Application">
                          Drafting of Patent Application
                        </option>
                        <option value="Drafting & Filing of Patent Application">
                          Drafting & Filing of Patent Application
                        </option>
                        <option value="Drafting of a Response to the Examination Report">
                          Drafting of a Response to the Examination Report
                        </option>
                        <option value="Drafting & Filing of a Response to the Examination Report">
                          Drafting & Filing of a Response to the Examination
                          Report
                        </option>
                        <option value="Payment of Annuity">
                          Payment of Annuity
                        </option>
                        <option value="Filing of Request for Examination">
                          Filing of Request for Examination
                        </option>
                        <option value="Taking over Representation">
                          Taking over Representation
                        </option>
                        <option value="Filing of Working Statement">
                          Filing of Working Statement
                        </option>
                        <option value="Filing of Foreign Filing License (FFL)">
                          Filing of Foreign Filing License (FFL)
                        </option>
                      </select>
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Client Ref. No.</label>
                      <input
                        type="text"
                        name="client_ref"
                        style={styles.formInput}
                        value={formData.client_ref}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Currency</label>
                      <select
                        name="currency"
                        style={styles.formSelect}
                        value={formData.currency}
                        onChange={handleInputChange}
                      >
                        <option value="">Select</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="INR">INR</option>
                      </select>
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>AnovIP Fee</label>
                      <input
                        type="text"
                        name="anovipfee"
                        style={styles.formInput}
                        value={formData.anovipfee}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Associate Fee</label>
                      <input
                        type="text"
                        name="associatefee"
                        style={styles.formInput}
                        value={formData.associatefee}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Official Fee</label>
                      <input
                        type="text"
                        name="officialfee"
                        style={styles.formInput}
                        value={formData.officialfee}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Total Fee</label>
                      <input
                        type="text"
                        name="fee"
                        style={{
                          ...styles.formInput,
                          backgroundColor: "#f3f4f6",
                        }}
                        readOnly
                        value={formData.fee}
                      />
                    </div>
                  </div>

                  <h6 style={{ ...styles.sectionTitle, marginTop: "25px" }}>
                    Client Details
                  </h6>
                  <div style={styles.formGrid}>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>SPOC Name</label>
                      <input
                        type="text"
                        name="spoc_name"
                        style={styles.formInput}
                        value={formData.spoc_name}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Phone No</label>
                      <input
                        type="text"
                        name="phone_no"
                        style={styles.formInput}
                        value={formData.phone_no}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Firm Name</label>
                      <input
                        type="text"
                        name="firm_name"
                        style={styles.formInput}
                        value={formData.firm_name}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div style={{ ...styles.formGroup, position: "relative" }}>
                      <label style={styles.formLabel}>Country</label>
                      <input
                        type="text"
                        name="country"
                        style={styles.formInput}
                        autoComplete="off"
                        value={formData.country}
                        onChange={handleInputChange}
                      />
                      {suggestions1.length > 0 && (
                        <div style={styles.suggestionBox}>
                          {suggestions1.map((s, i) => (
                            <div
                              key={i}
                              style={styles.suggestionItem}
                              onClick={() => selectSuggestion("country", s)}
                            >
                              {s.code} {s.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ ...styles.formGroup, gridColumn: "span 2" }}>
                      <label style={styles.formLabel}>Email Id</label>
                      <input
                        type="email"
                        name="email"
                        style={styles.formInput}
                        value={formData.email}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div style={{ ...styles.formGroup, gridColumn: "span 2" }}>
                      <label style={styles.formLabel}>Address</label>
                      <input
                        type="text"
                        name="address"
                        style={styles.formInput}
                        value={formData.address}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN */}
                <div>
                  <h6 style={styles.sectionTitle}>Status</h6>
                  <div style={styles.formGrid}>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Application Status</label>
                      <select
                        name="application_status"
                        style={styles.formSelect}
                        value={formData.application_status}
                        onChange={handleInputChange}
                      >
                        <option value="">Select</option>
                        <option value="Inactive">Inactive</option>
                        <option value="In-Process">In-Process</option>
                        <option value="Filed">Filed</option>
                        <option value="Published">Published</option>
                        <option value="Examination due">Examination due</option>
                        <option value="Examination filed">
                          Examination filed
                        </option>
                        <option value="FER Issued">FER Issued</option>
                        <option value="Response to FER filed">
                          Response to FER filed
                        </option>
                        <option value="Hearing Issued">Hearing Issued</option>
                        <option value="Response to Hearing filed">
                          Response to Hearing filed
                        </option>
                        <option value="Granted">Granted</option>
                      </select>
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Deadline/Due Date</label>
                      <input
                        type="date"
                        name="due_date"
                        style={styles.formInput}
                        value={
                          formData.due_date
                            ? formData.due_date.split("T")[0]
                            : ""
                        }
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <h6 style={{ ...styles.sectionTitle, marginTop: "25px" }}>
                    Application Details
                  </h6>
                  <div style={styles.formGrid}>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Application Type</label>
                      <select
                        name="application_type"
                        style={styles.formSelect}
                        value={formData.application_type}
                        onChange={handleInputChange}
                      >
                        <option value="">Select</option>
                        <option value="Provisional">Provisional</option>
                        <option value="Ordinary">Ordinary</option>
                        <option value="Conventional">Conventional</option>
                        <option value="PCT-NP">PCT-NP</option>
                        <option value="Ordinary-Addition">
                          Ordinary-Addition
                        </option>
                        <option value="Conventional-Addition">
                          Conventional-Addition
                        </option>
                        <option value="PCT-NP-Addition">PCT-NP-Addition</option>
                        <option value="Ordinary-Divisional">
                          Ordinary-Divisional
                        </option>
                        <option value="Conventional-Divisional">
                          Conventional-Divisional
                        </option>
                        <option value="PCT-NP-Divisional">
                          PCT-NP-Divisional
                        </option>
                        <option value="others">others</option>
                      </select>
                    </div>
                    <div style={{ ...styles.formGroup, position: "relative" }}>
                      <label style={styles.formLabel}>Filing Country</label>
                      <input
                        type="text"
                        name="filling_country"
                        style={styles.formInput}
                        autoComplete="off"
                        value={formData.filling_country}
                        onChange={handleInputChange}
                      />
                      {suggestions.length > 0 && (
                        <div style={styles.suggestionBox}>
                          {suggestions.map((s, i) => (
                            <div
                              key={i}
                              style={styles.suggestionItem}
                              onClick={() =>
                                selectSuggestion("filling_country", s)
                              }
                            >
                              {s.code} {s.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Filing Date</label>
                      <input
                        type="date"
                        name="filling_date"
                        style={styles.formInput}
                        value={
                          formData.filling_date
                            ? formData.filling_date.split("T")[0]
                            : ""
                        }
                        onChange={handleInputChange}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>
                        PCT/Application No.
                      </label>
                      <input
                        type="text"
                        name="application_no"
                        style={styles.formInput}
                        value={formData.application_no}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div style={{ ...styles.formGroup, gridColumn: "span 2" }}>
                      <label style={styles.formLabel}>Applicant Type</label>
                      <select
                        name="applicant_type"
                        style={styles.formSelect}
                        value={formData.applicant_type}
                        onChange={handleInputChange}
                      >
                        <option value="">Select Status</option>
                        <option value="Natural person">Natural person</option>
                        <option value="Start-up">Start-up</option>
                        <option value="Small entity">Small entity</option>
                        <option value="Educational institution">
                          Educational institution
                        </option>
                        <option value="Others">Others</option>
                      </select>
                    </div>
                    <div style={{ ...styles.formGroup, gridColumn: "span 2" }}>
                      <label style={styles.formLabel}>Title</label>
                      <input
                        type="text"
                        name="title"
                        style={styles.formInput}
                        value={formData.title}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div style={{ ...styles.formGroup, gridColumn: "span 2" }}>
                      <div
                        style={{ ...styles.formGroup, gridColumn: "span 2" }}
                      >
                        <label style={styles.formLabel}>Documents</label>

                        {/* 1. Show Existing Files (from DB) */}
                        {formData.files && formData.files.length > 0 && (
                          <div style={{ marginBottom: "8px" }}>
                            <small style={{ color: "#666" }}>Existing:</small>
                            {renderFileList(formData.files, true, formData._id)}
                          </div>
                        )}

                        {/* 2. Show Newly Uploaded (Pending Save) */}
                        {newlyUploadedFiles.length > 0 && (
                          <div style={{ marginBottom: "8px" }}>
                            <small style={{ color: "green" }}>
                              Ready to save:
                            </small>
                            {renderFileList(newlyUploadedFiles, false)}
                          </div>
                        )}

                        {/* 3. Uppy Button */}
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
                  </div>
                </div>
              </div>
              {/* Find this button at the bottom of the Create/Edit Modal form */}
              <button
                type="submit"
                style={{
                  ...styles.submitBtn,
                  opacity: isUploading || isSubmitting ? 0.6 : 1,
                  cursor:
                    isUploading || isSubmitting ? "not-allowed" : "pointer",
                }}
                disabled={isUploading || isSubmitting}
              >
                {isSubmitting
                  ? "Submitting..."
                  : isUploading
                  ? "Uploading Files..."
                  : "Submit"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* UPPY MODAL */}
      <DashboardModal
        uppy={uppy}
        open={isUppyModalOpen}
        // 👇 UPDATE THIS FUNCTION
        onRequestClose={() => {
          uppy.cancelAll();
          setIsUppyModalOpen(false);
        }}
        closeModalOnClickOutside={false}
        theme="light"
        note="Files are uploaded immediately. Click 'Submit' to save changes."
      />
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
  tableHeaderRow: {
    display: "flex",
    alignItems: "flex-end", // Aligns buttons with input fields
    justifyContent: "flex-start",
    flexWrap: "wrap", // Allows items to wrap to next line
    gap: "12px", // Consistent spacing between all items
    marginBottom: "20px",
  },

  filterGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    flex: "1 1 200px", // Grow: 1, Shrink: 1, Basis: 200px (Responsive width)
    minWidth: "180px", // Prevents them from getting too small
  },

  filterInput: {
    padding: "8px 12px",
    border: "1px solid #e5e7eb",
    borderRadius: "6px",
    fontSize: "13px",
    width: "100%", // Takes full width of the filterGroup
    outline: "none",
    boxSizing: "border-box", // Ensures padding doesn't increase width
    height: "38px", // Fixed height to match buttons
  },

  // Update button styles slightly to ensure they don't stretch weirdly
  createBtn: {
    padding: "0 20px", // Horizontal padding
    height: "38px", // Match input height
    backgroundColor: "#f97316",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
    whiteSpace: "nowrap", // Prevents text wrapping
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  viewAllBtn: {
    padding: "0 20px",
    height: "38px",
    backgroundColor: "#fff",
    color: "#6b7280",
    border: "1px solid #e5e7eb",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
    whiteSpace: "nowrap",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
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
  detailCard: {
    backgroundColor: "#fff",
    borderRadius: "12px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    width: "90%",
    maxHeight: "97vh",
    overflowY: "auto",
  },
  detailHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "15px 20px",
    borderBottom: "1px solid #f3f4f6",
  },
  tabsContainer: { display: "flex", gap: "5px" },
  tabBtn: {
    padding: "8px 16px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#e5e7eb",
    borderRadius: "6px",
    backgroundColor: "#fff",
    cursor: "pointer",
    fontSize: "13px",
    color: "#6b7280",
  },
  tabBtnActive: {
    backgroundColor: "#f97316",
    color: "#fff",
    borderColor: "#f97316",
  },
  closeBtn: {
    width: "32px",
    height: "32px",
    border: "none",
    borderRadius: "6px",
    backgroundColor: "#fee2e2",
    color: "#ef4444",
    cursor: "pointer",
    fontSize: "14px",
  },
  detailBody: { padding: "50px" },
  detailRow: { margin: "0 0 12px 0", fontSize: "14px", color: "#374151" },
  statusBadgeDetail: {
    padding: "4px 10px",
    backgroundColor: "#dbeafe",
    color: "#1d4ed8",
    borderRadius: "4px",
    fontSize: "12px",
  },
  actionBtn: {
    padding: "10px 20px",
    backgroundColor: "#3b82f6",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontSize: "13px",
    cursor: "pointer",
  },
  replicaBtn: {
    padding: "10px 20px",
    backgroundColor: "#6b7280",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontSize: "13px",
    cursor: "pointer",
  },
  deleteBtn: {
    padding: "10px 20px",
    backgroundColor: "#ef4444",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontSize: "13px",
    cursor: "pointer",
  },
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
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: "12px",
    width: "95%",
    maxWidth: "1100px",
    maxHeight: "95vh",
    display: "flex",
    flexDirection: "column",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px",
    borderBottom: "1px solid #f3f4f6",
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
  modalBody: { padding: "25px", overflowY: "auto", flex: 1 },
  sectionTitle: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#111827",
    margin: "0 0 15px 0",
    paddingBottom: "10px",
    borderBottom: "1px solid #f3f4f6",
  },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" },
  formGroup: { display: "flex", flexDirection: "column", gap: "6px" },
  formLabel: { fontSize: "12px", color: "#6b7280", fontWeight: "500" },
  formInput: {
    padding: "10px 12px",
    border: "1px solid #e5e7eb",
    borderRadius: "6px",
    fontSize: "13px",
    outline: "none",
  },
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
    maxHeight: "150px",
    overflowY: "auto",
    backgroundColor: "#fff",
    zIndex: 10,
    borderRadius: "6px",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
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
  // Add to styles object at the bottom
  importBtn: {
    padding: "10px 16px",
    backgroundColor: "#10b981",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  exportBtn: {
    padding: "10px 16px",
    backgroundColor: "#3b82f6",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  templateBtn: {
    padding: "10px 16px",
    backgroundColor: "#6b7280",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
  },
};

export default DocketPage;
