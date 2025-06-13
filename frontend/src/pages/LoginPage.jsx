import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../services/authService";
import SystemLogo from "../components/SystemLogo";
import { AiFillEye, AiFillEyeInvisible } from "react-icons/ai";
import { Link } from "react-router-dom";
import { useDispatch } from "react-redux"; // ✅ thêm dòng này
import { setUser } from "../store/accountSlice"; // ✅ thêm dòng này

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const dispatch = useDispatch(); // ✅ khai báo

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const user = await login(email, password);

      // ✅ Lưu user vào Redux + localStorage
      dispatch(
        setUser({
          id: user.id,
          fullName: user.name,
          role: user.role?.roleName,
          permissions: user.role?.permissionEntities?.map((p) => p.name) || [],
        })
      );

      localStorage.setItem("showWelcome", "true");

      const roleName = user?.role?.roleName?.toUpperCase();
      if (!roleName) {
        navigate("/home");
        return;
      }

      switch (roleName) {
        case "ADMIN":
          navigate("/admin/users");
          break;
        case "RENTER":
          navigate("/room");
          break;
        case "USER":
        default:
          navigate("/home");
          break;
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || err.message || "Login failed";
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
          <div style={{ flex: 1, padding: 40, backgroundColor: "#f8f8f8" }}>
            {error && <p style={{ color: "red" }}>{error}</p>}
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: 16 }}>
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  style={{
                    width: "100%",
                    padding: 10,
                    borderRadius: 6,
                    border: "1px solid #ccc",
                  }}
                  required
                />
              </div>
              <div style={{ position: "relative", marginBottom: 16 }}>
                <label>Password</label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  style={{
                    width: "100%",
                    padding: 10,
                    borderRadius: 6,
                    border: "1px solid #ccc",
                  }}
                  required
                />
                <span
                  onClick={() => setShowPassword((prev) => !prev)}
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 30,
                    cursor: "pointer",
                    fontSize: 16,
                    color: "#666",
                  }}
                >
                  {showPassword ? <AiFillEyeInvisible /> : <AiFillEye />}
                </span>
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
                  cursor: "pointer",
                }}
              >
                Sign In
              </button>
            </form>
            <div style={{ marginTop: 12, textAlign: "left" }}>
              <Link
                to="/forgotPassword"
                style={{ color: "#0A2342", fontSize: 16 }}
              >
                Forgot password?
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
