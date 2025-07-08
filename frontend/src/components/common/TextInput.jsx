import React from "react";
const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 6,
  border: "1px solid #ccc",
  marginTop: 4,
  boxSizing: "border-box",
};

export default function TextInput({
  label,
  name,
  value,
  onChange,
  type = "text",
  required = true,
  error,
  suffix,
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder="Nhập tại đây..."
          required={required}
          style={{
            ...inputStyle,
            paddingRight: suffix ? "40px" : "12px",
            border: error ? "1px solid red" : inputStyle.border,
          }}
        />
        {suffix && (
          <div
            style={{
              position: "absolute",
              top: "60%",
              right: 12,
              transform: "translateY(-50%)",
              cursor: "pointer",
              fontSize: 18,
              color: "#555",
            }}
          >
            {suffix}
          </div>
        )}
      </div>
      {error && (
        <p style={{ color: "red", marginTop: 4, fontSize: 14 }}>{error}</p>
      )}
    </div>
  );
}
