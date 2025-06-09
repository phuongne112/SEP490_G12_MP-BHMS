import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import SystemLogo from "../components/SystemLogo";
import TextInput from "../components/common/TextInput";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!email.includes("@")) {
      return setError("Please enter a valid email address.");
    }
    try {
      await sendResetEmail(email); //CallAPI
      console.log("Sending reset link to: ", email);
      navigate("/login");
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        "Failed to send reset link.";
      setError(errorMsg);
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
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  padding: "6px 16px",
                  backgroundColor: "green",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                Reset Password
              </button>
            </div>
          </form>

          <div
            style={{
              boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
              width: "80%", // ✅ chiếm 80 chiều ngang div cha
              textAlign: "center",
              marginTop: 24,
            }}
          >
            <SystemLogo />
          </div>
        </div>
      </div>
    </div>
  );
}
