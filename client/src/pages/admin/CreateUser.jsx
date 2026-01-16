import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import DeleteConfirmModal from "../../components/DeleteConfirmModal";
// Add at the top of the file
import * as XLSX from "xlsx";
import { Upload, Download } from "lucide-react";

export default function UserManagement() {
  const initialFormState = {
    name: "",
    email: "",
    department: "",
    role_id: "",
    status: "active",
  };

  const [createForm, setCreateForm] = useState(initialFormState);
  const [editForm, setEditForm] = useState(initialFormState);
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [editingUserId, setEditingUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetUserId, setResetUserId] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState(null);

  const [importing, setImporting] = useState(false);
  const fileInputRef = React.useRef(null);
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

  useEffect(() => {
    fetchRoles();
    fetchUsers();
  }, []);

  // Reset to first page when users change
  useEffect(() => {
    setCurrentPage(1);
  }, [users.length]);

  const fetchRoles = async () => {
    try {
      const res = await axios.get(`/api/rbac/roles`);
      setRoles(res.data);
    } catch (err) {
      if (!import.meta.env.PROD) console.error("Failed to fetch roles");
      toast.error(
        err?.response?.data?.message || "Something occurred. Please try again."
      );
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`/api/auth/users`);
      setUsers(res.data);
    } catch (err) {
      if (!import.meta.env.PROD) console.error("Failed to fetch users");
      toast.error(
        err?.response?.data?.message || "Something occurred. Please try again."
      );
    }
  };

  const getRoleById = (roleId) => roles.find((r) => r._id === roleId) || null;

  // Pagination calculations
  const totalPages = Math.ceil(users.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = users.slice(indexOfFirstItem, indexOfLastItem);
  const canGoNext = currentPage < totalPages;
  const canGoPrev = currentPage > 1;
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Create User
  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`/api/auth/create`, {
        ...createForm,
        status: "active",
      });
      const newUser = res.data.user || res.data;
      setUsers((prev) => [
        {
          ...createForm,
          ...newUser,
          status: "active",
          role_id: getRoleById(createForm.role_id) || createForm.role_id,
        },
        ...prev,
      ]);
      setCreateForm(initialFormState);
      toast.success(
        <div>
          <p>User created successfully!</p>
          <strong>E-ID:</strong> {res.data.e_id}
          <br />
          <strong>Password:</strong> {res.data.password}
        </div>
      );
    } catch (err) {
      if (!import.meta.env.PROD) console.error("Failed to create user");
      toast.error(
        err?.response?.data?.message || "Something occurred. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Open Edit Modal
  const handleEdit = (user) => {
    setEditForm({
      name: user.name,
      email: user.email,
      department: user.department,
      role_id: user.role_id?._id || user.role_id,
      status: user.status,
    });
    setEditingUserId(user._id);
    setShowEditModal(true);
  };

  // Update User
  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.put(`/api/auth/users/${editingUserId}`, editForm);
      setUsers((prev) =>
        prev.map((u) =>
          u._id === editingUserId
            ? {
                ...u,
                ...editForm,
                role_id: getRoleById(editForm.role_id) || editForm.role_id,
              }
            : u
        )
      );
      setShowEditModal(false);
      setEditingUserId(null);
      setEditForm(initialFormState);
      toast.success("User updated successfully!");
    } catch (err) {
      if (!import.meta.env.PROD) console.error("Failed to update user");
      toast.error(
        err?.response?.data?.message || "Something occurred. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id) => {
    setDeleteUserId(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(`/api/auth/users/${deleteUserId}`);
      setUsers((prev) => prev.filter((u) => u._id !== deleteUserId));
      toast.success("User deleted successfully!");
    } catch (err) {
      if (!import.meta.env.PROD) console.error("Delete failed");
      toast.error(
        err?.response?.data?.message || "Something occurred. Please try again."
      );
    } finally {
      setShowDeleteModal(false);
      setDeleteUserId(null);
    }
  };

  const submitResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    try {
      await axios.post(`/api/auth/reset-password/${resetUserId}`, {
        password: newPassword,
      });
      toast.success("Password updated successfully!");
      setShowResetModal(false);
      setNewPassword("");
      setResetUserId(null);
    } catch (err) {
      if (!import.meta.env.PROD) console.error("Reset failed");
      toast.error(
        err?.response?.data?.message || "Something occurred. Please try again."
      );
    }
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingUserId(null);
    setEditForm(initialFormState);
  };

  // Add after submitResetPassword function
  const handleExport = () => {
    if (users.length === 0) {
      toast.error("No users to export");
      return;
    }

    const exportData = users.map((user, index) => ({
      "#": index + 1,
      Name: user.name || "",
      Email: user.email || "",
      "E-ID": user.e_id || "",
      Department: user.department || "",
      Role: user.role_id?.name || getRoleById(user.role_id)?.name || "",
      Status: user.status || "",
      "Created At": user.createdAt
        ? new Date(user.createdAt).toLocaleDateString()
        : "",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Users");

    // Auto-size columns
    ws["!cols"] = [
      { wch: 5 }, // #
      { wch: 25 }, // Name
      { wch: 30 }, // Email
      { wch: 15 }, // E-ID
      { wch: 20 }, // Department
      { wch: 15 }, // Role
      { wch: 10 }, // Status
      { wch: 15 }, // Created At
    ];

    XLSX.writeFile(
      wb,
      `users_export_${new Date().toISOString().split("T")[0]}.xlsx`
    );
    toast.success(`Exported ${users.length} users successfully`);
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

          console.log("Parsed Excel Data:", jsonData);

          if (jsonData.length === 0) {
            toast.error("No data found in the file");
            setImporting(false);
            return;
          }

          // Map Excel columns to API fields
          const mappedData = jsonData.map((row) => ({
            name: row["Name"] || row["name"] || "",
            email: row["Email"] || row["email"] || "",
            department: row["Department"] || row["department"] || "",
            role_name: row["Role"] || row["role"] || row["Role Name"] || "", // For lookup
            status: row["Status"] || row["status"] || "active",
          }));

          // Send to bulk import API
          const res = await axios.post("/api/auth/bulk-import", {
            users: mappedData,
          });

          const { imported, failed, errors, credentials } = res.data;

          if (imported > 0) {
            toast.success(
              <div>
                <p>Successfully imported {imported} users!</p>
                {credentials && credentials.length > 0 && (
                  <small>Check console for login credentials</small>
                )}
              </div>
            );

            // Log credentials to console for reference
            if (credentials && credentials.length > 0) {
              console.log("=== NEW USER CREDENTIALS ===");
              console.table(credentials);
            }

            fetchUsers(); // Refresh list
          }

          if (failed > 0) {
            toast.warning(`${failed} users failed to import`);
            console.log("Import Errors:", errors);
          }
        } catch (parseError) {
          console.error("Parse error:", parseError);
          toast.error(
            parseError.response?.data?.message ||
              "Error parsing Excel file. Please check the format."
          );
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
      toast.error(err?.response?.data?.message || "Import failed");
      setImporting(false);
    }

    e.target.value = "";
  };

  // Add after handleImport function
  const downloadTemplate = () => {
    // Get role names for reference
    const roleNames = roles.map((r) => r.name).join(", ");

    const templateData = [
      {
        Name: "John Doe",
        Email: "john@example.com",
        Department: "IP Management",
        Role: roles.length > 0 ? roles[0].name : "admin",
        Status: "active",
      },
    ];

    // Instructions sheet
    const instructionsData = [
      { Field: "Name", Required: "Yes", Description: "Full name of the user" },
      {
        Field: "Email",
        Required: "Yes",
        Description: "Valid email address (must be unique)",
      },
      {
        Field: "Department",
        Required: "Yes",
        Description: "IP Management, Research, Legal, Finance, HR",
      },
      {
        Field: "Role",
        Required: "Yes",
        Description: `Available roles: ${roleNames || "admin, user, manager"}`,
      },
      {
        Field: "Status",
        Required: "No",
        Description: "active (default) or inactive",
      },
    ];

    // Roles reference sheet
    const rolesData = roles.map((r, i) => ({
      "#": i + 1,
      "Role Name (Use This)": r.name,
      Description: r.description || "-",
    }));

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wsInstructions = XLSX.utils.json_to_sheet(instructionsData);
    const wsRoles = XLSX.utils.json_to_sheet(rolesData);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.utils.book_append_sheet(wb, wsInstructions, "Instructions");
    XLSX.utils.book_append_sheet(wb, wsRoles, "Valid Roles");

    // Auto-size columns
    ws["!cols"] = [
      { wch: 25 }, // Name
      { wch: 30 }, // Email
      { wch: 20 }, // Department
      { wch: 15 }, // Role
      { wch: 10 }, // Status
    ];

    XLSX.writeFile(wb, "user_import_template.xlsx");
    toast.success(
      "Template downloaded - Check 'Valid Roles' sheet for role names"
    );
  };

  // Add after downloadTemplate function
  const [lastImportCredentials, setLastImportCredentials] = useState([]);

  const downloadCredentials = () => {
    if (lastImportCredentials.length === 0) {
      toast.warning("No credentials to download. Import users first.");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(lastImportCredentials);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Credentials");

    ws["!cols"] = [
      { wch: 25 }, // Name
      { wch: 30 }, // Email
      { wch: 15 }, // E-ID
      { wch: 20 }, // Password
    ];

    XLSX.writeFile(
      wb,
      `user_credentials_${new Date().toISOString().split("T")[0]}.xlsx`
    );
    toast.success("Credentials downloaded");
  };

  return (
    <div className="container mt-4">
      <h3 className="mb-4 text-center">Create User</h3>

      {/* CREATE FORM */}
      <form onSubmit={handleCreate} className="card p-4 shadow mb-4">
        <div className="row g-3">
          <div className="col-md-6">
            <input
              type="text"
              name="name"
              className="form-control"
              placeholder="Full Name"
              value={createForm.name}
              onChange={(e) =>
                setCreateForm({ ...createForm, name: e.target.value })
              }
              required
            />
          </div>
          <div className="col-md-6">
            <input
              type="email"
              name="email"
              className="form-control"
              placeholder="Email"
              value={createForm.email}
              onChange={(e) =>
                setCreateForm({ ...createForm, email: e.target.value })
              }
              required
            />
          </div>
          <div className="col-md-6">
            <select
              name="department"
              className="form-select"
              value={createForm.department}
              onChange={(e) =>
                setCreateForm({ ...createForm, department: e.target.value })
              }
              required
            >
              <option value="">Select Department</option>
              <option value="IP Management">IP Management</option>
              <option value="Research">Research</option>
              <option value="Legal">Legal</option>
              <option value="Finance">Finance</option>
              <option value="HR">HR</option>
            </select>
          </div>
          <div className="col-md-6">
            <select
              name="role_id"
              className="form-select"
              value={createForm.role_id}
              onChange={(e) =>
                setCreateForm({ ...createForm, role_id: e.target.value })
              }
              required
            >
              <option value="">Select Role</option>
              {roles.map((role) => (
                <option key={role._id} value={role._id}>
                  {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12">
            <button className="btn btn-primary w-100" disabled={loading}>
              {loading ? "Creating..." : "Create User"}
            </button>
          </div>
        </div>
      </form>

      {/* USERS TABLE */}
      <div className="card p-4 shadow">
        {/* Replace the existing card header with this */}

        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0">Users</h5>

          <div className="d-flex gap-2">
            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              accept=".xlsx,.xls"
              onChange={handleImport}
            />

            {/* Import Button */}
            <button
              className="btn btn-success btn-sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
            >
              <Upload size={16} className="me-1" />
              {importing ? "Importing..." : "Import"}
            </button>

            {/* Export Button */}
            <button
              className="btn btn-primary btn-sm"
              onClick={handleExport}
              disabled={users.length === 0}
            >
              <Download size={16} className="me-1" />
              Export
            </button>

            {/* Template Button */}
            <button
              className="btn btn-secondary btn-sm"
              onClick={downloadTemplate}
            >
              <Download size={16} className="me-1" />
              Template
            </button>

            {/* Download Credentials (optional) */}
            {lastImportCredentials.length > 0 && (
              <button
                className="btn btn-warning btn-sm"
                onClick={downloadCredentials}
              >
                <Download size={16} className="me-1" />
                Credentials
              </button>
            )}
          </div>
        </div>

        {/* Rest of the table... */}
        <div className="table-responsive">
          <table className="table table-bordered table-hover">
            <thead className="table-light">
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Department</th>
                <th>Role</th>
                <th>Status</th>
                <th width="260">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentUsers.map((user) => (
                <tr key={user._id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.department}</td>
                  <td>
                    {user.role_id?.name ||
                      getRoleById(user.role_id)?.name ||
                      "-"}
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        user.status === "active" ? "bg-success" : "bg-secondary"
                      }`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn btn-sm btn-info me-1"
                      onClick={() => handleEdit(user)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-sm btn-warning me-1"
                      onClick={() => {
                        setResetUserId(user._id);
                        setNewPassword("");
                        setShowResetModal(true);
                      }}
                    >
                      Reset Password
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(user._id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center py-4">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {users.length > 0 && (
          <div className="d-flex justify-content-between align-items-center">
            <div className="text-muted" style={{ fontSize: "14px" }}>
              Showing <strong>{currentUsers.length}</strong> of{" "}
              <strong>{users.length}</strong> users
            </div>
            <div className="d-flex align-items-center gap-1">
              <button
                className="btn btn-sm btn-outline-secondary px-2"
                onClick={() => handlePageChange(currentPage - 1)}
                // disabled={currentPage === 1}
                style={{
                  minWidth: "32px",
                  opacity: !canGoPrev ? 0.5 : 1,
                  cursor: !canGoPrev ? "not-allowed" : "pointer",
                }}
              >
                ←
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    className={`btn btn-sm px-2 ${
                      currentPage === page
                        ? "btn-primary text-white"
                        : "btn-outline-secondary"
                    }`}
                    onClick={() => handlePageChange(page)}
                    style={{ minWidth: "32px" }}
                  >
                    {page}
                  </button>
                )
              )}
              <button
                className="btn btn-sm btn-outline-secondary px-2"
                onClick={() => handlePageChange(currentPage + 1)}
                // disabled={currentPage === totalPages}
                style={{
                  minWidth: "32px",
                  opacity: !canGoNext ? 0.5 : 1,
                  cursor: !canGoNext ? "not-allowed" : "pointer",
                }}
              >
                →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* EDIT USER MODAL */}
      {showEditModal && (
        <div
          className="modal fade show d-block"
          style={{ background: "rgba(0,0,0,.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Edit User</h5>
                <button className="btn-close" onClick={closeEditModal} />
              </div>
              <form onSubmit={handleUpdate}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Full Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editForm.name}
                      onChange={(e) =>
                        setEditForm({ ...editForm, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      value={editForm.email}
                      onChange={(e) =>
                        setEditForm({ ...editForm, email: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Department</label>
                    <select
                      className="form-select"
                      value={editForm.department}
                      onChange={(e) =>
                        setEditForm({ ...editForm, department: e.target.value })
                      }
                      required
                    >
                      <option value="">Select Department</option>
                      <option value="IP Management">IP Management</option>
                      <option value="Research">Research</option>
                      <option value="Legal">Legal</option>
                      <option value="Finance">Finance</option>
                      <option value="HR">HR</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Role</label>
                    <select
                      className="form-select"
                      value={editForm.role_id}
                      onChange={(e) =>
                        setEditForm({ ...editForm, role_id: e.target.value })
                      }
                      required
                    >
                      <option value="">Select Role</option>
                      {roles.map((role) => (
                        <option key={role._id} value={role._id}>
                          {role.name.charAt(0).toUpperCase() +
                            role.name.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Status</label>
                    <select
                      className="form-select"
                      value={editForm.status}
                      onChange={(e) =>
                        setEditForm({ ...editForm, status: e.target.value })
                      }
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={closeEditModal}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? "Updating..." : "Update User"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {showDeleteModal && (
        <DeleteConfirmModal
          show={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={confirmDelete}
          message="Are you sure you want to delete this user?"
        />
      )}

      {/* RESET PASSWORD MODAL */}
      {showResetModal && (
        <div
          className="modal fade show d-block"
          style={{ background: "rgba(0,0,0,.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Reset Password</h5>
                <button
                  className="btn-close"
                  onClick={() => {
                    setShowResetModal(false);
                    setNewPassword("");
                    setResetUserId(null);
                  }}
                />
              </div>
              <div className="modal-body">
                <label className="form-label">New Password</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Enter new password (min 6 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowResetModal(false);
                    setNewPassword("");
                    setResetUserId(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={submitResetPassword}
                >
                  Update Password
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
