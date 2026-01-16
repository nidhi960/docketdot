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
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    "Secure IP management built on enterprise-grade AWS cloud infrastructure",
    "AI-powered docketing management that streamlines and accelerates decision-making",
    "Modern IP docketing built for accuracy, intelligence, and scale",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 3000); // Changes every 3 seconds

    return () => clearInterval(interval);
  }, [slides.length]);

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

  const styles = {
    container: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: "flex",
      minHeight: "100vh",
      width: "100%",
      margin: 0,
      padding: 0,
    },
    leftPanel: {
      flex: 1,
      background:
        "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f1a 100%)",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      padding: "40px",
      position: "relative",
      overflow: "hidden",
    },
    leftPanelOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background:
        "radial-gradient(circle at 30% 70%, rgba(139, 69, 19, 0.1) 0%, transparent 50%)",
      pointerEvents: "none",
    },
    logo: {
      fontSize: "42px",
      fontWeight: "700",
      marginBottom: "16px",
      zIndex: 1,
    },
    logoWhite: {
      color: "#ffffff",
    },
    logoOrange: {
      color: "#f97316",
    },
    tagline: {
      color: "#9ca3af",
      fontSize: "16px",
      textAlign: "center",
      maxWidth: "320px",
      lineHeight: "1.6",
      zIndex: 1,
      minHeight: "55px", // Added this to prevent layout shifting
    },
    dots: {
      display: "flex",
      gap: "8px",
      marginTop: "32px",
      zIndex: 1,
    },
    dot: {
      width: "8px",
      height: "8px",
      borderRadius: "50%",
      backgroundColor: "#f97316",
    },
    dotInactive: {
      width: "8px",
      height: "8px",
      borderRadius: "50%",
      backgroundColor: "#4b5563",
    },
    rightPanel: {
      flex: 1,
      backgroundColor: "#ffffff",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      padding: "40px",
    },
    formContainer: {
      width: "100%",
      maxWidth: "380px",
    },
    welcomeTitle: {
      fontSize: "28px",
      fontWeight: "700",
      color: "#1f2937",
      marginBottom: "8px",
    },
    welcomeSubtitle: {
      fontSize: "14px",
      color: "#6b7280",
      marginBottom: "32px",
    },
    label: {
      display: "block",
      fontSize: "14px",
      fontWeight: "500",
      color: "#374151",
      marginBottom: "8px",
    },
    inputWrapper: {
      marginBottom: "20px",
    },
    input: {
      width: "100%",
      padding: "14px 16px",
      fontSize: "14px",
      border: "1px solid #e5e7eb",
      borderRadius: "8px",
      outline: "none",
      transition: "border-color 0.2s, box-shadow 0.2s",
      boxSizing: "border-box",
      backgroundColor: "#ffffff",
    },
    select: {
      width: "100%",
      padding: "14px 16px",
      fontSize: "14px",
      border: "1px solid #e5e7eb",
      borderRadius: "8px",
      outline: "none",
      transition: "border-color 0.2s, box-shadow 0.2s",
      boxSizing: "border-box",
      backgroundColor: "#ffffff",
      cursor: "pointer",
      appearance: "none",
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
      backgroundRepeat: "no-repeat",
      backgroundPosition: "right 16px center",
    },
    button: {
      width: "100%",
      padding: "14px 24px",
      fontSize: "16px",
      fontWeight: "600",
      color: "#ffffff",
      backgroundColor: "#f97316",
      border: "none",
      borderRadius: "8px",
      cursor: "pointer",
      transition: "background-color 0.2s, transform 0.1s",
      marginTop: "8px",
    },
    buttonDisabled: {
      width: "100%",
      padding: "14px 24px",
      fontSize: "16px",
      fontWeight: "600",
      color: "#ffffff",
      backgroundColor: "#fdba74",
      border: "none",
      borderRadius: "8px",
      cursor: "not-allowed",
      marginTop: "8px",
    },
  };

  return (
    <div style={styles.container}>
      {/* Left Panel - Branding */}
      <div style={styles.leftPanel}>
        <div style={styles.leftPanelOverlay}></div>
        <div style={styles.logo}>
          <span style={styles.logoWhite}>Docket</span>
          <span style={styles.logoOrange}>Dots</span>
        </div>

        {/* --- CHANGED SECTION START --- */}
        <p
          style={{ ...styles.tagline, transition: "opacity 0.5s ease-in-out" }}
        >
          {slides[currentSlide]}
        </p>

        <div style={styles.dots}>
          {slides.map((_, index) => (
            <div
              key={index}
              style={index === currentSlide ? styles.dot : styles.dotInactive}
              // Optional: Click to change slide manually
              onClick={() => setCurrentSlide(index)}
            ></div>
          ))}
        </div>
        {/* --- CHANGED SECTION END --- */}
      </div>

      {/* Right Panel - Login Form */}
      <div style={styles.rightPanel}>
        <div style={styles.formContainer}>
          <h1 style={styles.welcomeTitle}>Welcome back</h1>
          <p style={styles.welcomeSubtitle}>
            Enter your credentials to access your account
          </p>

          <form onSubmit={handleLogin}>
            {/* Category */}
            <div style={styles.inputWrapper}>
              <label style={styles.label}>Category</label>
              <select
                style={styles.select}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                onFocus={(e) => {
                  e.target.style.borderColor = "#f97316";
                  e.target.style.boxShadow =
                    "0 0 0 3px rgba(249, 115, 22, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#e5e7eb";
                  e.target.style.boxShadow = "none";
                }}
              >
                <option value="">Select category</option>
                <option value="patent">Patent</option>
                <option value="trademark">Trademark</option>
              </select>
            </div>

            {/* Email */}
            <div style={styles.inputWrapper}>
              <label style={styles.label}>Email</label>
              <input
                style={styles.input}
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={(e) => {
                  e.target.style.borderColor = "#f97316";
                  e.target.style.boxShadow =
                    "0 0 0 3px rgba(249, 115, 22, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#e5e7eb";
                  e.target.style.boxShadow = "none";
                }}
                required
              />
            </div>

            {/* Password */}
            <div style={styles.inputWrapper}>
              <label style={styles.label}>Password</label>
              <input
                style={styles.input}
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={(e) => {
                  e.target.style.borderColor = "#f97316";
                  e.target.style.boxShadow =
                    "0 0 0 3px rgba(249, 115, 22, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#e5e7eb";
                  e.target.style.boxShadow = "none";
                }}
                required
              />
            </div>

            {/* Button */}
            <button
              type="submit"
              style={loading ? styles.buttonDisabled : styles.button}
              disabled={loading}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.backgroundColor = "#ea580c";
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.target.style.backgroundColor = "#f97316";
                }
              }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
