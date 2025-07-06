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
    totalAmount: 0,
  });

  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const user = useSelector((state) => state.account.user);

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    setLoading(true);
    try {
      const res = await getMyBills();
      let billsData = res.content || [];
      if (user && billsData.length > 0) {
        billsData = billsData.filter((bill) => {
          if (bill.renterId) return bill.renterId === user.id;
          if (bill.renterIds) return bill.renterIds.includes(user.id);
          if (bill.roomUsers)
            return bill.roomUsers.some(
              (u) => u.userId === user.id || u.id === user.id
            );
          return true;
        });
      }
      setBills(billsData);

      const total = billsData.length;
      const paid = billsData.filter((bill) => bill.status).length;
      const unpaid = total - paid;
      const totalAmount = billsData.reduce(
        (sum, bill) => sum + (bill.totalAmount || 0),
        0
      );
      setStats({ total, paid, unpaid, totalAmount });
    } catch (err) {
      message.error("Không thể tải danh sách hóa đơn");
    }
    setLoading(false);
  };

  const getStatusColor = (status) => (status ? "success" : "error");

  const getStatusIcon = (status) =>
    status ? <CheckCircleOutlined /> : <CloseCircleOutlined />;

  const getStatusText = (status) =>
    status ? "Đã thanh toán" : "Chưa thanh toán";

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
    return (
      <span style={{ color: "red", fontWeight: 500 }}>Không xác định</span>
    );
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
      width: 120,
    },
    {
      title: "Phòng",
      dataIndex: "roomId",
      key: "roomId",
      align: "center",
      render: (roomNumber) => (
        <Tag color="blue" style={{ fontWeight: "bold" }}>
          {roomNumber}
        </Tag>
      ),
      width: 100,
    },
    {
      title: "Loại hóa đơn",
      dataIndex: "type",
      key: "type",
      align: "center",
      render: (type) => (
        <Tag color={getBillTypeColor(type)}>
          {type === "REGULAR"
            ? "Regular"
            : type === "CUSTOM"
            ? "Custom"
            : "Deposit"}
        </Tag>
      ),
      width: 120,
    },
    {
      title: "Từ ngày",
      dataIndex: "from",
      key: "from",
      align: "center",
      render: (date) => <Text>{formatDate(date)}</Text>,
      width: 100,
    },
    {
      title: "Đến ngày",
      dataIndex: "to",
      key: "to",
      align: "center",
      render: (date) => <Text>{formatDate(date)}</Text>,
      width: 100,
    },
    {
      title: "Tổng tiền",
      dataIndex: "total",
      key: "total",
      align: "center",
      render: (amount) => (
        <Text strong style={{ color: "#52c41a", fontSize: "16px" }}>
          {amount?.toLocaleString()} ₫
        </Text>
      ),
      width: 120,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      align: "center",
      render: (status) => (
        <Tag
          color={getStatusColor(status)}
          icon={getStatusIcon(status)}
          style={{ fontWeight: "bold" }}
        >
          {getStatusText(status)}
        </Tag>
      ),
      width: 120,
    },
    {
      title: "Thao tác",
      key: "actions",
      align: "center",
      render: (_, record) => (
        <Space>
          <Tooltip title="Xem chi tiết">
            <Button
              type="primary"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/renter/bills/${record.id}`)}
              size="small"
            >
              Xem
            </Button>
          </Tooltip>
          {!record.status && (
            <Tooltip title="Thanh toán ngay">
              <Button
                type="primary"
                danger
                icon={<DollarOutlined />}
                onClick={() =>
                  navigate(`/renter/bills/${record.id}?action=pay`)
                }
                size="small"
              >
                Thanh toán
              </Button>
            </Tooltip>
          )}
        </Space>
      ),
      width: 150,
    },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sider width={220} style={{ background: "#001529" }}>
        <RenterSidebar />
      </Sider>

      <div style={{ flex: 1, padding: "20px", backgroundColor: "#f5f5f5" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Card
            style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
          >
            <div style={{ marginBottom: 24 }}>
              <Title
                level={2}
                style={{ color: "#1890ff", fontSize: isMobile ? 22 : 28 }}
              >
                <FileDoneOutlined style={{ marginRight: 8 }} />
                Hóa đơn của tôi
              </Title>
              <Text type="secondary" style={{ fontSize: isMobile ? 13 : 16 }}>
                Quản lý và theo dõi các hóa đơn của bạn
              </Text>
            </div>

            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Tổng số hóa đơn"
                    value={stats.total}
                    prefix={<FileTextOutlined />}
                    valueStyle={{ color: "#1890ff" }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Đã thanh toán"
                    value={stats.paid}
                    prefix={<CheckCircleOutlined />}
                    valueStyle={{ color: "#52c41a" }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Chưa thanh toán"
                    value={stats.unpaid}
                    prefix={<ClockCircleOutlined />}
                    valueStyle={{ color: "#faad14" }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Tổng tiền"
                    value={stats.totalAmount}
                    prefix={<DollarOutlined />}
                    suffix="₫"
                    valueStyle={{ color: "#52c41a" }}
                    formatter={(value) => value.toLocaleString()}
                  />
                </Card>
              </Col>
            </Row>

            <Card title="Danh sách hóa đơn" style={{ marginTop: 16 }}>
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
                    pageSize: 10,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total, range) =>
                      `${range[0]}-${range[1]} của ${total} hóa đơn`,
                    position: ["bottomCenter"],
                  }}
                  scroll={{ x: 1000 }}
                  size="middle"
                  bordered
                />
              )}
            </Card>
          </Card>
        </div>
      </div>
    </div>
  );
}
