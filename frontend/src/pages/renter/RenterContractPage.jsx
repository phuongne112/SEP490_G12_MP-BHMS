import React, { useEffect, useState } from "react";
import { Card, Descriptions, Tag, Spin, Typography, Button, message, Row, Col } from "antd";
import { FileTextOutlined } from "@ant-design/icons";
import RenterSidebar from "../../components/layout/RenterSidebar";
import dayjs from "dayjs";

const { Title, Text } = Typography;

export default function RenterContractPage() {
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    fetchContract();
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchContract = async () => {
    setLoading(true);
    try {
      // TODO: Implement API call to get renter's contract
      // const res = await getMyContract();
      // setContract(res);
      
      // Mock data for now
      setContract({
        id: 1,
        contractNumber: "CTR-2024-001",
        roomNumber: "A101",
        startDate: "2024-01-01",
        endDate: "2024-12-31",
        monthlyRent: 5000000,
        deposit: 10000000,
        status: "ACTIVE",
        landlordName: "Nguyen Van A",
        landlordPhone: "0123456789",
        terms: [
          "Pay rent on the 1st of every month",
          "Keep the room clean",
          "No pets allowed",
          "Turn off electricity when leaving the room"
        ]
      });
    } catch (err) {
      message.error("Failed to load contract information");
    }
    setLoading(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "ACTIVE": return "green";
      case "EXPIRED": return "red";
      case "PENDING": return "orange";
      default: return "default";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "ACTIVE": return "Active";
      case "EXPIRED": return "Expired";
      case "PENDING": return "Pending";
      default: return status;
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <RenterSidebar />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center" }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>Loading contract information...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <RenterSidebar />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center" }}>
            <Title level={3}>No contract</Title>
            <Text type="secondary">You do not have any rental contract.</Text>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f5f5f5" }}>
      {!isMobile && (
        <div style={{ width: 220, minHeight: "100vh", background: "#001529", position: "fixed", left: 0, top: 0, bottom: 0, zIndex: 10 }}>
          <RenterSidebar />
        </div>
      )}
      <div
        style={{
          flex: 1,
          marginLeft: !isMobile ? 220 : 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          padding: isMobile ? "16px 0" : "40px 0",
        }}
      >
        <div style={{ width: "100%", maxWidth: 1100, margin: "0 auto", padding: isMobile ? 8 : 0 }}>
          <Card style={{ borderRadius: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.08)", margin: "0 auto", background: "#fff" }}>
            <div style={{ marginBottom: isMobile ? 16 : 24 }}>
              <Title level={2} style={{ margin: 0, color: "#1890ff", textAlign: "center", fontSize: isMobile ? 22 : 32 }}>
                <FileTextOutlined style={{ marginRight: 8 }} />
                Rental Contract
              </Title>
              <Text type="secondary" style={{ display: "block", textAlign: "center", marginBottom: isMobile ? 16 : 24, fontSize: isMobile ? 14 : 16 }}>
                Detailed information about your rental contract
              </Text>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: 24,
              }}
            >
              <div style={{ flex: 1, minWidth: isMobile ? "100%" : 340, maxWidth: isMobile ? "100%" : 600 }}>
                <Card title="Contract Information" style={{ marginBottom: 24 }}>
                  <Descriptions bordered column={2} size={isMobile ? "small" : "default"}>
                    <Descriptions.Item label="Contract No.">
                      <Text strong style={{ color: "#1890ff" }}>
                        {contract.contractNumber}
                      </Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Room">
                      <Tag color="blue" style={{ fontWeight: "bold" }}>
                        {contract.roomNumber}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Start Date">
                      <Text>{dayjs(contract.startDate).format("DD/MM/YYYY")}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="End Date">
                      <Text>{dayjs(contract.endDate).format("DD/MM/YYYY")}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Monthly Rent">
                      <Text strong style={{ color: "#52c41a", fontSize: "16px" }}>
                        {contract.monthlyRent?.toLocaleString()} ₫
                      </Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Deposit">
                      <Text strong style={{ color: "#faad14", fontSize: "16px" }}>
                        {contract.deposit?.toLocaleString()} ₫
                      </Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Status" span={2}>
                      <Tag 
                        color={getStatusColor(contract.status)}
                        style={{ fontSize: "14px", padding: "4px 8px" }}
                      >
                        {getStatusText(contract.status)}
                      </Tag>
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
                <Card title="Landlord Information">
                  <Descriptions bordered column={1} size={isMobile ? "small" : "default"}>
                    <Descriptions.Item label="Landlord Name">
                      <Text strong>{contract.landlordName}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Phone Number">
                      <Text>{contract.landlordPhone}</Text>
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              </div>
              <div style={{ flex: 1, minWidth: isMobile ? "100%" : 280, maxWidth: isMobile ? "100%" : 350, marginTop: isMobile ? 16 : 0 }}>
                <Card title="Contract Terms" style={{ position: isMobile ? "static" : "sticky", top: 20 }}>
                  <div>
                    {contract.terms?.map((term, index) => (
                      <div key={index} style={{ marginBottom: 12 }}>
                        <Text style={{ fontSize: isMobile ? 14 : 16 }}>• {term}</Text>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 24 }}>
                    <Button
                      type="primary"
                      icon={<FileTextOutlined />}
                      block
                      size={isMobile ? "middle" : "large"}
                    >
                      Download Contract
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
} 