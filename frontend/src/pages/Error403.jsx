import React from "react";
import { Button, Modal } from "antd";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

export default function Error403() {
  const navigate = useNavigate();
  const [loginModalOpen, setLoginModalOpen] = React.useState(false);
  const user = useSelector((state) => state.account.user);

  return (
    <div style={{ padding: 80, textAlign: "center" }}>
      <h1>🚫 403 - Không có quyền truy cập</h1>
      <p>Bạn không có quyền truy cập vào trang này.</p>
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
        Về trang chủ
      </Button>
      <Modal
        open={loginModalOpen}
        onCancel={() => setLoginModalOpen(false)}
        onOk={() => {
          setLoginModalOpen(false);
          navigate("/login");
        }}
        okText="Đăng nhập"
        cancelText="Hủy"
        closable={false}
        maskClosable={false}
        centered
        bodyStyle={{ padding: 32, textAlign: "center" }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 40, color: "#1890ff", marginBottom: 12 }}>
            🔒
          </span>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
            Bạn cần đăng nhập để tiếp tục
          </div>
          <div style={{ fontSize: 15, color: "#555" }}>
            Vui lòng đăng nhập để sử dụng tính năng này.
          </div>
        </div>
      </Modal>
    </div>
  );
}
