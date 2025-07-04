import React from "react";
import { Button, Modal } from "antd";
import { useNavigate } from "react-router-dom";

export default function Error403() {
  const navigate = useNavigate();
  const [loginModalOpen, setLoginModalOpen] = React.useState(false);

  return (
    <div style={{ padding: 80, textAlign: "center" }}>
      <h1>🚫 403 - Forbidden</h1>
      <p>You do not have permission to access this page.</p>
      <Button
        type="primary"
        style={{ marginTop: 24 }}
        onClick={() => {
          if (!user) {
            setLoginModalOpen(true);
          } else {
            navigate("/home");
          }
        }}
      >
        Go to Home
      </Button>
      <Modal
        open={loginModalOpen}
        onCancel={() => setLoginModalOpen(false)}
        onOk={() => {
          setLoginModalOpen(false);
          navigate("/login");
        }}
        okText="Login"
        cancelText="Cancel"
        closable={false}
        maskClosable={false}
        centered
        bodyStyle={{ padding: 32, textAlign: "center" }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <span style={{ fontSize: 40, color: "#1890ff", marginBottom: 12 }}>🔒</span>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
            You need to login to continue.
          </div>
          <div style={{ fontSize: 15, color: "#555" }}>
            Please login to access this feature.
          </div>
        </div>
      </Modal>
    </div>
  );
}
