import React from "react";
import logo from "../assets/logo.png";

export default function SystemLogo() {
  return (
    <div
      style={{
        backgroundColor: "white",
        border: "1px solid #ccc",
        padding: 32,
        borderRadius: 8,
        textAlign: "center",
        boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
        }}
      >
        <div
          style={{
            backgroundColor: "#0A2342",
            color: "white",
            padding: "24px 20px",
            fontSize: 20,
            fontWeight: 700,
            lineHeight: 1.4,
            borderRadius: 4,
            minWidth: 80,
            textAlign: "center",
          }}
        >
          MP–
          <br />
          BHMS
        </div>
        <div style={{ textAlign: "left", color: "#0A2342" }}>
          <div style={{ fontSize: 25, fontWeight: "bold" }}>
            Minh
            <br />
            Phuong
          </div>
          <div style={{ fontSize: 14, marginTop: 4 }}>
            Boarding House
            <br />
            Management System
          </div>
        </div>
      </div>
    </div>
  );
}
