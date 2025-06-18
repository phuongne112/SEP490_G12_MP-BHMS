import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { AiFillEye, AiFillEyeInvisible } from "react-icons/ai";
import { login } from "../services/authService";
import { setUser } from "../store/accountSlice";
import SystemLogo from "../components/SystemLogo";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState({});
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError({});
    try {
      const user = await login(email, password);
      dispatch(
        setUser({
          id: user.id,
          fullName: user.name,
          role: user.role,
          permissions: user.role?.permissionEntities?.map((p) => p.name) || [],
        })
      );
      localStorage.setItem("showWelcome", "true");
      const roleName = user?.role?.roleName?.toUpperCase();
      switch (roleName) {
        case "ADMIN":
        case "SUBADMIN":
          navigate("/admin/users");
          break;
        case "RENTER":
          navigate("/room");
          break;
        default:
          navigate("/home");
      }
    } catch (err) {
      const response = err.response?.data;
      if (response?.data && typeof response.data === "object") {
        setError(response.data);
      } else {
        setError({
          general: response?.message || err.message || "Login failed",
        });
      }
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
        padding: 16,
      }}
    >
      <div
        style={{
          backgroundColor: "#DCDCDC",
          borderRadius: 16,
          boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
          width: "100%",
          maxWidth: 900,
          padding: "60px px", // ⬅ tăng chiều cao (trên + dưới)
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            backgroundColor: "#f8f8f8",
            borderRadius: 12,
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
            overflow: "hidden",
            flexWrap: "wrap",
            padding: "70px 32px",
          }}
        >
          <div
            style={{
              flex: "1 1 300px",
              backgroundColor: "#f8f8f8",
              padding: 40,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minWidth: 250,
            }}
          >
            <div
              onClick={() => navigate("/home")}
              style={{ cursor: "pointer" }}
            >
              <SystemLogo />
            </div>
          </div>

          <div
            style={{
              flex: "1 1 300px",
              padding: 40,
              backgroundColor: "#f8f8f8",
              minWidth: 250,
            }}
          >
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: 16 }}>
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  style={{
                    width: "100%",
                    padding: 10,
                    borderRadius: 6,
                    border: "1px solid #ccc",
                    fontSize: 16,
                  }}
                />
                {error.username && (
                  <p style={{ color: "red", marginTop: 4, fontSize: 13 }}>
                    {error.username}
                  </p>
                )}
              </div>

              <div style={{ marginBottom: 16 }}>
                <label>Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    style={{
                      width: "100%",
                      padding: 10,
                      borderRadius: 6,
                      border: "1px solid #ccc",
                      fontSize: 16,
                      paddingRight: 36,
                    }}
                  />
                  <span
                    onClick={() => setShowPassword((prev) => !prev)}
                    style={{
                      position: "absolute",
                      right: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      cursor: "pointer",
                      fontSize: 18,
                      color: "#666",
                    }}
                  >
                    {showPassword ? <AiFillEyeInvisible /> : <AiFillEye />}
                  </span>
                </div>
                {error.password && (
                  <p style={{ color: "red", marginTop: 4, fontSize: 13 }}>
                    {error.password}
                  </p>
                )}
              </div>

              <button
                type="submit"
                style={{
                  width: "100%",
                  padding: 12,
                  backgroundColor: "#0A2342",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  fontWeight: "bold",
                  fontSize: 16,
                  cursor: "pointer",
                  marginTop: 8,
                }}
              >
                Sign In
              </button>
             {error.general && (
                <p style={{ color: "red", marginTop: 12, fontSize: 14 }}>{error.general}</p>
              )}
            </form>

            <div
              style={{
                marginTop: 12,
                display: "flex",
                justifyContent: "space-between",
                flexWrap: "wrap",
              }}
            >
              <Link
                to="/forgotPassword"
                style={{ color: "#0A2342", fontSize: 16, marginTop: 4 }}
              >
                Forgot password?
              </Link>
              <Link
                to="/signUp"
                style={{ color: "#0A2342", fontSize: 16, marginTop: 4 }}
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
