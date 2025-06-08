import React from "react";
export default function ErrorMessage({ message }) {
  if (!message) return null;
  return (
    <p
      style={{
        color: "red",
        gridColumn: "1 / span 2",
        fontWeight: "bold",
        textSize: 40,
      }}
    >
      {message}
    </p>
  );
}
