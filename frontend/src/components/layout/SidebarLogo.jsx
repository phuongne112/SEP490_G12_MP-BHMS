import React from "react";

export default function SidebarLogo({ onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: "16px",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
      }}
    >
      <div
        style={{
          backgroundColor: "#0A2342",
          color: "#fff",
          padding: "12px 16px",
          borderRadius: 8,
          fontWeight: "bold",
          fontSize: 18,
          lineHeight: 1.2,
          textAlign: "center",
          fontFamily: "sans-serif",
        }}
      >
        MP–
        <br />
        BHMS
      </div>
    </div>
  );
}
