import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import SystemLogo from "../components/SystemLogo";
import { resetPassword } from "../services/authService";
import TextInput from "../components/common/TextInput";

export default function ResetPasswordPage() {
  const [form, setForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (form.newPassword !== form.confirmPassword) {
      return setError("New passwords do not match.");
    }
    try {
      const response = await resetPassword({
        oldPassword: form.oldPassword,
        newPassword: form.newPassword,
      });
      setSuccess(true);
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || err.message || "Password reset failed";
      setError(errorMsg);
    }
  };

  return (
    <div
      style={{
        height: "100vh",
        backgroundColor: "#f0f2f5",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          height: "65%",
          backgroundColor: "#DCDCDC",
          padding: 32,
          borderRadius: 16,
          boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "85%",
            maxWidth: 900,
            display: "flex",
            backgroundColor: "#DCDCDC",
            borderRadius: 12,
            gap: 30,
            marginTop: 30,
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
          }}
        >
          <div
            style={{
              flex: 1.5,
              backgroundColor: "#f8f8f8",
              padding: 40,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <SystemLogo />
          </div>
          <form
            onSubmit={handleSubmit}
            style={{
              flex: 1,
              padding: 40,
              display: "flex",
              flexDirection: "column",
              gap: 16,
              backgroundColor: "#f8f8f8",
            }}
          >
            <TextInput
              label="Password"
              name="oldPassword"
              value={form.oldPassword}
              onChange={handleChange}
              type="password"
            ></TextInput>
            <TextInput
              label="New Password"
              name="newPassword"
              value={form.newPassword}
              onChange={handleChange}
              type="password"
            ></TextInput>
            <TextInput
              label="Re-enter New Password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              type="password"
            ></TextInput>

            {error && <div style={{ color: "red", fontSize: 13 }}>{error}</div>}

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

          {true && (
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
              <div style={{ fontWeight: "bold", fontSize: 16 }}>
                Account password change successfully !!!
              </div>
              <div style={{ fontSize: 14 }}>Please Sign in again!!!</div>
              <div style={{ textAlign: "right" }}>
                <button
                  onClick={() => navigate("/login")}
                  style={{
                    padding: "6px 14px",
                    backgroundColor: "green",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    fontSize: 14,
                    cursor: "pointer",
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
