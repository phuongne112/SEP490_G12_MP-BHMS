import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import SystemLogo from "../components/SystemLogo";
import TextInput from "../components/common/TextInput";
import ErrorMessage from "../components/common/ErrorMessage";
import { register } from "../services/authService";

export default function Register() {
  const navigate = useNavigate();
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    username: "",
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    setErrors({ ...errors, [name]: null }); // clear lỗi khi người dùng nhập lại
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    if (form.password !== form.confirmPassword) {
      return setErrors({ confirmPassword: "Confirm password not match." });
    }

    const registerData = {
      username: form.username,
      fullName: form.fullName,
      email: form.email,
      phone: form.phone,
      password: form.password,
    };

    try {
      await register(registerData);
      navigate("/login");
    } catch (err) {
      const res = err.response?.data;

      if (res?.data && typeof res.data === "object") {
        setErrors(res.data); // Ví dụ: { email: "Email đã tồn tại" }
      } else {
        const fallbackMsg = res?.message || err.message || "Sign up failed. Please try again.";
        setErrors({ general: fallbackMsg });
      }
    }
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "90vh",
        backgroundColor: "#ccc",
        paddingTop: 40,
        maxWidth: 1000,
        margin: "0 auto",
        borderRadius: 12,
        marginTop: 20,
      }}
    >
      <div
        style={{
          width: 800,
          background: "#B1D7E7",
          borderRadius: 8,
          padding: "100px 32px 32px 32px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          position: "relative",
          marginTop: 50,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -180,
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          <SystemLogo />
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            margin: 20,
            marginTop: 40,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 20,
          }}
        >
          <TextInput
            label="User Name"
            name="username"
            value={form.username}
            onChange={handleChange}
            error={errors.username}
          />
          <TextInput
            label="Full Name"
            name="fullName"
            value={form.fullName}
            onChange={handleChange}
            error={errors.fullName}
          />
          <TextInput
            label="Email"
            name="email"
            value={form.email}
            onChange={handleChange}
            type="email"
            error={errors.email}
          />
          <TextInput
            label="Phone"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            error={errors.phone}
          />
          <TextInput
            label="Password"
            name="password"
            value={form.password}
            onChange={handleChange}
            type="password"
            error={errors.password}
          />
          <TextInput
            label="Re-enter Password"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleChange}
            type="password"
            error={errors.confirmPassword}
          />

          {errors.general && (
            <div style={{ gridColumn: "1 / span 2" }}>
              <ErrorMessage message={errors.general} />
                    </div>
                  )}
              <div
              style={{
                gridColumn: "1 / span 2",
                textAlign: "center",
                marginTop: 16,
              }}
            >
              <button
                type="submit"
                style={{
                  padding: "12px 48px",
                  background: "#0A2342",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  fontWeight: "bold",
                  fontSize: 16,
                  cursor: "pointer",
                }}
              >
                Sign Up
              </button>

              {/* Link Sign In */}
              <div style={{ marginTop: 12, textAlign: "center" }}>
                <span style={{ fontSize: 14 }}>
                  Already have an account?{" "}
                  <a href="/login" style={{ color: "#0A2342", textDecoration: "underline" }}>
                    Sign In
                  </a>
                </span>
              </div>
            </div>
        </form>
      </div>
    </div>
  );
}
