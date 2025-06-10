import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import SystemLogo from "../components/SystemLogo";
import TextInput from "../components/common/TextInput";
import ErrorMessage from "../components/common/ErrorMessage";
import { register } from "../services/authService";

export default function Register() {
  const navigate = useNavigate();
  const [error, setError] = useState(null);
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirmPassword) {
      return setError("Passwords do not match.");
    }

    // Chỉ gửi đúng những trường backend cần
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
      const errorMsg =
        err.response?.data?.message || err.message || "Registration failed";
      setError(errorMsg);
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
      }}
    >
      <div
        style={{
          width: 800,
          background: "#58c1f0",
          borderRadius: 8,
          padding: "100px 32px 32px32px",
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
          />
          <TextInput
            label="Full Name"
            name="fullName"
            value={form.fullName}
            onChange={handleChange}
          />
          <TextInput
            label="Email"
            name="email"
            value={form.email}
            onChange={handleChange}
            type="email"
          />
          <TextInput
            label="Phone"
            name="phone"
            value={form.phone}
            onChange={handleChange}
          />
          <TextInput
            label="Password"
            name="password"
            value={form.password}
            onChange={handleChange}
            type="password"
          />
          <TextInput
            label="Re-enter Password"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleChange}
            type="password"
          />
          <ErrorMessage message={error} />
          <div
            style={{
              gridColumn: "1 / span 2",
              textAlign: "center",
              marginTop: 8,
            }}
          >
            <button
              type="submit"
              style={{
                padding: "12px 48px",
                background: "green",
                color: "#fff",
                border: "none",
                borderRadius: 30,
                cursor: "pointer",
                frontWeight: "bold",
                fontSize: 16,
              }}
            >
              Register
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
