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
  error, // 👉 thêm prop error
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label>{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder="Enter here..."
        required={required}
        style={{
          ...inputStyle,
          border: error ? "1px solid red" : inputStyle.border,
        }}
      />
      {error && (
        <p style={{ color: "red", marginTop: 4, fontSize: 14 }}>{error}</p>
      )}
    </div>
  );
}
