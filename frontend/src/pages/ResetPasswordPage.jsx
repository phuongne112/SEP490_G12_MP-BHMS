import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import SystemLogo from "../components/SystemLogo";
import { resetPassword } from "../services/authService";
import TextInput from "../components/common/TextInput";

export default function ResetPasswordPage() {
  const [form, setForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState({});
  const [success, setSuccess] = useState(false);
  const [token, setToken] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tokenFromUrl = params.get("token");
    if (!tokenFromUrl) {
      setError({ general: "Missing token in URL." });
    } else {
      setToken(tokenFromUrl);
    }
  }, [location]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    setError((prev) => ({ ...prev, [name]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError({});

    if (form.newPassword !== form.confirmPassword) {
      return setError({ confirmPassword: "Passwords do not match." });
    }

    try {
      await resetPassword({ token, newPassword: form.newPassword });
      setSuccess(true);
    } catch (err) {
      const res = err.response?.data;

      if (res?.data && typeof res.data === "object") {
        setError(res.data);
      } else {
        const fallbackMsg =
          res?.message || err.message || "Password reset failed";
        setError({ general: fallbackMsg });
      }
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f0f2f5",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 40,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 900,
          backgroundColor: "#DCDCDC",
          borderRadius: 16,
          boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            backgroundColor: "#fff",
          }}
        >
          <div
            style={{
              flex: "1 1 300px",
              padding: 40,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minWidth: 250,
              backgroundColor: "#f8f8f8",
            }}
          >
            <SystemLogo />
          </div>

          <form
            onSubmit={handleSubmit}
            style={{
              flex: "1 1 300px",
              padding: 40,
              display: "flex",
              flexDirection: "column",
              gap: 16,
              minWidth: 250,
              backgroundColor: "#f8f8f8",
            }}
          >
            <TextInput
              label="New Password"
              name="newPassword"
              value={form.newPassword}
              onChange={handleChange}
              type="password"
              error={error?.newPassword}
            />
            <TextInput
              label="Confirm Password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              type="password"
              error={error?.confirmPassword}
            />

            {error?.general && (
              <div style={{ color: "red", fontSize: 13 }}>{error.general}</div>
            )}

            <div style={{ textAlign: "center" }}>
              <button
                type="submit"
                style={{
                  padding: "10px 32px",
                  backgroundColor: "green",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                Change Password
              </button>
            </div>
          </form>
        </div>

        {success && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "#DCDCDC",
              padding: "24px 32px",
              borderRadius: 12,
              boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
              zIndex: 10,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              width: 320,
            }}
          >
            <div
              style={{
                marginTop: 20,
                color: "green",
                fontWeight: "bold",
                textAlign: "center",
              }}
            >
              Reset successful. Please{" "}
              <span
                onClick={() => navigate("/login")}
                style={{ textDecoration: "underline", cursor: "pointer" }}
              >
                login again
              </span>
              .
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
