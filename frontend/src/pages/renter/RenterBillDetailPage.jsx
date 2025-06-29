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
  Result
} from "antd";
import { 
  getBillDetail, 
  createVnPayUrl,
  exportBillPdf 
} from "../../services/billApi";
import { 
  ArrowLeftOutlined, 
  DollarOutlined, 
  QrcodeOutlined, 
  DownloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FileTextOutlined,
  CreditCardOutlined,
  PrinterOutlined
} from "@ant-design/icons";
import QRCodePayment from "../../components/common/QRCodePayment";
import RenterSidebar from "../../components/layout/RenterSidebar";
import dayjs from "dayjs";

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

export default function RenterBillDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [qrCodeData, setQrCodeData] = useState(null);

  const action = searchParams.get('action');

  useEffect(() => {
    fetchBill();
    if (action === 'pay') {
      setPaymentModalVisible(true);
    }
  }, [id, action]);

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
        orderInfo: `Thanh toan hoa don #${bill.id}`
      });
      
      // Mở URL thanh toán trong tab mới
      window.open(paymentUrl, '_blank');
      setCurrentStep(1);
      message.success("Đang chuyển đến trang thanh toán...");
    } catch (error) {
      message.error("Không thể tạo liên kết thanh toán");
    }
    setPaymentLoading(false);
  };

  const handleGenerateQR = () => {
    if (!bill) return;
    
    // Tạo dữ liệu QR code với thông tin thanh toán
    const qrData = {
      billId: bill.id,
      amount: bill.totalAmount,
      roomNumber: bill.roomNumber,
      dueDate: bill.toDate,
      type: "payment",
      description: `Thanh toan hoa don #${bill.id} - Phong ${bill.roomNumber}`
    };
    
    setQrCodeData(qrData);
    setQrModalVisible(true);
  };

  const handleExportPDF = async () => {
    try {
      const blob = await exportBillPdf(id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `hoa-don-${bill.id}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      message.success("Đã tải xuống hóa đơn PDF");
    } catch (error) {
      message.error("Không thể tải xuống hóa đơn");
    }
  };

  const getStatusColor = (status) => {
    return status ? "success" : "error";
  };

  const getStatusIcon = (status) => {
    return status ? <CheckCircleOutlined /> : <CloseCircleOutlined />;
  };

  const getStatusText = (status) => {
    return status ? "Paid" : "Unpaid";
  };

  const getBillTypeColor = (type) => {
    switch (type) {
      case "REGULAR": return "blue";
      case "CUSTOM": return "orange";
      case "DEPOSIT": return "purple";
      default: return "default";
    }
  };

  const getBillTypeText = (type) => {
    switch (type) {
      case "REGULAR": return "Regular";
      case "CUSTOM": return "Custom";
      case "DEPOSIT": return "Deposit";
      default: return type;
    }
  };

  const columns = [
    { 
      title: "Description", 
      dataIndex: "description",
      render: text => <Text strong>{text}</Text>
    },
    { 
      title: "Type", 
      dataIndex: "itemType",
      render: type => <Tag color="blue">{type}</Tag>
    },
    { 
      title: "Service", 
      dataIndex: "serviceName",
      render: name => <Text>{name || "N/A"}</Text>
    },
    { 
      title: "Unit Price", 
      dataIndex: "unitPriceAtBill", 
      align: "right",
      render: price => price ? <Text>{price.toLocaleString()} ₫</Text> : "N/A"
    },
    { 
      title: "Quantity", 
      dataIndex: "consumedUnits",
      align: "center",
      render: units => <Text>{units || "N/A"}</Text>
    },
    { 
      title: "Total", 
      dataIndex: "itemAmount", 
      align: "right",
      render: amount => amount ? <Text strong style={{ color: "#52c41a" }}>{amount.toLocaleString()} ₫</Text> : "N/A"
    },
  ];

  if (loading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <RenterSidebar />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
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
        <RenterSidebar />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Result
            status="404"
            title="Không tìm thấy hóa đơn"
            subTitle="Hóa đơn bạn đang tìm kiếm không tồn tại."
            extra={
              <Button type="primary" onClick={() => navigate('/renter/bills')}>
                Quay lại danh sách
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <RenterSidebar />
      <div style={{ flex: 1, padding: "20px", backgroundColor: "#f5f5f5" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Card style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
              <Button 
                icon={<ArrowLeftOutlined />} 
                onClick={() => navigate('/renter/bills')} 
                style={{ marginBottom: 16 }}
              >
                Quay lại
              </Button>
              
              <Title level={2} style={{ margin: 0, color: "#1890ff" }}>
                <FileTextOutlined style={{ marginRight: 8 }} />
                Bill Details #{bill.id}
              </Title>
              
              <Space style={{ marginTop: 8 }}>
                <Tag color={getStatusColor(bill.status)} icon={getStatusIcon(bill.status)}>
                  {getStatusText(bill.status)}
                </Tag>
                <Tag color={getBillTypeColor(bill.billType)}>
                  {getBillTypeText(bill.billType)}
                </Tag>
              </Space>
            </div>

            {/* Thông báo thanh toán */}
            {!bill.status && (
              <Alert
                message="Unpaid bill"
                description="Please pay this bill before the due date to avoid late fees."
                type="warning"
                showIcon
                style={{ marginBottom: 24 }}
                action={
                  <Space>
                    <Button 
                      type="primary" 
                      danger 
                      icon={<DollarOutlined />}
                      onClick={() => setPaymentModalVisible(true)}
                    >
                      Pay now
                    </Button>
                    <Button 
                      icon={<QrcodeOutlined />}
                      onClick={handleGenerateQR}
                    >
                      Generate QR
                    </Button>
                  </Space>
                }
              />
            )}

            <Row gutter={24}>
              {/* Thông tin hóa đơn */}
              <Col span={16}>
                <Card title="Bill Information" style={{ marginBottom: 24 }}>
                  <Descriptions bordered column={2}>
                    <Descriptions.Item label="Bill ID">
                      <Text strong style={{ color: "#1890ff" }}>#{bill.id}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Room">
                      <Tag color="blue" style={{ fontWeight: "bold" }}>
                        {bill.roomNumber}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Contract ID">
                      {bill.contractId ? (
                        <Text strong>#{bill.contractId}</Text>
                      ) : (
                        <Text type="secondary">N/A</Text>
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="Bill Type">
                      <Tag color={getBillTypeColor(bill.billType)}>
                        {getBillTypeText(bill.billType)}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="From">
                      <Text>{dayjs(bill.fromDate).format("DD/MM/YYYY")}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="To">
                      <Text>{dayjs(bill.toDate).format("DD/MM/YYYY")}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Total" span={2}>
                      <Text strong style={{ color: "#52c41a", fontSize: "18px" }}>
                        {bill.totalAmount?.toLocaleString()} ₫
                      </Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Status" span={2}>
                      <Tag 
                        color={getStatusColor(bill.status)} 
                        icon={getStatusIcon(bill.status)}
                        style={{ fontSize: "14px", padding: "4px 8px" }}
                      >
                        {getStatusText(bill.status)}
                      </Tag>
                    </Descriptions.Item>
                  </Descriptions>
                </Card>

                {/* Chi tiết hóa đơn */}
                <Card title="Bill Details">
                  <Table
                    columns={columns}
                    dataSource={bill.details}
                    rowKey={(_, idx) => idx}
                    pagination={false}
                    size="small"
                    bordered
                    summary={(pageData) => {
                      const total = pageData.reduce((sum, record) => sum + (record.itemAmount || 0), 0);
                      return (
                        <Table.Summary.Row>
                          <Table.Summary.Cell index={0} colSpan={5}>
                            <Text strong>Total:</Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={1} align="right">
                            <Text strong style={{ color: "#52c41a", fontSize: "16px" }}>
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
                <Card title="Actions" style={{ position: "sticky", top: 20 }}>
                  <Space direction="vertical" style={{ width: "100%" }}>
                    {!bill.status && (
                      <>
                        <Button 
                          type="primary" 
                          danger 
                          size="large"
                          icon={<DollarOutlined />}
                          onClick={() => setPaymentModalVisible(true)}
                          block
                        >
                          Pay now
                        </Button>
                        
                        <Button 
                          size="large"
                          icon={<QrcodeOutlined />}
                          onClick={handleGenerateQR}
                          block
                        >
                          Generate QR
                        </Button>
                      </>
                    )}
                    
                    <Button 
                      size="large"
                      icon={<DownloadOutlined />}
                      onClick={handleExportPDF}
                      block
                    >
                      Download PDF
                    </Button>
                    
                    <Button 
                      size="large"
                      icon={<PrinterOutlined />}
                      onClick={() => window.print()}
                      block
                    >
                      Print bill
                    </Button>
                  </Space>

                  <Divider />

                  <div>
                    <Text strong>Payment information:</Text>
                    <Paragraph style={{ marginTop: 8 }}>
                      <Text type="secondary">
                        • Pay via VNPay<br/>
                        • Pay via QR code<br/>
                        • Pay directly at the office
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
        title="Pay Bill"
        open={paymentModalVisible}
        onCancel={() => setPaymentModalVisible(false)}
        footer={null}
        width={600}
      >
        <Steps current={currentStep} style={{ marginBottom: 24 }}>
          <Step title="Confirm" description="Confirm information" />
          <Step title="Payment" description="Go to VNPay" />
          <Step title="Done" description="Confirm payment" />
        </Steps>

        {currentStep === 0 && (
          <div>
            <Alert
              message="Payment information"
              description={
                <div>
                  <p><strong>Bill ID:</strong> #{bill.id}</p>
                  <p><strong>Amount:</strong> {bill.totalAmount?.toLocaleString()} ₫</p>
                  <p><strong>Room:</strong> {bill.roomNumber}</p>
                </div>
              }
              type="info"
              style={{ marginBottom: 16 }}
            />
            
            <Space>
              <Button 
                type="primary" 
                loading={paymentLoading}
                onClick={handlePayment}
                icon={<CreditCardOutlined />}
              >
                Pay via VNPay
              </Button>
              <Button onClick={() => setPaymentModalVisible(false)}>
                Cancel
              </Button>
            </Space>
          </div>
        )}

        {currentStep === 1 && (
          <Result
            status="info"
            title="Redirecting to payment page"
            subTitle="Please complete the payment in the new tab and return to this page to confirm."
            extra={[
              <Button 
                type="primary" 
                key="refresh"
                onClick={() => {
                  fetchBill();
                  setCurrentStep(2);
                }}
              >
                Payment completed
              </Button>,
              <Button key="cancel" onClick={() => setPaymentModalVisible(false)}>
                Cancel
              </Button>
            ]}
          />
        )}

        {currentStep === 2 && (
          <Result
            status="success"
            title="Payment successful!"
            subTitle="Your bill has been paid successfully."
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
                Close
              </Button>
            ]}
          />
        )}
      </Modal>

      {/* Modal mã QR */}
      <Modal
        title="QR Payment Code"
        open={qrModalVisible}
        onCancel={() => setQrModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setQrModalVisible(false)}>
            Đóng
          </Button>
        ]}
        width={500}
        centered
      >
        <QRCodePayment billData={qrCodeData} size={250} />
      </Modal>
    </div>
  );
} 