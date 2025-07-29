import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  Card,
  Descriptions,
  Table,
  Button,
  Spin,
  Tag,
  message,
  Modal,
  Typography,
  Row,
  Col,
  Space,
  Divider,
  Alert,
  Steps,
  Result,
} from "antd";
import {
  getBillDetail,
  createVnPayUrl,
  exportBillPdf,
} from "../../services/billApi";
import {
  ArrowLeftOutlined,
  DollarOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FileTextOutlined,
  CreditCardOutlined,
  PrinterOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import RenterSidebar from "../../components/layout/RenterSidebar";
import dayjs from "dayjs";
import { Layout } from "antd";

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;
const { Sider, Content } = Layout;

// Helper: Lấy ngày kết thúc từ bill.details nếu bill.toDate bị null hoặc không hợp lệ
function getFallbackToDate(bill) {
  if (!bill || !bill.details || !Array.isArray(bill.details)) return null;
  // Ưu tiên dòng tiền phòng, sau đó đến dịch vụ
  const roomRent = bill.details.find(d => d.itemType === 'ROOM_RENT');
  const anyDetail = bill.details[0];
  const regex = /đến (\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})/;
  let match = null;
  if (roomRent && roomRent.description) {
    match = roomRent.description.match(regex);
  }
  if (!match && anyDetail && anyDetail.description) {
    match = anyDetail.description.match(regex);
  }
  if (match && match[1]) {
    // Chuẩn hóa về định dạng YYYY-MM-DD nếu là DD/MM/YYYY
    let dateStr = match[1];
    if (/\d{2}\/\d{2}\/\d{4}/.test(dateStr)) {
      const [d, m, y] = dateStr.split('/');
      dateStr = `${y}-${m}-${d}`;
    }
    return dateStr;
  }
  return null;
}

