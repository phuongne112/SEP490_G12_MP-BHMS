import React, { useEffect, useState } from "react";
import {
  Table,
  Button,
  Tag,
  message,
  Spin,
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  Space,
  Tooltip,
  Alert,
  Drawer,
} from "antd";
import { useNavigate } from "react-router-dom";
import { getMyBills } from "../../services/billApi";
import {
  EyeOutlined,
  DollarOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FileDoneOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  MenuOutlined,
} from "@ant-design/icons";
import RenterSidebar from "../../components/layout/RenterSidebar";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { Layout } from "antd";
import { useSelector } from "react-redux";

const { Sider, Content } = Layout;
const { Title, Text } = Typography;

dayjs.extend(customParseFormat);

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

export default function RenterBillListPage() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    paid: 0,
    unpaid: 0,
    overdue: 0,
    totalAmount: 0,
    overdueAmount: 0,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [total, setTotal] = useState(0);
  const [overdueBills, setOverdueBills] = useState([]);
  const [drawerVisible, setDrawerVisible] = useState(false);

  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const user = useSelector((state) => state.account.user);

  // Kiểm tra hóa đơn quá hạn
  const checkOverdue = (bill) => {
    if (bill.status) return false; // đã thanh toán -> không quá hạn
    const today = dayjs();

    let dueDate = null;
    if (bill.dueDate) {
      dueDate = dayjs(bill.dueDate, "YYYY-MM-DD HH:mm:ss A");
    }

    let toDate = null;
    if (bill.toDate) {
      toDate = dayjs(bill.toDate, "YYYY-MM-DD HH:mm:ss A");
    }

    // Mặc định: hạn thanh toán = toDate + 7 ngày nếu không có dueDate
    const actualDueDate = dueDate || (toDate ? toDate.add(7, "day") : null);

    return actualDueDate && today.isAfter(actualDueDate, "day");
  };

  // Số ngày quá hạn
  const getOverdueDays = (bill) => {
    if (bill.status) return 0;

    const today = dayjs();

    let dueDate = null;
    if (bill.dueDate) {
      dueDate = dayjs(bill.dueDate, "YYYY-MM-DD HH:mm:ss A");
    }

    let toDate = null;
    if (bill.toDate) {
      toDate = dayjs(bill.toDate, "YYYY-MM-DD HH:mm:ss A");
    }

    const actualDueDate = dueDate || (toDate ? toDate.add(7, "day") : null);

    if (actualDueDate && today.isAfter(actualDueDate, "day")) {
      return today.diff(actualDueDate, "day");
    }
    return 0;
  };

  useEffect(() => {
    fetchBills(currentPage, pageSize);
    // eslint-disable-next-line
  }, [currentPage, pageSize]);

  const fetchBills = async (page = currentPage, size = pageSize) => {
    setLoading(true);
    try {
      const res = await getMyBills({ page: page - 1, size });
      const billsData = res.content || [];

      // xử lý cờ quá hạn
      const processedBills = billsData.map((bill) => ({
        ...bill,
        isOverdue: checkOverdue(bill),
        overdueDays: getOverdueDays(bill),
      }));

      setBills(processedBills);
      setTotal(res.totalElements || billsData.length);

      // thống kê
      const totalStats = processedBills.length;
      const paid = processedBills.filter((b) => b.status).length;
      const unpaid = totalStats - paid;
      const overdue = processedBills.filter((b) => b.isOverdue).length;
      const totalAmount = processedBills.reduce(
        (sum, b) => sum + (b.totalAmount || 0),
        0
      );
      const overdueAmount = processedBills
        .filter((b) => b.isOverdue)
        .reduce((sum, b) => sum + (b.totalAmount || 0), 0);

      setStats({
        total: totalStats,
        paid,
        unpaid,
        overdue,
        totalAmount,
        overdueAmount,
      });

      setOverdueBills(processedBills.filter((b) => b.isOverdue));
    } catch (err) {
      message.error("Không thể tải danh sách hóa đơn");
    }
    setLoading(false);
  };

  const getStatusColor = (status) => (status ? "success" : "error");
  const getStatusIcon = (status) =>
    status ? <CheckCircleOutlined /> : <CloseCircleOutlined />;
  const getStatusText = (status) => (status ? "Đã thanh toán" : "Chưa thanh toán");

  const getOverdueStatusColor = (isOverdue, overdueDays) => {
    if (!isOverdue) return "green";
    if (overdueDays <= 7) return "orange";
    if (overdueDays <= 30) return "red";
    return "volcano";
  };

  const getOverdueStatusText = (isOverdue, overdueDays) => {
    if (!isOverdue) return "Chưa quá hạn";
    return `Quá hạn ${overdueDays} ngày`;
  };

  const getBillTypeColor = (type) => {
    switch (type) {
      case "REGULAR":
        return "blue";
      case "CUSTOM":
        return "orange";
      case "DEPOSIT":
        return "purple";
      default:
        return "default";
    }
  };

  const formatDate = (date) => {
    if (date && dayjs(date, "YYYY-MM-DD HH:mm:ss A").isValid()) {
      return dayjs(date, "YYYY-MM-DD HH:mm:ss A").format("DD/MM/YYYY");
    }
    if (date && dayjs(date).isValid()) {
      return dayjs(date).format("DD/MM/YYYY");
    }
    return <span style={{ color: "red", fontWeight: 500 }}>Không xác định</span>;
  };

  const columns = [
    {
      title: "Mã hóa đơn",
      dataIndex: "id",
      key: "id",
      align: "center",
      render: (id) => (
        <Text strong style={{ color: "#1890ff" }}>
          #{id}
        </Text>
      ),
      width: isMobile ? 80 : 120,
    },
    {
      title: "Phòng",
      dataIndex: "roomNumber",
      key: "roomNumber",
      align: "center",
      render: (roomNumber) => (
        <Tag color="blue" style={{ fontWeight: "bold" }}>
          {roomNumber}
        </Tag>
      ),
      width: isMobile ? 70 : 100,
    },
    {
      title: "Loại hóa đơn",
      dataIndex: "billType",
      key: "billType",
      align: "center",
      width: isMobile ? 100 : 120,
      render: (billType) => {
        if (!billType) return <span style={{ color: "#888" }}>Không xác định</span>;
        if (
          billType === "REGULAR" ||
          billType === "ROOM_RENT" ||
          billType === "CONTRACT_ROOM_RENT" ||
          (typeof billType === "string" && billType.includes("ROOM_RENT"))
        ) {
          return <Tag color="blue">Tiền phòng</Tag>;
        }
        if (
          billType === "SERVICE" ||
          billType === "CONTRACT_SERVICE" ||
          (typeof billType === "string" && billType.includes("SERVICE"))
        ) {
          return <Tag color="green">Dịch vụ</Tag>;
        }
        if (
          billType === "DEPOSIT" ||
          (typeof billType === "string" && billType.includes("DEPOSIT"))
        ) {
          return <Tag color="purple">Đặt cọc</Tag>;
        }
        if (billType === "CONTRACT_TOTAL") {
          return <Tag color="geekblue">Tổng hợp đồng</Tag>;
        }
        if (billType === "CUSTOM") {
          return <Tag color="orange">Tùy chỉnh</Tag>;
        }
        if (billType === "CONTRACT_INIT") {
          return <Tag color="cyan">Khởi tạo hợp đồng</Tag>;
        }
        if (billType === "OTHER") {
          return <Tag>Khác</Tag>;
        }
        if (billType === "LATE_PENALTY") {
          return <Tag color="red">Phạt trễ hạn</Tag>;
        }
        return <Tag>{billType}</Tag>;
      },
    },
    ...(isMobile
      ? []
      : [
          {
            title: "Từ ngày",
            dataIndex: "fromDate",
            key: "fromDate",
            align: "center",
            render: (date) => <Text>{formatDate(date)}</Text>,
            width: 120,
          },
          {
            title: "Đến ngày",
            dataIndex: "toDate",
            key: "toDate",
            align: "center",
            render: (date) => <Text>{formatDate(date)}</Text>,
            width: 120,
          },
          {
            title: "Hạn thanh toán",
            dataIndex: "dueDate",
            key: "dueDate",
            align: "center",
            render: (date) => {
              if (!date) {
                return (
                  <span
                    style={{
                      color: "#faad14",
                      fontStyle: "italic",
                      fontSize: 12,
                    }}
                  >
                    Chưa thiết lập
                  </span>
                );
              }
              const d = dayjs(date, "YYYY-MM-DD HH:mm:ss A");
              if (!d.isValid()) {
                return <span style={{ color: "red", fontSize: 12 }}>Không xác định</span>;
              }
              return <Text>{d.format("DD/MM/YYYY")}</Text>;
            },
            width: 140,
          },
        ]),
    {
      title: "Tổng tiền",
      dataIndex: "totalAmount",
      key: "totalAmount",
      align: "center",
      render: (amount, record) =>
        isMobile ? (
          <Text strong style={{ color: "#52c41a", fontSize: 14 }}>
            {amount != null ? amount.toLocaleString() + " ₫" : <span style={{ color: "#888" }}>Không xác định</span>}
          </Text>
        ) : (
          <div>
            <Text strong style={{ color: "#52c41a", fontSize: 16 }}>
              {amount != null ? amount.toLocaleString() + " ₫" : <span style={{ color: "#888" }}>Không xác định</span>}
            </Text>
            {(record.paidAmount || 0) > 0 && (
              <div style={{ fontSize: 11, color: "#52c41a" }}>
                Đã trả (gốc): {(record.paidAmount || 0).toLocaleString()} ₫
              </div>
            )}
            {(record.partialPaymentFeesCollected || 0) > 0 && (
              <div style={{ fontSize: 11, color: "#1890ff" }}>
                Phí: {(record.partialPaymentFeesCollected || 0).toLocaleString()} ₫
              </div>
            )}
            {(record.outstandingAmount || 0) > 0 && (
              <div style={{ fontSize: 11, color: "#ff4d4f" }}>
                Còn nợ: {(record.outstandingAmount || 0).toLocaleString()} ₫
              </div>
            )}
          </div>
        ),
      width: isMobile ? 110 : 200,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      align: "center",
      render: (status) => (
        <Tag color={getStatusColor(status)} icon={getStatusIcon(status)} style={{ fontWeight: "normal" }}>
          {getStatusText(status)}
        </Tag>
      ),
      width: isMobile ? 100 : 120,
    },
    ...(isMobile
      ? []
      : [
          {
            title: "Trạng thái quá hạn",
            dataIndex: "isOverdue",
            key: "isOverdue",
            align: "center",
            render: (isOverdue, record) => (
              <Tag color={getOverdueStatusColor(isOverdue, record.overdueDays)} style={{ fontWeight: "normal" }}>
                {getOverdueStatusText(isOverdue, record.overdueDays)}
              </Tag>
            ),
            width: 160,
          },
        ]),
    {
      title: "Thao tác",
      key: "actions",
      align: "center",
      render: (_, record) => (
        <Space size={isMobile ? "small" : "middle"}>
          <Tooltip title="Xem chi tiết hóa đơn">
            <Button
              type="primary"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/renter/bills/${record.id}`)}
              size="small"
            >
              {isMobile ? "" : "Xem"}
            </Button>
          </Tooltip>
          {!record.status && (
            <Tooltip
              title={
                record.isOverdue
                  ? `Thanh toán ngay - Hóa đơn quá hạn ${record.overdueDays} ngày`
                  : "Thanh toán hóa đơn"
              }
            >
              <Button
                type="primary"
                danger={record.isOverdue}
                icon={<DollarOutlined />}
                onClick={() => navigate(`/renter/bills/${record.id}?action=pay`)}
                size="small"
                style={
                  record.isOverdue
                    ? {
                        background: "#ff4d4f",
                        borderColor: "#ff4d4f",
                        fontWeight: "normal",
                      }
                    : {}
                }
              >
                {isMobile ? "" : record.isOverdue ? "Thanh toán gấp" : "Thanh toán"}
              </Button>
            </Tooltip>
          )}
        </Space>
      ),
      width: isMobile ? 120 : 180,
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {!isMobile && (
        <Sider width={220} style={{ background: "#001529" }}>
          <RenterSidebar />
        </Sider>
      )}
      <Layout style={{ marginLeft: isMobile ? 0 : 220 }}>
        {isMobile && (
          <div
            style={{
              background: "#001529",
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              position: "sticky",
              top: 0,
              zIndex: 1000,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 16 }}>MP-BHMS</div>
              <div style={{ fontSize: 14, color: "#e2e8f0" }}>
                Xin chào {user?.fullName || user?.name || "Renter"}
              </div>
            </div>
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setDrawerVisible(true)}
              style={{ color: "white", padding: 4 }}
            />
          </div>
        )}
        <Content style={{ padding: isMobile ? 16 : 20, backgroundColor: "#f5f5f5", minHeight: "100vh" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <Card style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }} size={isMobile ? "small" : "default"}>
              <div style={{ marginBottom: isMobile ? 16 : 24 }}>
                <Title level={isMobile ? 3 : 2} style={{ color: "#1890ff", fontSize: isMobile ? 20 : 28, marginBottom: isMobile ? 8 : 16 }}>
                  <FileDoneOutlined style={{ marginRight: 8 }} />
                  Hóa đơn của tôi
                </Title>
                <Text type="secondary" style={{ fontSize: isMobile ? 12 : 16 }}>
                  Quản lý và theo dõi các hóa đơn của bạn
                </Text>
              </div>

              <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={isMobile ? 12 : 6}>
                  <Card size={isMobile ? "small" : "default"}>
                    <Statistic
                      title={<span style={{ fontSize: isMobile ? 12 : 14 }}>Tổng số hóa đơn</span>}
                      value={stats.total}
                      prefix={<FileTextOutlined />}
                      valueStyle={{ color: "#1890ff", fontSize: isMobile ? 16 : 20 }}
                    />
                  </Card>
                </Col>
                <Col span={isMobile ? 12 : 6}>
                  <Card size={isMobile ? "small" : "default"}>
                    <Statistic
                      title={<span style={{ fontSize: isMobile ? 12 : 14 }}>Đã thanh toán</span>}
                      value={stats.paid}
                      prefix={<CheckCircleOutlined />}
                      valueStyle={{ color: "#52c41a", fontSize: isMobile ? 16 : 20 }}
                    />
                  </Card>
                </Col>
                <Col span={isMobile ? 12 : 6}>
                  <Card size={isMobile ? "small" : "default"}>
                    <Statistic
                      title={<span style={{ fontSize: isMobile ? 12 : 14 }}>Chưa thanh toán</span>}
                      value={stats.unpaid}
                      prefix={<ClockCircleOutlined />}
                      valueStyle={{ color: "#faad14", fontSize: isMobile ? 16 : 20 }}
                    />
                  </Card>
                </Col>
                <Col span={isMobile ? 12 : 6}>
                  <Card size={isMobile ? "small" : "default"}>
                    <Statistic
                      title={<span style={{ fontSize: isMobile ? 12 : 14 }}>Quá hạn</span>}
                      value={stats.overdue}
                      prefix={<ExclamationCircleOutlined />}
                      valueStyle={{ color: "#ff4d4f", fontSize: isMobile ? 16 : 20 }}
                    />
                  </Card>
                </Col>
                {!isMobile && (
                  <>
                    <Col span={6}>
                      <Card>
                        <Statistic
                          title="Tổng tiền"
                          value={stats.totalAmount}
                          prefix={<DollarOutlined />}
                          suffix="₫"
                          valueStyle={{ color: "#52c41a" }}
                          formatter={(value) => Number(value || 0).toLocaleString()}
                        />
                      </Card>
                    </Col>
                    <Col span={6}>
                      <Card>
                        <Statistic
                          title="Tiền quá hạn"
                          value={stats.overdueAmount}
                          prefix={<WarningOutlined />}
                          suffix="₫"
                          valueStyle={{ color: "#ff4d4f" }}
                          formatter={(value) => Number(value || 0).toLocaleString()}
                        />
                      </Card>
                    </Col>
                  </>
                )}
              </Row>

              {/* Cảnh báo hóa đơn quá hạn */}
              {overdueBills.length > 0 && (
                <Alert
                  message={<span style={{ fontSize: isMobile ? 14 : 16 }}>{`Bạn có ${overdueBills.length} hóa đơn quá hạn cần thanh toán gấp!`}</span>}
                  description={
                    <div>
                      <p style={{ marginBottom: 8, fontSize: isMobile ? 12 : 14 }}>
                        <strong>Danh sách hóa đơn quá hạn:</strong>
                      </p>
                      <ul style={{ margin: "8px 0", paddingLeft: "20px", fontSize: isMobile ? 12 : 14 }}>
                        {overdueBills.slice(0, isMobile ? 2 : 3).map((bill) => (
                          <li key={bill.id}>
                            Hóa đơn #{bill.id} - {bill.totalAmount?.toLocaleString()} ₫ (Quá hạn {bill.overdueDays} ngày)
                          </li>
                        ))}
                        {overdueBills.length > (isMobile ? 2 : 3) && (
                          <li>... và {overdueBills.length - (isMobile ? 2 : 3)} hóa đơn khác</li>
                        )}
                      </ul>
                      <p style={{ marginTop: 8, marginBottom: 0, fontSize: isMobile ? 12 : 14 }}>
                        <strong>Tổng tiền quá hạn: {Number(stats.overdueAmount || 0).toLocaleString()} ₫</strong>
                      </p>
                    </div>
                  }
                  type="error"
                  showIcon
                  style={{ marginBottom: 16 }}
                  action={
                    <Button
                      type="primary"
                      danger
                      size={isMobile ? "small" : "small"}
                      onClick={() => {
                        const firstOverdueBill = overdueBills[0];
                        if (firstOverdueBill) {
                          navigate(`/renter/bills/${firstOverdueBill.id}?action=pay`);
                        }
                      }}
                    >
                      {isMobile ? "Thanh toán" : "Thanh toán ngay"}
                    </Button>
                  }
                />
              )}

              <Card
                title={<span style={{ fontSize: isMobile ? 16 : 18 }}>Danh sách hóa đơn</span>}
                style={{ marginTop: 16 }}
                size={isMobile ? "small" : "default"}
              >
                <style>
                  {`
                    .ant-pagination-total-text { font-weight: normal !important; font-size: 14px !important; }
                    .ant-pagination-item { font-weight: normal !important; }
                    .ant-pagination-item-active { font-weight: normal !important; }
                    .ant-pagination-prev, .ant-pagination-next { font-weight: normal !important; }
                    .ant-pagination .ant-pagination-total-text { font-weight: normal !important; }
                  `}
                </style>
                {loading ? (
                  <div style={{ textAlign: "center", padding: "40px" }}>
                    <Spin size="large" />
                    <div style={{ marginTop: 16 }}>Đang tải...</div>
                  </div>
                ) : (
                  <Table
                    columns={columns}
                    dataSource={bills}
                    rowKey="id"
                    pagination={{
                      current: currentPage,
                      pageSize: pageSize,
                      total: total,
                      showSizeChanger: false,
                      showQuickJumper: false,
                      onChange: (page, size) => {
                        setCurrentPage(page);
                        setPageSize(size);
                      },
                      showTotal: (total, range) => (
                        <span style={{ fontWeight: "normal", fontSize: "14px" }}>
                          {range[0]}-{range[1]} trên tổng số {total} hóa đơn
                        </span>
                      ),
                      position: ["bottomCenter"],
                      itemRender: (page, type, originalElement) => {
                        if (type === "page") {
                          return <span style={{ fontWeight: "normal" }}>{page}</span>;
                        }
                        return originalElement;
                      },
                      style: {
                        fontWeight: "normal",
                        fontSize: "14px",
                      },
                    }}
                    scroll={{ x: isMobile ? 800 : 1000 }}
                    size={isMobile ? "small" : "middle"}
                    bordered
                    rowClassName={(record) => {
                      if (record.isOverdue) {
                        if (record.overdueDays <= 7) return "overdue-warning";
                        if (record.overdueDays <= 30) return "overdue-danger";
                        return "overdue-critical";
                      }
                      return "";
                    }}
                    onRow={(record) => ({
                      style: record.isOverdue
                        ? {
                            backgroundColor:
                              record.overdueDays <= 7
                                ? "#fff7e6"
                                : record.overdueDays <= 30
                                ? "#fff2f0"
                                : "#fff1f0",
                            borderLeft:
                              record.overdueDays <= 7
                                ? "4px solid #faad14"
                                : record.overdueDays <= 30
                                ? "4px solid #ff4d4f"
                                : "4px solid #cf1322",
                          }
                        : {},
                    })}
                  />
                )}
              </Card>
            </Card>
          </div>
        </Content>
      </Layout>

      {/* Mobile Drawer for Sidebar */}
      {isMobile && (
        <Drawer
          title="Menu"
          placement="left"
          onClose={() => setDrawerVisible(false)}
          open={drawerVisible}
          width={280}
          bodyStyle={{ padding: 0 }}
        >
          <RenterSidebar isDrawer={true} onMenuClick={() => setDrawerVisible(false)} />
        </Drawer>
      )}
    </Layout>
  );
}