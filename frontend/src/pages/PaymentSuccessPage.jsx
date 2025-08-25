import { Button } from "antd";
import { useNavigate } from "react-router-dom";
import { CheckCircleTwoTone } from "@ant-design/icons";
import { useEffect } from "react";

export default function PaymentSuccessPage() {
  const navigate = useNavigate();

  // 🆕 Trigger refresh notifications khi thanh toán thành công
  useEffect(() => {
    window.dispatchEvent(new Event('refresh-notifications'));
    // 🆕 Hiện notification toast
    window.dispatchEvent(new CustomEvent('show-notification-toast', {
      detail: { message: 'Thanh toán đã hoàn tất thành công! 🎉', type: 'success' }
    }));
  }, []);
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "#fff"
    }}>
      <CheckCircleTwoTone twoToneColor="#52c41a" style={{ fontSize: 80 }} />
      <h1 style={{ marginTop: 24, color: "#52c41a" }}>Thanh toán thành công!</h1>
      <p style={{ fontSize: 18, color: "#555" }}>
        Cảm ơn bạn đã thanh toán. Hệ thống đã ghi nhận giao dịch của bạn.
      </p>
      <Button
        type="primary"
        size="large"
        style={{ marginTop: 32 }}
        onClick={() => navigate("/renter/bills")}
      >
        Về danh sách hóa đơn
      </Button>
      <Button
        style={{ marginTop: 12 }}
        onClick={() => navigate("/")}
      >
        Về trang chủ
      </Button>
    </div>
  );
} 