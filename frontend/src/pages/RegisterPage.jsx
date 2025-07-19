import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import SystemLogo from "../components/SystemLogo";
import TextInput from "../components/common/TextInput";
import ErrorMessage from "../components/common/ErrorMessage";
import { register } from "../services/authService";
import { getAllUsers } from "../services/userApi";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";

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
    citizenId: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    setErrors({ ...errors, [name]: null });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    // Validate username is not an email
    if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.username)) {
      return setErrors({ username: "Tên đăng nhập không được là địa chỉ email." });
    }

    if (form.password !== form.confirmPassword) {
      return setErrors({ confirmPassword: "Xác nhận mật khẩu không khớp." });
    }

    const registerData = {
      username: form.username,
      fullName: form.fullName,
      email: form.email,
      phone: form.phone,
      password: form.password,
      citizenId: form.citizenId,
    };

    try {
      await register(registerData);
      navigate("/login");
    } catch (err) {
      const res = err.response?.data;
      if (res?.data && typeof res.data === "object") {
        setErrors(res.data);
      } else {
        setErrors({
          general:
            res?.message || err.message || "Đăng ký thất bại. Vui lòng thử lại.",
        });
      }
    }
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "start",
        height: "100vh",
        backgroundColor: "#ccc",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 900,
          background: "#B1D7E7",
          borderRadius: 12,
          padding: "48px 32px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          position: "relative",
        }}
      >
        {/* Logo clickable */}
        <div
          onClick={() => navigate("/home")}
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 32,
            cursor: "pointer",
          }}
        >
          <SystemLogo />
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 20,
          }}
        >
          <TextInput
            label="Tên đăng nhập"
            name="username"
            value={form.username}
            onChange={handleChange}
            error={errors.username}
          />
          <TextInput
            label="Họ và tên"
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
            label="Số điện thoại"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            error={errors.phone}
          />
          <TextInput
            label="Mật khẩu"
            name="password"
            value={form.password}
            onChange={handleChange}
            type={showPassword ? "text" : "password"}
            error={errors.password}
            suffix={
              showPassword ? (
                <AiOutlineEyeInvisible onClick={() => setShowPassword(false)} />
              ) : (
                <AiOutlineEye onClick={() => setShowPassword(true)} />
              )
            }
          />

          <TextInput
            label="Xác nhận mật khẩu"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleChange}
            type={showConfirmPassword ? "text" : "password"}
            error={errors.confirmPassword}
            suffix={
              showConfirmPassword ? (
                <AiOutlineEyeInvisible
                  onClick={() => setShowConfirmPassword(false)}
                />
              ) : (
                <AiOutlineEye onClick={() => setShowConfirmPassword(true)} />
              )
            }
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
              Đăng ký
            </button>

            <div style={{ marginTop: 12, fontSize: 14 }}>
              Đã có tài khoản?{" "}
              <a
                href="/login"
                style={{ color: "#0A2342", textDecoration: "underline" }}
              >
                Đăng nhập
              </a>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
