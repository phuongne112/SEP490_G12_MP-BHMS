import React, { useEffect, useState } from "react";
import { Card, Table, Button, Input, Tag, Typography, message, Spin, Space } from "antd";
import { CheckCircleOutlined, FileDoneOutlined } from "@ant-design/icons";
import RenterSidebar from "../../components/layout/RenterSidebar";

const { Title, Text } = Typography;

// Responsive: Ẩn sidebar trên mobile
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return isMobile;
};

// Mock data
const mockAssets = [
  {
    id: 1,
    name: "Bed",
    quantity: 2,
    condition: "Good",
    note: "No damage",
  },
  {
    id: 2,
    name: "Desk",
    quantity: 1,
    condition: "Good",
    note: "Slight scratch on surface",
  },
  {
    id: 3,
    name: "Chair",
    quantity: 2,
    condition: "Good",
    note: "",
  },
];

export default function RenterCheckoutAssetPage() {
  const isMobile = useIsMobile();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [notes, setNotes] = useState({});

  useEffect(() => {
    // TODO: Replace with API call
    setAssets(mockAssets);
    setLoading(false);
  }, []);

  const handleNoteChange = (id, value) => {
    setNotes((prev) => ({ ...prev, [id]: value }));
  };

  const handleConfirm = () => {
    setConfirming(true);
    // TODO: Call API to confirm check-out asset
    setTimeout(() => {
      setConfirming(false);
      message.success("Check-out asset confirmation submitted successfully!");
    }, 1200);
  };

  const columns = [
    {
      title: "Asset Name",
      dataIndex: "name",
      key: "name",
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: "Quantity",
      dataIndex: "quantity",
      key: "quantity",
      align: "center",
    },
    {
      title: "Condition",
      dataIndex: "condition",
      key: "condition",
      align: "center",
      render: (cond) => (
        <Tag color={cond === "Good" ? "green" : "orange"}>{cond}</Tag>
      ),
    },
    {
      title: "Note",
      dataIndex: "note",
      key: "note",
      render: (_, record) => (
        <Input.TextArea
          value={notes[record.id] !== undefined ? notes[record.id] : record.note}
          onChange={(e) => handleNoteChange(record.id, e.target.value)}
          placeholder="Enter note (if any)"
          autoSize
        />
      ),
    },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f5f5f5" }}>
      {!isMobile && (
        <div style={{ width: 220, minHeight: "100vh", background: "#001529", position: "fixed", left: 0, top: 0, bottom: 0, zIndex: 10 }}>
          <RenterSidebar />
        </div>
      )}
      <div style={{ flex: 1, marginLeft: !isMobile ? 220 : 0, padding: isMobile ? 8 : 24, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: 900 }}>
          <Card style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            <Title level={2} style={{ color: "#1890ff", fontSize: isMobile ? 22 : 28 }}>
              <FileDoneOutlined style={{ marginRight: 8 }} />
              Check-out Asset
            </Title>
            <Text type="secondary" style={{ fontSize: isMobile ? 13 : 16 }}>
              Please review and confirm the condition of each asset when you move out.
            </Text>
            <div style={{ margin: isMobile ? "12px 0" : "24px 0", overflowX: isMobile ? "auto" : "unset" }}>
              {loading ? (
                <Spin size="large" />
              ) : (
                <Table
                  columns={columns}
                  dataSource={assets}
                  rowKey="id"
                  pagination={false}
                  bordered
                  size={isMobile ? "small" : "middle"}
                  scroll={isMobile ? { x: 600 } : undefined}
                />
              )}
            </div>
            <Space style={{ marginTop: 16 }}>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                loading={confirming}
                onClick={handleConfirm}
                size={isMobile ? "middle" : "large"}
              >
                Confirm Check-out
              </Button>
            </Space>
          </Card>
        </div>
      </div>
    </div>
  );
} 