import React, { useEffect, useState } from "react";
import logo from "../../assets/logo.png";
import { useNavigate } from "react-router-dom";

export default function Header() {
  const navigate = useNavigate();
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("user") || "null")
  );
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  useEffect(() => {
    const handleStorageChange = () => {
      setToken(localStorage.getItem("token"));
      setUser(JSON.parse(localStorage.getItem("user") || "null"));
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("token-changed", handleStorageChange); // custom event từ interceptor

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("token-changed", handleStorageChange);
    };
  }, []);

  return (
    <header
      style={{
        backgroundColor: "#006D77",
        color: "white",
        padding: "16px 24px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <img src={logo} alt="Logo" style={{ height: 40, marginRight: 12 }} />
      <nav style={{ display: "flex", gap: "30px" }}>
        <a
          href="#"
          style={{
            color: "black",
            margin: "0 8px",
            textDecoration: "none",
            cursor: "pointer",
            fontSize: "16px",
          }}
        >
          Products
        </a>
        <a
          href="#"
          style={{
            color: "black",
            margin: "0 8px",
            textDecoration: "none",
            cursor: "pointer",
            fontSize: "16px",
          }}
        >
          Solutions
        </a>
        <a
          href="#"
          style={{
            color: "black",
            margin: "0 8px",
            textDecoration: "none",
            cursor: "pointer",
            fontSize: "16px",
          }}
        >
          Community
        </a>
        <a
          href="#"
          style={{
            color: "black",
            margin: "0 8px",
            textDecoration: "none",
            cursor: "pointer",
            fontSize: "16px",
          }}
        >
          Contact
        </a>
        <a
          href="#"
          style={{
            color: "black",
            margin: "0 8px",
            textDecoration: "none",
            cursor: "pointer",
            fontSize: "16px",
          }}
        >
          Link
        </a>
      </nav>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {token && user ? (
          <>
            <span style={{ color: "#fff", fontSize: 16 }}>
              👤 {user.username}
            </span>
            <button
              onClick={handleLogout}
              style={{
                padding: "6px 16px",
                backgroundColor: "#FF6B6B",
                color: "#FFF",
                border: "none",
                borderRadius: "12px",
                fontWeight: "bold",
                cursor: "pointer",
                fontSize: "15px",
              }}
            >
              Sign out
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => navigate("/login")}
              style={{
                padding: "6px 16px",
                backgroundColor: "#E0E0E0",
                color: "#000",
                border: "none",
                borderRadius: "12px",
                fontWeight: "bold",
                cursor: "pointer",
                fontSize: "15px",
              }}
            >
              Sign in
            </button>
            <button
              onClick={() => navigate("/signup")}
              style={{
                padding: "6px 16px",
                backgroundColor: "#1A1A1A",
                color: "#FFF",
                border: "none",
                borderRadius: "12px",
                fontWeight: "bold",
                cursor: "pointer",
                fontSize: "15px",
              }}
            >
              Register
            </button>
          </>
        )}
      </div>
    </header>
  );
}
