import React from "react";
import { Button } from "antd";
import { useNavigate } from "react-router-dom";

export default function Error403() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: 80, textAlign: "center" }}>
      <h1>🚫 403 - Forbidden</h1>
      <p>You do not have permission to access this page.</p>
      <Button
        type="primary"
        style={{ marginTop: 24 }}
        onClick={() => navigate("/home")}
      >
        Go to Home
      </Button>
    </div>
  );
}
