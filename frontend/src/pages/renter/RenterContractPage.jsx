import React, { useEffect, useState, useCallback } from "react";
import { Card, Descriptions, Tag, Spin, Typography, Button, message, Row, Col, Modal, List, DatePicker, Alert, Badge, Statistic, Timeline, Divider } from "antd";
import { FileTextOutlined, HistoryOutlined, ReloadOutlined, BellOutlined, InfoCircleOutlined, ClockCircleOutlined } from "@ant-design/icons";
import RenterSidebar from "../../components/layout/RenterSidebar";
import dayjs from "dayjs";
import { getRenterContracts, exportContractPdf } from "../../services/contractApi";
import { getPersonalInfo } from "../../services/userApi";
import { getContractAmendments, approveAmendment, rejectAmendment, renewContract } from "../../services/roomUserApi";
import { useSelector } from "react-redux";

const { Title, Text } = Typography;
const { Countdown } = Statistic;

export default function RenterContractPage() {
  const [contract, setContract] = useState(null);
  const [contractHistory, setContractHistory] = useState([]);
  const [renterInfo, setRenterInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [amendmentsModalOpen, setAmendmentsModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [amendments, setAmendments] = useState([]);
  const [amendmentLoading, setAmendmentLoading] = useState(false);
  const [approvingId, setApprovingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectLoading, setRejectLoading] = useState(false);
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [renewReason, setRenewReason] = useState("");
  const [renewEndDate, setRenewEndDate] = useState(null);
  const [renewingContract, setRenewingContract] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [hasNewChanges, setHasNewChanges] = useState(false);
  const [previousContractId, setPreviousContractId] = useState(null);
  const user = useSelector((state) => state.account.user);

  const fetchData = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      // Get current renter's contracts
      const contractRes = await getRenterContracts();
      const contracts = contractRes.data || contractRes;
      
      let currentContract = null;
      if (contracts && contracts.length > 0) {
        // Prioritize ACTIVE contract, if not available then get the contract with the latest end date
        const active = contracts.find(c => c.contractStatus === "ACTIVE");
        if (active) {
          currentContract = active;
        } else {
          const sorted = [...contracts].sort((a, b) => new Date(b.contractEndDate) - new Date(a.contractEndDate));
          currentContract = sorted[0];
        }
        
        // Check for contract changes
        if (previousContractId && currentContract && currentContract.id !== previousContractId) {
          setHasNewChanges(true);
          message.success({
            content: `🔄 Phát hiện hợp đồng mới! ID: ${currentContract.id}`,
            duration: 5,
            key: 'new-contract'
          });
        }
        
        setPreviousContractId(currentContract?.id);
        setContractHistory(contracts.sort((a, b) => new Date(b.updatedDate || b.createdDate) - new Date(a.updatedDate || a.createdDate)));
      }
      
      setContract(currentContract);
      
      // Get current renter's information
      const renter = await getPersonalInfo();
      setRenterInfo(renter);
      setLastUpdated(new Date());
    } catch (err) {
      if (!showRefreshIndicator) {
        message.error("Không thể tải thông tin hợp đồng hoặc thông tin người thuê");
      }
      setContract(null);
      setRenterInfo(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [previousContractId]);

  useEffect(() => {
    fetchData();
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [fetchData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    let interval = null;
    if (autoRefresh && contract) {
      interval = setInterval(() => {
        fetchData(true);
      }, 30000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, contract, fetchData]);

  const manualRefresh = () => {
    fetchData(true);
    setHasNewChanges(false);
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
    if (approvingId === amendmentId) return; // Prevent double clicks
    
    setApprovingId(amendmentId);
    
    try {
      await approveAmendment(amendmentId, false); // false = tenant/renter approval
      message.success({
        content: "Đã phê duyệt thành công!",
        key: `approve-${amendmentId}`,
        duration: 3
      });
      // Refresh amendments data instead of optimistic update
      setTimeout(async () => {
        const res = await getContractAmendments(contract.id);
        setAmendments(res.data || res);
      }, 300);
    } catch {
      message.error({
        content: "Phê duyệt thất bại!",
        key: `approve-error-${amendmentId}`,
        duration: 4
      });
    } finally {
      setApprovingId(null);
    }
  };

  const handleRejectAmendment = (amendmentId) => {
    if (rejectingId) return; // Prevent multiple modals
    setRejectingId(amendmentId);
    setRejectReason("");
    setRejectModalOpen(true);
  };

  const doRejectAmendment = async () => {
    if (!rejectReason) {
      message.error({
        content: "Vui lòng nhập lý do từ chối!",
        key: 'reject-validation'
      });
      return;
    }
    
    if (rejectLoading) return; // Prevent multiple submissions
    
    setRejectLoading(true);
    
    try {
      await rejectAmendment(rejectingId, rejectReason);
      message.success({
        content: "Đã từ chối thành công!",
        key: `reject-${rejectingId}`,
        duration: 3
      });
      // Refresh amendments data instead of optimistic update
      setTimeout(async () => {
        const res = await getContractAmendments(contract.id);
        setAmendments(res.data || res);
      }, 300);
      setRejectModalOpen(false);
      setRejectingId(null);
      setRejectReason("");
    } catch {
      message.error({
        content: "Từ chối thất bại!",
        key: `reject-error-${rejectingId}`,
        duration: 4
      });
    } finally {
      setRejectLoading(false);
    }
  };

  const handleExportPdf = async () => {
    if (!contract?.id) return;
    try {
      const blob = await exportContractPdf(contract.id);
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (err) {
      message.error("Tải xuống hợp đồng thất bại!");
    }
  };

  const openRenewModal = () => {
    setRenewModalOpen(true);
    setRenewReason("");
    setRenewEndDate(null);
  };
  const handleSendRenewRequest = async () => {
    if (!renewEndDate) {
      message.error({
        content: 'Vui lòng chọn ngày kết thúc mới!',
        key: 'renew-validation'
      });
      return;
    }
    
    // Prevent multiple simultaneous requests
    if (renewingContract) {
      return;
    }
    
    // Validate ngày kết thúc mới
    const contractEnd = dayjs(contract.contractEndDate);
    const selectedEnd = dayjs(renewEndDate);
    const monthsDiff = selectedEnd.diff(contractEnd, 'month', true); // true để lấy số thập phân
    
    // Validate theo chu kỳ thanh toán
    if (contract.paymentCycle === 'MONTHLY') {
      if (monthsDiff < 1) {
        message.error({
          content: 'Thời gian gia hạn phải tối thiểu 1 tháng!',
          key: 'renew-validation'
        });
        return;
      }
    } else if (contract.paymentCycle === 'QUARTERLY') {
      if (monthsDiff < 3 || Math.abs(monthsDiff % 3) > 0.1) { // Allow small floating point errors
        message.error({
          content: 'Thời gian gia hạn phải là bội số của quý (3, 6, 9... tháng)!',
          key: 'renew-validation'
        });
        return;
      }
    } else if (contract.paymentCycle === 'YEARLY') {
      if (monthsDiff < 12 || Math.abs(monthsDiff % 12) > 0.1) { // Allow small floating point errors
        message.error({
          content: 'Thời gian gia hạn phải là bội số của năm (12, 24, 36... tháng)!',
          key: 'renew-validation'
        });
        return;
      }
    }
    
    // Kiểm tra có đang trong thời gian cho phép gia hạn (30 ngày trước hết hạn)
    const daysToExpiry = contractEnd.diff(dayjs(), 'day');
    if (daysToExpiry > 30) {
      message.error({
        content: 'Chỉ có thể yêu cầu gia hạn trong vòng 30 ngày trước khi hợp đồng hết hạn!',
        key: 'renew-validation'
      });
      return;
    }
    
    setRenewingContract(true);
    
    try {
      // Sử dụng standardized renewal request logic
      const formattedDate = dayjs(renewEndDate).endOf('day').toISOString();
      await renewContract(contract.id, formattedDate, renewReason);
      
      message.success({
        content: 'Đã gửi yêu cầu gia hạn, chờ chủ nhà duyệt!',
        key: 'renew-success',
        duration: 4
      });
      setRenewModalOpen(false);
      setRenewEndDate(null);
      setRenewReason("");
      
      // Refresh data after a short delay to ensure backend is updated
      setTimeout(() => {
        fetchData();
      }, 500);
    } catch (e) {
      let errorMsg = 'Gửi yêu cầu gia hạn thất bại!';
      
      if (e.response?.data?.message) {
        errorMsg = e.response.data.message;
      } else if (e.response?.data) {
        errorMsg = e.response.data;
      } else if (e.message) {
        errorMsg = e.message;
      }
      
      message.error({
        content: errorMsg,
        key: 'renew-error',
        duration: 5
      });
    } finally {
      setRenewingContract(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <RenterSidebar />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center" }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>Đang tải thông tin hợp đồng...</div>
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
          {/* Header with refresh controls */}
          <div style={{ 
            background: "#fff", 
            borderRadius: "8px 8px 0 0", 
            padding: 16, 
            borderBottom: "1px solid #f0f0f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12
          }}>
            <div>
              <Title level={2} style={{ margin: 0, color: "#1890ff", fontSize: isMobile ? 20 : 28 }}>
                <FileTextOutlined style={{ marginRight: 8 }} />
                Hợp đồng thuê nhà
                {hasNewChanges && <Badge count="Mới" style={{ marginLeft: 8 }} />}
              </Title>
              {lastUpdated && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Cập nhật lần cuối: {lastUpdated.toLocaleTimeString('vi-VN')}
                </Text>
              )}
            </div>
          </div>

          <Card style={{ borderRadius: "0 0 16px 16px", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", margin: "0 auto", background: "#fff" }}>
            {hasNewChanges && (
              <Alert
                message="Có thay đổi mới trong hợp đồng!"
                description="Hệ thống đã phát hiện hợp đồng mới hoặc có cập nhật. Vui lòng kiểm tra thông tin."
                type="info"
                showIcon
                closable
                onClose={() => setHasNewChanges(false)}
                style={{ marginBottom: 16 }}
              />
            )}

            <div style={{ marginBottom: isMobile ? 16 : 24, textAlign: "center" }}>
              <Text type="secondary" style={{ display: "block", fontSize: isMobile ? 14 : 16 }}>
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
              {/* Main contract info */}
              <div style={{ flex: 1, minWidth: isMobile ? "100%" : 340, maxWidth: isMobile ? "100%" : 600 }}>
                <Card title={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Thông tin hợp đồng</span>
                    <Tag 
                      color={getStatusColor(contract.contractStatus || contract.status)}
                      style={{ fontSize: "12px", fontWeight: "bold" }}
                    >
                      {getStatusText(contract.contractStatus || contract.status)}
                    </Tag>
                  </div>
                } style={{ marginBottom: 24 }}>
                  <Descriptions bordered column={2} size={isMobile ? "small" : "default"}>
                    <Descriptions.Item label="Mã hợp đồng">
                      <Text strong style={{ color: "#1890ff" }}>
                        #{contract.id || contract.contractNumber}
                      </Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Phòng">
                      <Tag color="blue" style={{ fontWeight: "bold" }}>
                        {contract.roomNumber}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Ngày bắt đầu">
                      <Text>
                        <ClockCircleOutlined style={{ marginRight: 4, color: "#52c41a" }} />
                        {dayjs(contract.contractStartDate || contract.startDate).format("DD/MM/YYYY")}
                      </Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Ngày kết thúc">
                      <Text>
                        <ClockCircleOutlined style={{ marginRight: 4, color: "#ff4d4f" }} />
                        {dayjs(contract.contractEndDate || contract.endDate).format("DD/MM/YYYY")}
                      </Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Tiền thuê hàng tháng">
                      <Text strong style={{ color: "#52c41a", fontSize: "16px" }}>
                        {contract.rentAmount?.toLocaleString() || contract.monthlyRent?.toLocaleString()} ₫/tháng
                      </Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Tiền đặt cọc">
                      <Text strong style={{ color: "#faad14", fontSize: "16px" }}>
                        {contract.depositAmount?.toLocaleString() || contract.deposit?.toLocaleString()} ₫
                      </Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Chu kỳ thanh toán">
                      <Tag color="purple">
                        {contract.paymentCycle === 'MONTHLY' ? 'Hàng tháng' : 
                         contract.paymentCycle === 'QUARTERLY' ? 'Hàng quý' : 'Hàng năm'}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Thời gian còn lại">
                      {contract.contractStatus === 'ACTIVE' && dayjs(contract.contractEndDate).isAfter(dayjs()) ? (
                        <Countdown
                          value={dayjs(contract.contractEndDate).valueOf()}
                          format="D [ngày] H [giờ] m [phút]"
                          valueStyle={{ fontSize: '14px', color: dayjs(contract.contractEndDate).diff(dayjs(), 'day') <= 30 ? '#ff4d4f' : '#52c41a' }}
                        />
                      ) : (
                        <Text type={contract.contractStatus === 'EXPIRED' ? 'danger' : 'secondary'}>
                          {contract.contractStatus === 'EXPIRED' ? 'Đã hết hạn' : 'Không xác định'}
                        </Text>
                      )}
                    </Descriptions.Item>
                  </Descriptions>
                  
                  {/* Quick actions */}
                  <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Button
                      type="primary"
                      icon={<FileTextOutlined />}
                      onClick={handleExportPdf}
                      style={{ flex: 1, minWidth: 120 }}
                    >
                      Tải hợp đồng PDF
                    </Button>
                    
                    {((contract.contractStatus === 'ACTIVE' && dayjs(contract.contractEndDate).diff(dayjs(), 'day') <= 30 && dayjs(contract.contractEndDate).diff(dayjs(), 'day') >= 0)
                      || contract.contractStatus === 'EXPIRED') && (
                      <Button 
                        type="default" 
                        onClick={openRenewModal}
                        style={{ flex: 1, minWidth: 120 }}
                      >
                        Yêu cầu gia hạn
                      </Button>
                    )}
                  </div>
                </Card>
                
                {/* Renter info */}
                <Card title="Thông tin người thuê">
                  <Descriptions bordered column={1} size={isMobile ? "small" : "default"}>
                    <Descriptions.Item label="Họ và tên">
                      <Text strong>{renterInfo?.fullName}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Số điện thoại">
                      <Text>{renterInfo?.phoneNumber}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="CCCD/CMND">
                      <Text>{renterInfo?.nationalID || 'Chưa cập nhật'}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Địa chỉ thường trú">
                      <Text>{renterInfo?.permanentAddress || 'Chưa cập nhật'}</Text>
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              </div>

              {/* Terms and actions */}
              <div style={{ flex: 1, minWidth: isMobile ? "100%" : 280, maxWidth: isMobile ? "100%" : 350, marginTop: isMobile ? 16 : 0 }}>
                <Card title="Điều khoản hợp đồng" style={{ position: isMobile ? "static" : "sticky", top: 20, marginBottom: 16 }}>
                  <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                    {contract.terms?.length > 0 ? contract.terms.map((term, index) => (
                      <div key={index} style={{ marginBottom: 12, padding: 8, background: '#f9f9f9', borderRadius: 4 }}>
                        <Text style={{ fontSize: isMobile ? 14 : 16 }}>
                          <InfoCircleOutlined style={{ marginRight: 6, color: '#1890ff' }} />
                          {typeof term === 'object' ? term.content : term}
                        </Text>
                      </div>
                    )) : (
                      <Text type="secondary" style={{ fontStyle: 'italic' }}>
                        Không có điều khoản cụ thể được ghi nhận.
                      </Text>
                    )}
                  </div>
                </Card>

                {/* Amendment history quick view */}
                <Card title="Thay đổi gần đây" size="small">
                  <Button
                    type="link"
                    icon={<HistoryOutlined />}
                    onClick={handleViewAmendments}
                    style={{ padding: 0 }}
                  >
                    Xem tất cả thay đổi hợp đồng
                  </Button>
                </Card>
              </div>
            </div>
          </Card>
        </div>
        
        {/* Contract History Modal */}
        <Modal
          open={historyModalOpen}
          onCancel={() => setHistoryModalOpen(false)}
          footer={null}
          title="Lịch sử hợp đồng"
          width={800}
        >
          <Timeline mode="left">
            {contractHistory.map((hist, index) => (
              <Timeline.Item
                key={hist.id}
                color={hist.contractStatus === 'ACTIVE' ? 'green' : hist.contractStatus === 'EXPIRED' ? 'red' : 'blue'}
                label={
                  <div style={{ textAlign: 'right', minWidth: 120 }}>
                    <div style={{ fontWeight: 'bold' }}>#{hist.id}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>
                      {dayjs(hist.updatedDate || hist.createdDate).format('DD/MM/YYYY')}
                    </div>
                  </div>
                }
              >
                <Card size="small" style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Tag color={getStatusColor(hist.contractStatus)}>
                      {getStatusText(hist.contractStatus)}
                    </Tag>
                    {index === 0 && <Badge count="Hiện tại" style={{ backgroundColor: '#52c41a' }} />}
                  </div>
                  <div style={{ fontSize: 13 }}>
                    <div><strong>Phòng:</strong> {hist.roomNumber}</div>
                    <div><strong>Thời gian:</strong> {dayjs(hist.contractStartDate).format('DD/MM/YYYY')} - {dayjs(hist.contractEndDate).format('DD/MM/YYYY')}</div>
                    <div><strong>Tiền thuê:</strong> {hist.rentAmount?.toLocaleString()} ₫/tháng</div>
                    {hist.contractStatus === 'ACTIVE' && (
                      <div style={{ marginTop: 8 }}>
                        <Button
                          size="small"
                          type="primary"
                          icon={<FileTextOutlined />}
                          onClick={() => {
                            setHistoryModalOpen(false);
                            handleExportPdf();
                          }}
                        >
                          Tải PDF
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              </Timeline.Item>
            ))}
          </Timeline>
        </Modal>

        {/* Amendment History Modal */}
        <Modal
          open={amendmentsModalOpen}
          onCancel={() => setAmendmentsModalOpen(false)}
          footer={null}
          title="Lịch sử thay đổi hợp đồng"
          width={700}
        >
          {amendmentLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Spin size="large" />
            </div>
          ) : (
            <List
              dataSource={amendments}
              renderItem={item => {
                const isMyTurn = user && item.status === 'PENDING' && item.pendingApprovals?.includes(user.id) && !(item.approvedBy || []).includes(user.id) && !(item.rejectedBy || []).includes(user.id);
                return (
                  <List.Item
                    actions={[
                      isMyTurn && (
                        <div key="actions" style={{ display: 'flex', gap: 8 }}>
                          <Button
                            type="primary"
                            size="small"
                            loading={approvingId === item.id}
                            onClick={() => handleApproveAmendment(item.id)}
                            disabled={approvingId && approvingId !== item.id}
                          >
                            Duyệt
                          </Button>
                          <Button
                            danger
                            size="small"
                            loading={rejectingId === item.id && rejectModalOpen}
                            onClick={() => handleRejectAmendment(item.id)}
                            disabled={rejectingId && rejectingId !== item.id}
                          >
                            Từ chối
                          </Button>
                        </div>
                      )
                    ]}
                  >
                    <div style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ color: '#222', fontSize: 15, fontWeight: 500, marginBottom: 4 }}>
                            {item.reason}
                          </div>
                          <div style={{ color: '#666', fontSize: 12 }}>
                            Ngày tạo: {item.createdDate ? dayjs(item.createdDate).format("DD/MM/YYYY HH:mm") : 'Không có'}
                          </div>
                        </div>
                        <Tag color={
                          item.status === 'APPROVED' ? 'green' :
                          item.status === 'REJECTED' ? 'red' :
                          item.status === 'PENDING' ? 'orange' : 'default'
                        }>
                          {item.status === 'APPROVED' ? 'Đã duyệt' :
                           item.status === 'REJECTED' ? 'Đã từ chối' :
                           item.status === 'PENDING' ? 'Chờ duyệt' : item.status}
                        </Tag>
                      </div>
                      {isMyTurn && (
                        <Alert
                          message="Cần phê duyệt của bạn"
                          type="warning"
                          size="small"
                          showIcon
                          style={{ marginTop: 8 }}
                        />
                      )}
                    </div>
                  </List.Item>
                );
              }}
              locale={{ emptyText: "Không có thay đổi nào" }}
            />
          )}
        </Modal>

        {/* Renewal Request Modal */}
        <Modal
          open={renewModalOpen}
          onCancel={() => setRenewModalOpen(false)}
          onOk={handleSendRenewRequest}
          okText="Gửi yêu cầu"
          confirmLoading={renewingContract}
          title="Yêu cầu gia hạn hợp đồng"
          width={600}
        >
          <div style={{ marginBottom: 16 }}>
            <Alert
              message="Thông tin hợp đồng hiện tại"
              description={
                <div>
                  <div>• Ngày kết thúc: {dayjs(contract.contractEndDate).format("DD/MM/YYYY")}</div>
                  <div>• Chu kỳ thanh toán: {contract.paymentCycle === 'MONTHLY' ? 'Hàng tháng' : contract.paymentCycle === 'QUARTERLY' ? 'Hàng quý' : 'Hàng năm'}</div>
                </div>
              }
              type="info"
              showIcon
            />
          </div>
          
          <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#f6f6f6', borderRadius: 6 }}>
            <div style={{ fontWeight: 'bold', marginBottom: 8 }}>📋 Lưu ý về thời gian gia hạn:</div>
            <div>• Chỉ có thể yêu cầu gia hạn trong vòng 30 ngày trước khi hết hạn</div>
            <div>• Thời gian gia hạn phải phù hợp với chu kỳ thanh toán:</div>
            <div style={{ marginLeft: 16, color: '#1890ff', fontWeight: 500 }}>
              {contract.paymentCycle === 'MONTHLY' && '→ Tối thiểu 1 tháng (có thể gia hạn bất kỳ số tháng nào)'}
              {contract.paymentCycle === 'QUARTERLY' && '→ Tối thiểu 3 tháng (bội số của quý: 3, 6, 9...)'}
              {contract.paymentCycle === 'YEARLY' && '→ Tối thiểu 12 tháng (bội số của năm: 12, 24, 36...)'}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontWeight: 'bold', marginBottom: 8, display: 'block' }}>
              📅 Ngày kết thúc mới:
            </label>
            <DatePicker
              style={{ width: '100%' }}
              value={renewEndDate ? dayjs(renewEndDate) : null}
              onChange={d => setRenewEndDate(d ? d.toISOString() : null)}
              format="DD/MM/YYYY"
              placeholder="Chọn ngày kết thúc mới"
              disabledDate={current => {
                if (!current || !contract.contractEndDate) return true;
                return current <= dayjs(contract.contractEndDate);
              }}
            />
          </div>
          
          <div>
            <label style={{ fontWeight: 'bold', marginBottom: 8, display: 'block' }}>
              📝 Lý do gia hạn:
            </label>
            <textarea
              value={renewReason}
              onChange={e => setRenewReason(e.target.value)}
              rows={3}
              style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #d9d9d9' }}
              placeholder="Nhập lý do hoặc mong muốn gia hạn (không bắt buộc)"
            />
          </div>
        </Modal>

        {/* Reject Amendment Modal */}
        <Modal
          open={rejectModalOpen}
          onCancel={() => {
            setRejectModalOpen(false);
            setRejectingId(null);
            setRejectReason("");
          }}
          onOk={doRejectAmendment}
          okText="Xác nhận từ chối"
          okType="danger"
          title="Lý do từ chối thay đổi hợp đồng"
          confirmLoading={rejectLoading}
        >
          <Alert
            message="Bạn đang từ chối thay đổi hợp đồng"
            description="Vui lòng nhập lý do cụ thể để landlord hiểu và có thể điều chỉnh đề xuất."
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <div style={{ marginBottom: 8, fontWeight: 'bold' }}>Lý do từ chối:</div>
          <textarea
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            rows={4}
            style={{ 
              width: '100%', 
              padding: 8, 
              borderRadius: 4, 
              border: '1px solid #d9d9d9',
              fontSize: 14
            }}
            placeholder="VD: Thời gian không phù hợp, mức giá quá cao, điều khoản chưa rõ ràng..."
          />
        </Modal>
      </div>
    </div>
  );
} 