export default function RenterBillDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const action = searchParams.get("action");

  // Kiểm tra hóa đơn quá hạn
  const checkOverdue = (bill) => {
    if (!bill || bill.status) return false; // Đã thanh toán thì không quá hạn
    
    const today = dayjs();
    
    // Parse dueDate nếu có
    let dueDate = null;
    if (bill.dueDate) {
      dueDate = dayjs(bill.dueDate, "YYYY-MM-DD HH:mm:ss A");
    }
    
    // Parse toDate nếu có
    let toDate = null;
    if (bill.toDate) {
      toDate = dayjs(bill.toDate, "YYYY-MM-DD HH:mm:ss A");
    }
    
    // Logic đơn giản: toDate + 7 ngày là hạn thanh toán
    const actualDueDate = dueDate || (toDate ? toDate.add(7, 'day') : null);
    
    return actualDueDate && today.isAfter(actualDueDate, 'day');
  };

  // Tính số ngày quá hạn
  const getOverdueDays = (bill) => {
    if (!bill || bill.status) return 0;
    
    const today = dayjs();
    
    // Parse dueDate nếu có
    let dueDate = null;
    if (bill.dueDate) {
      dueDate = dayjs(bill.dueDate, "YYYY-MM-DD HH:mm:ss A");
    }
    
    // Parse toDate nếu có
    let toDate = null;
    if (bill.toDate) {
      toDate = dayjs(bill.toDate, "YYYY-MM-DD HH:mm:ss A");
    }
    
    const actualDueDate = dueDate || (toDate ? toDate.add(7, 'day') : null);
    
    if (actualDueDate && today.isAfter(actualDueDate, 'day')) {
      return today.diff(actualDueDate, 'day');
    }
    return 0;
  };

  // Lấy màu sắc cho trạng thái quá hạn
  const getOverdueStatusColor = (isOverdue, overdueDays) => {
    if (!isOverdue) return "green";
    if (overdueDays <= 7) return "orange";
    if (overdueDays <= 30) return "red";
    return "volcano";
  };

  // Lấy văn bản cho trạng thái quá hạn
  const getOverdueStatusText = (isOverdue, overdueDays) => {
    if (!isOverdue) return "Chưa quá hạn";
    if (overdueDays <= 7) return `Quá hạn ${overdueDays} ngày`;
    if (overdueDays <= 30) return `Quá hạn ${overdueDays} ngày`;
    return `Quá hạn ${overdueDays} ngày`;
  };

  // Lấy icon cho trạng thái quá hạn
  const getOverdueStatusIcon = (isOverdue, overdueDays) => {
    if (!isOverdue) return <CheckCircleOutlined />;
    if (overdueDays <= 7) return <ClockCircleOutlined />;
    if (overdueDays <= 30) return <ExclamationCircleOutlined />;
    return <WarningOutlined />;
  };

  // Lấy thông tin hạn thanh toán để hiển thị
  const getDueDateInfo = (bill) => {
    if (!bill) return null;
    
    // Parse dueDate nếu có
    let dueDate = null;
    if (bill.dueDate) {
      dueDate = dayjs(bill.dueDate, "YYYY-MM-DD HH:mm:ss A");
    }
    
    // Parse toDate nếu có
    let toDate = null;
    if (bill.toDate) {
      toDate = dayjs(bill.toDate, "YYYY-MM-DD HH:mm:ss A");
    }
    
    if (dueDate) {
      return {
        date: dueDate,
        text: `Hạn thanh toán: ${dueDate.format('DD/MM/YYYY')}`,
        source: 'dueDate'
      };
    } else if (toDate) {
      const actualDueDate = toDate.add(7, 'day');
      return {
        date: actualDueDate,
        text: `Hạn thanh toán: 7 ngày sau kỳ tính tiền (${actualDueDate.format('DD/MM/YYYY')})`,
        source: 'calculated'
      };
    }
    
    return null;
  };

  useEffect(() => {
    fetchBill();
    if (action === "pay") {
      setPaymentModalVisible(true);
    }
  }, [id, action]);

  useEffect(() => {
    if (action === "pay" && bill && !bill.status) {
      setPaymentModalVisible(true);
    }
  }, [action, bill]);

  // Tự động kiểm tra trạng thái bill khi quay lại tab
  useEffect(() => {
    const handleVisibility = async () => {
      if (document.visibilityState === 'visible' && paymentModalVisible && currentStep === 1) {
        await fetchBill();
        if (bill && bill.status) {
          setCurrentStep(2);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, [paymentModalVisible, currentStep, bill]);

  const fetchBill = async () => {
    setLoading(true);
    try {
      const res = await getBillDetail(id);
      setBill(res);
    } catch {
      message.error("Không thể tải chi tiết hóa đơn");
    }
    setLoading(false);
  };

  const handlePayment = async () => {
    if (!bill) return;
    setPaymentLoading(true);
    try {
      const paymentUrl = await createVnPayUrl({
        billId: bill.id,
        amount: bill.totalAmount,
        orderInfo: `Thanh toan hoa don #${bill.id}`,
      });
      window.open(paymentUrl, "_blank");
      setCurrentStep(1);
    } catch (error) {
      message.error("Không thể tạo liên kết thanh toán");
    }
    setPaymentLoading(false);
  };

  const handleExportPDF = async () => {
    try {
      const blob = await exportBillPdf(id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `hoa-don-${bill.id}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      message.success("Đã tải xuống hóa đơn PDF");
    } catch (error) {
      message.error("Không thể tải xuống hóa đơn");
    }
  };

  const handleCheckPayment = async () => {
    await fetchBill();
    if (bill && bill.status) {
      setCurrentStep(2);
    } else {
      message.error(
        "Thanh toán không thành công. Vui lòng thử lại hoặc chờ một chút."
      );
    }
  };

  const getStatusColor = (status) => {
    return status ? "success" : "error";
  };

  const getStatusIcon = (status) => {
    return status ? <CheckCircleOutlined /> : <CloseCircleOutlined />;
  };

  const getStatusText = (status) => {
    return status ? "Đã thanh toán" : "Chưa thanh toán";
  };

  const getBillTypeColor = (type) => {
    switch (type) {
      case "REGULAR":
        return "blue";
      case "CUSTOM":
        return "orange";
      case "DEPOSIT":
        return "purple";
      case "SERVICE":
        return "green";
      case "CONTRACT_TOTAL":
        return "geekblue";
      case "CONTRACT_INIT":
        return "cyan";
      case "CONTRACT_ROOM_RENT":
        return "blue";
      case "OTHER":
        return "default";
      default:
        return "default";
    }
  };

  const getBillTypeText = (type) => {
    if (!type) return "Không xác định";
    if (
      type === "REGULAR" ||
      type === "ROOM_RENT" ||
      type === "CONTRACT_ROOM_RENT" ||
      (typeof type === "string" && type.includes("ROOM_RENT"))
    ) {
      return "Tiền phòng hợp đồng";
    }
    if (
      type === "SERVICE" ||
      type === "CONTRACT_SERVICE" ||
      (typeof type === "string" && type.includes("SERVICE"))
    ) {
      return "Dịch vụ";
    }
    if (
      type === "DEPOSIT" ||
      (typeof type === "string" && type.includes("DEPOSIT"))
    ) {
      return "Đặt cọc";
    }
    if (
      type === "CONTRACT_TOTAL" &&
      bill &&
      Array.isArray(bill.items) &&
      bill.items.length > 0 &&
      bill.items.every(
        (item) => item.itemType && item.itemType.includes("SERVICE")
      )
    ) {
      return "Dịch vụ";
    }
    if (type === "CONTRACT_TOTAL") {
      return "Tổng hợp đồng";
    }
    if (type === "CONTRACT_INIT") {
      return "Khởi tạo hợp đồng";
    }
    if (type === "CUSTOM") {
      return "Tùy chỉnh";
    }
    if (type === "OTHER") {
      return "Khác";
    }
    return type || "Không xác định";
  };

  const columns = [
    {
      title: "Mô tả",
      dataIndex: "description",
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: "Loại mục",
      dataIndex: "itemType",
      render: (type) => <Tag color="blue">{getBillTypeText(type)}</Tag>,
    },
    {
      title: "Dịch vụ",
      dataIndex: "serviceName",
      render: (name) => <Text>{name || "Không có"}</Text>,
    },
    {
      title: "Đơn giá",
      dataIndex: "unitPriceAtBill",
      align: "right",
      render: (price) =>
        price ? <Text>{price.toLocaleString()} ₫</Text> : "Không có",
    },
    {
      title: "Số lượng",
      dataIndex: "consumedUnits",
      align: "center",
      render: (units) => <Text>{units || "Không có"}</Text>,
    },
    {
      title: "Thành tiền",
      dataIndex: "itemAmount",
      align: "right",
      render: (amount) =>
        amount ? (
          <Text strong style={{ color: "#52c41a" }}>
            {amount.toLocaleString()} ₫
          </Text>
        ) : (
          "Không có"
        ),
    },
  ];

  const openPaymentModal = () => {
    if (bill && !bill.status) {
      setPaymentModalVisible(true);
    } else {
      message.info("Hóa đơn này đã được thanh toán.");
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <RenterSidebar />
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>Đang tải chi tiết hóa đơn...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!bill) {
    return (
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <Sider width={220} style={{ background: "#001529" }}>
          <RenterSidebar />
        </Sider>
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Result
            status="404"
            title="Không tìm thấy hóa đơn"
            subTitle="Hóa đơn bạn đang tìm kiếm không tồn tại."
            extra={
              <Button type="primary" onClick={() => navigate("/renter/bills")}>
                Quay lại danh sách
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  const isOverdue = checkOverdue(bill);
  const overdueDays = getOverdueDays(bill);
  const dueDateInfo = getDueDateInfo(bill);

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <RenterSidebar />
      <div style={{ flex: 1, padding: "20px", backgroundColor: "#f5f5f5" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Card
            style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
          >
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate("/renter/bills")}
                style={{ marginBottom: 16 }}
              >
                Quay lại danh sách
              </Button>

              <Title level={2} style={{ margin: 0, color: "#1890ff" }}>
                <FileTextOutlined style={{ marginRight: 8 }} />
                Chi tiết hóa đơn #{bill.id}
              </Title>

              <Space style={{ marginTop: 8 }}>
                <Tag
                  color={getStatusColor(bill.status)}
                  icon={getStatusIcon(bill.status)}
                >
                  {getStatusText(bill.status)}
                </Tag>
                <Tag color={getBillTypeColor(bill.billType)}>
                  {getBillTypeText(bill.billType)}
                </Tag>
                {isOverdue && (
                  <Tag
                    color={getOverdueStatusColor(isOverdue, overdueDays)}
                    icon={getOverdueStatusIcon(isOverdue, overdueDays)}
                  >
                    {getOverdueStatusText(isOverdue, overdueDays)}
                  </Tag>
                )}
              </Space>
            </div>

            {/* Thông báo thanh toán */}
            {!bill.status && (
              <Alert
                message={
                  isOverdue 
                    ? `Hóa đơn quá hạn ${overdueDays} ngày - Cần thanh toán gấp!`
                    : "Hóa đơn chưa thanh toán"
                }
                description={
                  <div>
                    {isOverdue ? (
                      <>
                        <p>Hóa đơn này đã quá hạn {overdueDays} ngày. Vui lòng thanh toán ngay để tránh phí trễ hạn và các biện pháp xử lý khác.</p>
                        {dueDateInfo && (
                          <p style={{ marginTop: 8, fontSize: '13px', color: '#666' }}>
                            <strong>Hạn thanh toán:</strong> {dueDateInfo.date.format('DD/MM/YYYY')}
                          </p>
                        )}
                        <p style={{ marginTop: 8 }}>Hiện chỉ hỗ trợ thanh toán VNPay.</p>
                      </>
                    ) : (
                      <>
                        <p>Vui lòng thanh toán hóa đơn này trước hạn để tránh phí trễ.</p>
                        {dueDateInfo && (
                          <p style={{ marginTop: 8, fontSize: '13px', color: '#666' }}>
                            <strong>Hạn thanh toán:</strong> {dueDateInfo.date.format('DD/MM/YYYY')}
                          </p>
                        )}
                        <p style={{ marginTop: 8 }}>Hiện chỉ hỗ trợ thanh toán VNPay.</p>
                      </>
                    )}
                  </div>
                }
                type={isOverdue ? "error" : "warning"}
                showIcon
                icon={isOverdue ? <ExclamationCircleOutlined /> : undefined}
                style={{ 
                  marginBottom: 24,
                  border: isOverdue ? '2px solid #ff4d4f' : undefined,
                  backgroundColor: isOverdue ? '#fff2f0' : undefined
                }}
                action={
                  <Button
                    type="primary"
                    danger={isOverdue}
                    icon={<DollarOutlined />}
                    onClick={openPaymentModal}
                    size={isOverdue ? "large" : "middle"}
                    style={isOverdue ? { 
                      fontWeight: 'bold',
                      background: '#ff4d4f',
                      borderColor: '#ff4d4f'
                    } : {}}
                  >
                    {isOverdue ? "Thanh toán gấp" : "Thanh toán VNPay"}
                  </Button>
                }
              />
            )}

            <Row gutter={24}>
              {/* Thông tin hóa đơn */}
              <Col span={16}>
                <Card title="Thông tin hóa đơn" style={{ marginBottom: 24 }}>
                  <Descriptions bordered column={2}>
                    <Descriptions.Item label="Mã hóa đơn">
                      <Text strong style={{ color: "#1890ff" }}>
                        #{bill.id}
                      </Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Phòng">
                      <Tag color="blue" style={{ fontWeight: "bold" }}>
                        {bill.roomNumber}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Mã hợp đồng">
                      {bill.contractId ? (
                        <Text strong>#{bill.contractId}</Text>
                      ) : (
                        <Text type="secondary">Không có</Text>
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="Loại hóa đơn">
                      <Tag color={getBillTypeColor(bill.billType)}>
                        {getBillTypeText(bill.billType)}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Từ ngày">
                      <Text>{bill.fromDate ? dayjs(bill.fromDate).format("DD/MM/YYYY") : "Không xác định"}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Đến ngày">
                      {bill.toDate && dayjs(bill.toDate, "YYYY-MM-DD HH:mm:ss A").isValid() ? (
                        <Text>{dayjs(bill.toDate, "YYYY-MM-DD HH:mm:ss A").format("DD/MM/YYYY")}</Text>
                      ) : getFallbackToDate(bill) ? (
                        <span style={{ color: '#faad14', fontWeight: 500 }}>
                          {dayjs(getFallbackToDate(bill)).isValid()
                            ? dayjs(getFallbackToDate(bill)).format('DD/MM/YYYY')
                            : getFallbackToDate(bill)}
                          {" "}(Lấy từ chi tiết hóa đơn)
                        </span>
                      ) : (
                        <span style={{ color: 'red', fontWeight: 500 }}>
                          Không xác định (Dữ liệu hóa đơn thiếu ngày kết thúc)
                        </span>
                      )}
                    </Descriptions.Item>
                    {dueDateInfo && (
                      <Descriptions.Item label="Hạn thanh toán" span={2}>
                        <Text 
                          strong 
                          style={{ 
                            color: isOverdue ? '#ff4d4f' : '#52c41a',
                            fontSize: '14px'
                          }}
                        >
                          {dueDateInfo.text}
                        </Text>
                        {dueDateInfo.source === 'calculated' && (
                          <div style={{ marginTop: 4 }}>
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              (Tính toán dựa trên chu kỳ thanh toán: {bill.paymentCycle})
                            </Text>
                          </div>
                        )}
                      </Descriptions.Item>
                    )}
                    <Descriptions.Item label="Tổng tiền" span={2}>
                      <Text
                        strong
                        style={{ color: "#52c41a", fontSize: "18px" }}
                      >
                        {bill.totalAmount?.toLocaleString()} ₫
                      </Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Trạng thái" span={2}>
                      <Tag
                        color={getStatusColor(bill.status)}
                        icon={getStatusIcon(bill.status)}
                        style={{ fontSize: "14px", padding: "4px 8px" }}
                      >
                        {getStatusText(bill.status)}
                      </Tag>
                    </Descriptions.Item>
                    {!bill.status && (
                      <Descriptions.Item label="Tình trạng quá hạn" span={2}>
                        <Tag
                          color={getOverdueStatusColor(isOverdue, overdueDays)}
                          icon={getOverdueStatusIcon(isOverdue, overdueDays)}
                          style={{ fontSize: "14px", padding: "4px 8px", fontWeight: "bold" }}
                        >
                          {getOverdueStatusText(isOverdue, overdueDays)}
                        </Tag>
                        {isOverdue && (
                          <div style={{ marginTop: 8 }}>
                            <Text type="danger" style={{ fontSize: "12px" }}>
                              ⚠️ Hóa đơn này đã quá hạn {overdueDays} ngày. Vui lòng thanh toán ngay để tránh phí trễ hạn.
                            </Text>
                          </div>
                        )}
                      </Descriptions.Item>
                    )}
                  </Descriptions>
                </Card>

                {/* Chi tiết hóa đơn */}
                <Card title="Chi tiết hóa đơn">
                  <Table
                    columns={columns}
                    dataSource={bill.details}
                    rowKey={(_, idx) => idx}
                    pagination={false}
                    size="small"
                    bordered
                    summary={(pageData) => {
                      const total = pageData.reduce(
                        (sum, record) => sum + (record.itemAmount || 0),
                        0
                      );
                      return (
                        <Table.Summary.Row>
                          <Table.Summary.Cell index={0} colSpan={5}>
                            <Text strong>Tổng cộng:</Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={1} align="right">
                            <Text
                              strong
                              style={{ color: "#52c41a", fontSize: "16px" }}
                            >
                              {total.toLocaleString()} ₫
                            </Text>
                          </Table.Summary.Cell>
                        </Table.Summary.Row>
                      );
                    }}
                  />
                </Card>
              </Col>

              {/* Sidebar - Thao tác */}
              <Col span={8}>
                <Card title="Thao tác" style={{ position: "sticky", top: 20 }}>
                  <Space direction="vertical" style={{ width: "100%" }}>
                    {!bill.status && (
                      <>
                        {isOverdue && (
                          <Alert
                            message="Hóa đơn quá hạn!"
                            description={
                              <div>
                                <p>Hóa đơn này đã quá hạn {overdueDays} ngày. Vui lòng thanh toán ngay để tránh phí trễ hạn.</p>
                                {dueDateInfo && (
                                  <p style={{ marginTop: 4, fontSize: '12px' }}>
                                    <strong>Hạn thanh toán:</strong> {dueDateInfo.date.format('DD/MM/YYYY')}
                                  </p>
                                )}
                              </div>
                            }
                            type="error"
                            showIcon
                            style={{ marginBottom: 16 }}
                          />
                        )}
                        <Button
                          type="primary"
                          danger={isOverdue}
                          size="large"
                          icon={<DollarOutlined />}
                          onClick={openPaymentModal}
                          block
                          style={isOverdue ? { 
                            fontWeight: 'bold',
                            background: '#ff4d4f',
                            borderColor: '#ff4d4f'
                          } : {}}
                        >
                          {isOverdue ? "Thanh toán gấp" : "Thanh toán VNPay"}
                        </Button>
                      </>
                    )}

                    <Button
                      size="large"
                      icon={<DownloadOutlined />}
                      onClick={handleExportPDF}
                      block
                    >
                      Tải PDF
                    </Button>

                    <Button
                      size="large"
                      icon={<PrinterOutlined />}
                      onClick={() => window.print()}
                      block
                    >
                      In hóa đơn
                    </Button>
                  </Space>

                  <Divider />

                  <div>
                    <Text strong>Thông tin thanh toán:</Text>
                    <Paragraph style={{ marginTop: 8 }}>
                      <Text type="secondary">
                        • Chỉ hỗ trợ thanh toán VNPay.
                        <br />• Có thể thanh toán trực tiếp tại văn phòng (nếu
                        cần).
                        {isOverdue && (
                          <>
                            <br />• <Text type="danger">Hóa đơn quá hạn có thể phát sinh phí trễ hạn.</Text>
                          </>
                        )}
                      </Text>
                    </Paragraph>
                  </div>
                </Card>
              </Col>
            </Row>
          </Card>
        </div>
      </div>

      {/* Modal thanh toán */}
      <Modal
        title="Thanh toán hóa đơn"
        open={paymentModalVisible}
        onCancel={() => {
          setPaymentModalVisible(false);
          setCurrentStep(0);
        }}
        footer={null}
        width={600}
      >
        <Steps current={currentStep} style={{ marginBottom: 24 }}>
          <Step title="Xác nhận" description="Xác nhận thông tin" />
          <Step title="Thanh toán" description="Chuyển đến VNPay" />
          <Step title="Hoàn tất" description="Xác nhận thanh toán" />
        </Steps>

        {currentStep === 0 && (
          <div>
            {isOverdue && (
              <Alert
                message="Cảnh báo: Hóa đơn quá hạn!"
                description={`Hóa đơn này đã quá hạn ${overdueDays} ngày. Vui lòng thanh toán ngay để tránh phí trễ hạn và các biện pháp xử lý khác.`}
                type="error"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}
            <Alert
              message="Thông tin thanh toán"
              description={
                <div>
                  <p>
                    <strong>Mã hóa đơn:</strong> #{bill.id}
                  </p>
                  <p>
                    <strong>Số tiền:</strong>{" "}
                    {bill.totalAmount?.toLocaleString()} ₫
                  </p>
                  <p>
                    <strong>Phòng:</strong> {bill.roomNumber}
                  </p>
                  {isOverdue && (
                    <p style={{ color: '#ff4d4f', fontWeight: 'bold' }}>
                      <strong>Tình trạng:</strong> Quá hạn {overdueDays} ngày
                    </p>
                  )}
                </div>
              }
              type="info"
              style={{ marginBottom: 16 }}
            />

            <Space>
              <Button
                type="primary"
                danger={isOverdue}
                loading={paymentLoading}
                onClick={handlePayment}
                icon={<CreditCardOutlined />}
                style={isOverdue ? { 
                  fontWeight: 'bold',
                  background: '#ff4d4f',
                  borderColor: '#ff4d4f'
                } : {}}
              >
                {isOverdue ? "Thanh toán gấp qua VNPay" : "Thanh toán qua VNPay"}
              </Button>
              <Button
                onClick={() => {
                  setPaymentModalVisible(false);
                  setCurrentStep(0);
                }}
              >
                Hủy
              </Button>
            </Space>
          </div>
        )}

        {currentStep === 1 && (
          <Result
            status="info"
            title="Đang chuyển đến trang thanh toán"
            subTitle="Vui lòng hoàn tất thanh toán ở tab mới và quay lại trang này để xác nhận."
            extra={[
              <Button type="primary" key="refresh" onClick={handleCheckPayment}>
                Đã thanh toán xong
              </Button>,
              <Button
                key="cancel"
                onClick={() => {
                  setPaymentModalVisible(false);
                  setCurrentStep(0);
                }}
              >
                Hủy
              </Button>,
            ]}
          />
        )}

        {currentStep === 2 && (
          <Result
            status="success"
            title="Thanh toán thành công!"
            subTitle="Hóa đơn của bạn đã được thanh toán thành công."
            extra={[
              <Button
                type="primary"
                key="close"
                onClick={() => {
                  setPaymentModalVisible(false);
                  setCurrentStep(0);
                  fetchBill();
                }}
              >
                Đóng
              </Button>,
            ]}
          />
        )}
      </Modal>
    </div>
  );
}
