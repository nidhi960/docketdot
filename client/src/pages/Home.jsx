import { toast } from "react-toastify";
import useAuthStore from "../store/authStore";
import { useNavigate } from "react-router-dom";
import React, { useEffect, useState } from "react";

export default function Login() {
  const navigate = useNavigate();
  const authUser = useAuthStore();
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!category) {
      toast.warning("Please select a category");
      return;
    }

    setLoading(true);

    const response = await authUser.login({ email, password });

    setLoading(false);

    if (response) {
      navigate("/dashboard");
    }
  };

  useEffect(() => {
    if (authUser.isAuthenticated) {
      navigate("/dashboard");
    }
  }, []);

  return (
    <div
      className="container d-flex justify-content-center align-items-center"
      style={{ height: "100%" }}
    >
      <form
        onSubmit={handleLogin}
        className="card p-4 shadow center-y"
        style={{ width: "380px" }}
      >
        <h3 className="text-center mb-3">Login</h3>

        {/* Category */}
        <select
          className="form-select mb-3"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">Select Category</option>
          <option value="patent">Patent</option>
          <option value="trademark">Trademark</option>
        </select>

        {/* Email */}
        <input
          className="form-control mb-3"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        {/* Password - cnsf1lrl@A1 */}
        <input
          className="form-control mb-3"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {/* Button */}
        <button className="btn btn-primary w-100" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}
