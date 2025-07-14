import React, { useEffect, useState } from "react";
import { Card, Descriptions, Tag, Spin, Typography, Button, message, Row, Col, Modal, List } from "antd";
import { FileTextOutlined } from "@ant-design/icons";
import RenterSidebar from "../../components/layout/RenterSidebar";
import dayjs from "dayjs";
import { getRenterContracts, exportContractPdf } from "../../services/contractApi";
import { getPersonalInfo } from "../../services/userApi";
import { getContractAmendments, approveAmendment, rejectAmendment } from "../../services/roomUserApi";
import { useSelector } from "react-redux";

const { Title, Text } = Typography;

export default function RenterContractPage() {
  const [contract, setContract] = useState(null);
  const [renterInfo, setRenterInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [amendmentsModalOpen, setAmendmentsModalOpen] = useState(false);
  const [amendments, setAmendments] = useState([]);
  const [amendmentLoading, setAmendmentLoading] = useState(false);
  const [approvingId, setApprovingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectLoading, setRejectLoading] = useState(false);
  const user = useSelector((state) => state.account.user);

  useEffect(() => {
    fetchData();
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Get current renter's contracts
      const contractRes = await getRenterContracts();
      const contracts = contractRes.data || contractRes; // depending on backend response
      if (contracts && contracts.length > 0) {
        // Prioritize ACTIVE contract, if not available then get the contract with the latest end date
        const active = contracts.find(c => c.contractStatus === "ACTIVE");
        if (active) {
          setContract(active);
        } else {
          const sorted = [...contracts].sort((a, b) => new Date(b.contractEndDate) - new Date(a.contractEndDate));
          setContract(sorted[0]);
        }
      } else {
        setContract(null);
      }
      // Get current renter's information
      const renter = await getPersonalInfo();
      setRenterInfo(renter);
    } catch (err) {
      message.error("Unable to load contract or renter information");
      setContract(null);
      setRenterInfo(null);
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
      case "ACTIVE": return "Đang hiệu lực";
      case "EXPIRED": return "Hết hạn";
      case "PENDING": return "Chờ phê duyệt";
      default: return status;
    }
  };

  const handleViewAmendments = async () => {
    if (!contract?.id) return;
    setAmendmentsModalOpen(true);
    setAmendmentLoading(true);
    try {
      const res = await getContractAmendments(contract.id);
      setAmendments(res.data || res);
    } catch {
      setAmendments([]);
    }
    setAmendmentLoading(false);
  };

  const handleApproveAmendment = async (amendmentId) => {
    setApprovingId(amendmentId);
    try {
      await approveAmendment(amendmentId, false); // false = tenant/renter approval
      message.success("Amendment approved!");
      // Optimistic update - immediately update local state
      setAmendments(prev => prev.map(item => 
        item.id === amendmentId ? { ...item, status: 'APPROVED', approvedBy: [...(item.approvedBy || []), user?.id] } : item
      ));
    } catch {
      message.error("Approval failed!");
    }
    setApprovingId(null);
  };

  const handleRejectAmendment = (amendmentId) => {
    setRejectingId(amendmentId);
    setRejectReason("");
    setRejectModalOpen(true);
  };

  const doRejectAmendment = async () => {
    if (!rejectReason) {
      message.error("Please enter a rejection reason!");
      return;
    }
    setRejectLoading(true);
    try {
      await rejectAmendment(rejectingId, rejectReason);
      message.success("Amendment rejected!");
      // Optimistic update - immediately update local state
      setAmendments(prev => prev.map(item => 
        item.id === rejectingId ? { ...item, status: 'REJECTED', approvedBy: [...(item.approvedBy || []), user?.id] } : item
      ));
      setRejectModalOpen(false);
      setRejectingId(null);
      setRejectReason("");
    } catch {
      message.error("Rejection failed!");
    }
    setRejectLoading(false);
  };

  const handleExportPdf = async () => {
    if (!contract?.id) return;
    try {
      const blob = await exportContractPdf(contract.id);
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (err) {
      message.error("Failed to download contract!");
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
            <Title level={3}>Chưa có hợp đồng</Title>
            <Text type="secondary">Bạn chưa có hợp đồng thuê nào.</Text>
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
                Hợp đồng thuê nhà
              </Title>
              <Text type="secondary" style={{ display: "block", textAlign: "center", marginBottom: isMobile ? 16 : 24, fontSize: isMobile ? 14 : 16 }}>
                Thông tin chi tiết về hợp đồng thuê nhà của bạn
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
                <Card title="Thông tin hợp đồng" style={{ marginBottom: 24 }}>
                  <Descriptions bordered column={2} size={isMobile ? "small" : "default"}>
                    <Descriptions.Item label="Mã hợp đồng">
                      <Text strong style={{ color: "#1890ff" }}>
                        {contract.id || contract.contractNumber}
                      </Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Phòng">
                      <Tag color="blue" style={{ fontWeight: "bold" }}>
                        {contract.roomNumber}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Ngày bắt đầu">
                      <Text>{dayjs(contract.contractStartDate || contract.startDate).format("DD/MM/YYYY")}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Ngày kết thúc">
                      <Text>{dayjs(contract.contractEndDate || contract.endDate).format("DD/MM/YYYY")}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Tiền thuê hàng tháng">
                      <Text strong style={{ color: "#52c41a", fontSize: "16px" }}>
                        {contract.rentAmount?.toLocaleString() || contract.monthlyRent?.toLocaleString()} ₫
                      </Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Tiền đặt cọc">
                      <Text strong style={{ color: "#faad14", fontSize: "16px" }}>
                        {contract.depositAmount?.toLocaleString() || contract.deposit?.toLocaleString()} ₫
                      </Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Trạng thái" span={2}>
                      <Tag 
                        color={getStatusColor(contract.contractStatus || contract.status)}
                        style={{ fontSize: "14px", padding: "4px 8px" }}
                      >
                        {getStatusText(contract.contractStatus || contract.status)}
                      </Tag>
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
                <Card title="Thông tin người thuê">
                  <Descriptions bordered column={1} size={isMobile ? "small" : "default"}>
                    <Descriptions.Item label="Họ và tên">
                      <Text strong>{renterInfo?.fullName}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Số điện thoại">
                      <Text>{renterInfo?.phoneNumber}</Text>
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              </div>
              <div style={{ flex: 1, minWidth: isMobile ? "100%" : 280, maxWidth: isMobile ? "100%" : 350, marginTop: isMobile ? 16 : 0 }}>
                <Card title="Điều khoản hợp đồng" style={{ position: isMobile ? "static" : "sticky", top: 20 }}>
                  <div>
                    {contract.terms?.length > 0 ? contract.terms.map((term, index) => (
                      <div key={index} style={{ marginBottom: 12 }}>
                        <Text style={{ fontSize: isMobile ? 14 : 16 }}>• {term}</Text>
                      </div>
                    )) : <Text type="secondary">Không có điều khoản cụ thể.</Text>}
                  </div>
                  <div style={{ marginTop: 24 }}>
                    <Button
                      type="primary"
                      icon={<FileTextOutlined />}
                      block
                      size={isMobile ? "middle" : "large"}
                      onClick={handleExportPdf}
                    >
                      Tải hợp đồng
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
            <div style={{ marginTop: 24, textAlign: "center" }}>
              <Button type="default" onClick={handleViewAmendments}>
                Xem lịch sử thay đổi hợp đồng
              </Button>
            </div>
          </Card>
        </div>
        <Modal
          open={amendmentsModalOpen}
          onCancel={() => setAmendmentsModalOpen(false)}
          footer={null}
          title="Lịch sử thay đổi hợp đồng"
        >
          {amendmentLoading ? (
            <Spin />
          ) : (
            <List
              dataSource={amendments}
              renderItem={item => (
                <List.Item
                  actions={[
                    item.status === 'PENDING' && !(item.approvedBy || []).includes(user?.id) && (
                      <>
                        <Button
                          type="primary"
                          loading={approvingId === item.id}
                          onClick={() => handleApproveAmendment(item.id)}
                        >
                          Duyệt
                        </Button>
                        <Button
                          danger
                          loading={rejectingId === item.id && rejectModalOpen}
                          onClick={() => handleRejectAmendment(item.id)}
                          style={{ marginLeft: 8 }}
                        >
                          Từ chối
                        </Button>
                      </>
                    )
                  ]}
                >
                  <div>
                    <div style={{ color: '#222', fontSize: 15, fontWeight: 500, margin: '6px 0' }}>{item.reason}</div>
                    <div style={{ color: '#222', fontSize: 13, marginTop: 2 }}>
                      Ngày tạo: {item.createdDate ? dayjs(item.createdDate).format("DD/MM/YYYY") : 'Không có'}
                    </div>
                  </div>
                </List.Item>
              )}
              locale={{ emptyText: "Không có thay đổi nào" }}
            />
          )}
        </Modal>
        <Modal
          open={rejectModalOpen}
          onCancel={() => {
            setRejectModalOpen(false);
            setRejectingId(null);
            setRejectReason("");
          }}
          onOk={doRejectAmendment}
          okText="Xác nhận từ chối"
          title="Lý do từ chối thay đổi hợp đồng"
          confirmLoading={rejectLoading}
        >
          <div>Vui lòng nhập lý do từ chối:</div>
          <textarea
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            rows={3}
            style={{ width: '100%', marginTop: 8 }}
          />
        </Modal>
      </div>
    </div>
  );
} 