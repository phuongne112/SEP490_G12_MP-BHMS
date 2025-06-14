import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import SystemLogo from "../components/SystemLogo";
import TextInput from "../components/common/TextInput";
import { sendResetEmail } from "../services/authService";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!email.includes("@")) {
      setLoading(false);
      return setError("Please enter a valid email address.");
    }

    try {
      await sendResetEmail(email);
      setSuccess(true); // Hiện thông báo
      setTimeout(() => {
        navigate("/login");
      }, 2000); // Chờ 2 giây rồi chuyển hướng
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        "Failed to send reset link.";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#fff",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#ccc",
          padding: "40px 16px",
          minHeight: "70vh",
          width: 1000,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            background: "#fff",
            padding: "32px 32px",
            borderRadius: 12,
            boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
            width: "100%",
            maxWidth: 360,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <form onSubmit={handleSubmit}>
            <TextInput
              label="Email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
            />

            {error && (
              <div style={{ color: "red", fontSize: 16, marginTop: 15 }}>
                {error}
              </div>
            )}

            {success && (
              <div
                style={{
                  marginTop: 16,
                  padding: "12px 20px",
                  backgroundColor: "#e6ffe6",
                  color: "#1a7f1a",
                  borderRadius: 6,
                  fontWeight: "bold",
                  textAlign: "center",
                }}
              >
                ✅ Reset link has been sent to your email.
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginTop: 12,
                gap: 30,
              }}
            >
              <button
                type="button"
                onClick={() => navigate("/login")}
                style={{
                  background: "red",
                  border: "1 solid",
                  fontSize: 14,
                  cursor: "pointer",
                  fontWeight: "bold",
                  color: "#fff",
                  padding: "6px 16px",
                  borderRadius: 6,
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: "6px 16px",
                  backgroundColor: "green",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: "bold",
                  cursor: "pointer",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? "Sending..." : "Send"}
              </button>
            </div>
          </form>

              <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: 16,
            borderRadius: 12,
            backgroundColor: "#fff",
            boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
            marginTop: 32,
            width: "100%",
          }}
        >
          <SystemLogo />
        </div>
        </div>
      </div>
    </div>
  );
}
