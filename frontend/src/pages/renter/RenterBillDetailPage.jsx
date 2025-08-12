import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  Card,
  Descriptions,
  Table,
  Button,
  Spin,
  message,
  Tag,
  Layout,
  Modal,
  Radio,
  Alert,
  Divider,
  Drawer,
} from "antd";
import {
  getBillDetail,
  exportBillPdf,
  createVnPayUrl,
} from "../../services/billApi";
import RenterSidebar from "../../components/layout/RenterSidebar";
import PageHeader from "../../components/common/PageHeader";
import PartialPaymentModal from "../../components/common/PartialPaymentModal";
import { MenuOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { useSelector } from "react-redux";

dayjs.extend(customParseFormat);

const { Sider } = Layout;

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

export default function RenterBillDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);

  // Payment flows
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [partialPaymentModalVisible, setPartialPaymentModalVisible] =
    useState(false);
  const [paymentType, setPaymentType] = useState("full");

  // Mobile UI
  const [drawerVisible, setDrawerVisible] = useState(false);
  const isMobile = useIsMobile();
  const user = useSelector((state) => state.account.user);

  useEffect(() => {
    fetchBill();
    // eslint-disable-next-line
  }, [id]);

  // Auto open pay modal if ?action=pay
  useEffect(() => {
    const action = searchParams.get("action");
    if (action === "pay" && bill && !bill.status) {
      setPaymentModalVisible(true);
    }
  }, [searchParams, bill]);

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

  const handleExport = async () => {
    try {
      const data = await exportBillPdf(bill.id);

      // filename: HoaDon_{Room}_{YYYY-MM-DD}_{YYYY-MM-DD}.pdf
      const fromDate = dayjs(bill.fromDate).format("YYYY-MM-DD");
      const toDate =
        bill.toDate && dayjs(bill.toDate, "YYYY-MM-DD HH:mm:ss A").isValid()
          ? dayjs(bill.toDate, "YYYY-MM-DD HH:mm:ss A").format("YYYY-MM-DD")
          : getFallbackToDate(bill)
          ? dayjs(getFallbackToDate(bill)).format("YYYY-MM-DD")
          : "Unknown";
      const roomName = bill.roomNumber || "Unknown";
      const filename = `HoaDon_${roomName}_${fromDate}_${toDate}.pdf`;

      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      message.error("Xuất hóa đơn thất bại");
    }
  };

  const handlePayVnPay = async () => {
    try {
      // thanh toán đúng số tiền còn nợ
      const outstandingAmount = bill.outstandingAmount || bill.totalAmount || 0;
      const amount = Number(String(outstandingAmount).replace(/[^0-9.-]+/g, ""));
      const paymentUrl = await createVnPayUrl({
        billId: bill.id,
        amount,
        orderInfo: `Thanh toán hóa đơn #${bill.id}`,
      });
      window.location.href = paymentUrl;
    } catch (err) {
      message.error("Không tạo được link thanh toán!");
    }
  };

  const handlePaymentModalOk = () => {
    if (paymentType === "full") {
      handlePayVnPay();
    } else {
      setPaymentModalVisible(false);
      setPartialPaymentModalVisible(true);
    }
  };

  const handlePartialPaymentSuccess = () => {
    setPartialPaymentModalVisible(false);
    message.success("Thanh toán từng phần thành công!");
    fetchBill();
  };

  const handlePartialPaymentCancel = () => {
    setPartialPaymentModalVisible(false);
  };

  const formatCurrency = (amount) => {
    if (!amount) return "0 ₫";
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const columns = [
    { title: "Mô tả", dataIndex: "description" },
    {
      title: "Loại",
      dataIndex: "itemType",
      render: (type) => {
        if (!type) return <Tag>Không xác định</Tag>;
        if (
          type === "REGULAR" ||
          type === "ROOM_RENT" ||
          type === "CONTRACT_ROOM_RENT" ||
          (typeof type === "string" && type.includes("ROOM_RENT"))
        ) {
          return <Tag color="blue">Tiền phòng</Tag>;
        }
        if (
          type === "SERVICE" ||
          type === "CONTRACT_SERVICE" ||
          (typeof type === "string" && type.includes("SERVICE"))
        ) {
          return <Tag color="green">Dịch vụ</Tag>;
        }
        if (type === "DEPOSIT" || (typeof type === "string" && type.includes("DEPOSIT"))) {
          return <Tag color="purple">Đặt cọc</Tag>;
        }
        if (type === "CONTRACT_TOTAL") {
          return <Tag color="geekblue">Tổng hợp đồng</Tag>;
        }
        if (type === "LATE_PENALTY") {
          return <Tag color="volcano">Phạt quá hạn</Tag>;
        }
        return <Tag>{type}</Tag>;
      },
    },
    { title: "Dịch vụ", dataIndex: "serviceName", render: (v) => v || "Không có" },
    {
      title: "Đơn giá",
      dataIndex: "unitPriceAtBill",
      render: (v) => (v ? v.toLocaleString() + " ₫" : "Không có"),
    },
    { title: "Số lượng", dataIndex: "consumedUnits", render: (v) => v || "Không có" },
    {
      title: "Thành tiền",
      dataIndex: "itemAmount",
      render: (v) => (v ? v.toLocaleString() + " ₫" : "Không có"),
    },
  ];

  // Helper: lấy ngày "đến" fallback từ mô tả chi tiết nếu toDate null/invalid
  function getFallbackToDate(bill) {
    if (!bill || !bill.details || !Array.isArray(bill.details)) return null;
    const roomRent = bill.details.find((d) => d.itemType === "ROOM_RENT");
    const anyDetail = bill.details[0];
    const regex = /đến (\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})/;
    let match = null;
    if (roomRent && roomRent.description) match = roomRent.description.match(regex);
    if (!match && anyDetail && anyDetail.description)
      match = anyDetail.description.match(regex);
    if (match && match[1]) {
      let dateStr = match[1];
      if (/\d{2}\/\d{2}\/\d{4}/.test(dateStr)) {
        const [d, m, y] = dateStr.split("/");
        dateStr = `${y}-${m}-${d}`;
      }
      return dateStr;
    }
    return null;
  }

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

        <div style={{ flex: 1, padding: isMobile ? 16 : 24 }}>
          {!isMobile && <PageHeader title="Chi tiết hóa đơn" />}
          {isMobile && (
            <div style={{ marginBottom: 16 }}>
              <h2
                style={{
                  fontSize: 20,
                  fontWeight: 600,
                  color: "#1890ff",
                  margin: 0,
                }}
              >
                Chi tiết hóa đơn
              </h2>
            </div>
          )}

          <Card style={{ marginTop: isMobile ? 0 : 20 }} size={isMobile ? "small" : "default"}>
            {loading ? (
              <Spin />
            ) : bill ? (
              <>
                <Descriptions
                  bordered
                  column={isMobile ? 1 : 2}
                  size={isMobile ? "small" : "default"}
                >
                  <Descriptions.Item label="Mã hóa đơn">
                    #{bill.id}
                  </Descriptions.Item>
                  <Descriptions.Item label="Phòng">
                    {bill.roomNumber}
                  </Descriptions.Item>
                  <Descriptions.Item label="Mã hợp đồng">
                    {bill.contractId ? `#${bill.contractId}` : "Không có"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Loại hóa đơn">
                    <Tag
                      color={
                        bill.billType === "REGULAR" ||
                        bill.billType === "ROOM_RENT" ||
                        bill.billType === "CONTRACT_ROOM_RENT" ||
                        (bill.billType && bill.billType.includes("ROOM_RENT"))
                          ? "blue"
                          : bill.billType === "SERVICE" ||
                            bill.billType === "CONTRACT_SERVICE" ||
                            (bill.billType && bill.billType.includes("SERVICE"))
                          ? "green"
                          : bill.billType === "DEPOSIT" ||
                            (bill.billType && bill.billType.includes("DEPOSIT"))
                          ? "purple"
                          : bill.billType === "CONTRACT_TOTAL"
                          ? "geekblue"
                          : bill.billType === "LATE_PENALTY"
                          ? "volcano"
                          : "default"
                      }
                    >
                      {bill.billType === "REGULAR" ||
                      bill.billType === "ROOM_RENT" ||
                      bill.billType === "CONTRACT_ROOM_RENT" ||
                      (bill.billType && bill.billType.includes("ROOM_RENT"))
                        ? "Tiền phòng"
                        : bill.billType === "SERVICE" ||
                          bill.billType === "CONTRACT_SERVICE" ||
                          (bill.billType && bill.billType.includes("SERVICE"))
                        ? "Dịch vụ"
                        : bill.billType === "DEPOSIT" ||
                          (bill.billType && bill.billType.includes("DEPOSIT"))
                        ? "Đặt cọc"
                        : bill.billType === "CONTRACT_TOTAL"
                        ? "Tổng hợp đồng"
                        : bill.billType === "LATE_PENALTY"
                        ? "Phạt quá hạn"
                        : bill.billType || "Không xác định"}
                    </Tag>
                  </Descriptions.Item>

                  <Descriptions.Item label="Từ ngày">
                    {dayjs(bill.fromDate).format("DD/MM/YYYY")}
                  </Descriptions.Item>
                  <Descriptions.Item label="Đến ngày">
                    {bill.toDate &&
                    dayjs(bill.toDate, "YYYY-MM-DD HH:mm:ss A").isValid() ? (
                      dayjs(bill.toDate, "YYYY-MM-DD HH:mm:ss A").format(
                        "DD/MM/YYYY"
                      )
                    ) : getFallbackToDate(bill) ? (
                      <span style={{ color: "#faad14", fontWeight: 500 }}>
                        {dayjs(getFallbackToDate(bill)).isValid()
                          ? dayjs(getFallbackToDate(bill)).format("DD/MM/YYYY")
                          : getFallbackToDate(bill)}{" "}
                        (Lấy từ chi tiết hóa đơn)
                      </span>
                    ) : (
                      <span style={{ color: "red", fontWeight: 500 }}>
                        Không xác định (Dữ liệu hóa đơn thiếu ngày kết thúc)
                      </span>
                    )}
                  </Descriptions.Item>

                  <Descriptions.Item label="Hạn thanh toán">
                    {bill.dueDate ? (
                      <span>
                        {(() => {
                          try {
                            const dueDate = dayjs(
                              bill.dueDate,
                              "YYYY-MM-DD HH:mm:ss A"
                            );
                            return dueDate.isValid()
                              ? dueDate.format("DD/MM/YYYY")
                              : "Không xác định";
                          } catch {
                            return "Không xác định";
                          }
                        })()}
                      </span>
                    ) : (
                      <span style={{ color: "#faad14", fontStyle: "italic" }}>
                        Chưa thiết lập
                      </span>
                    )}
                  </Descriptions.Item>

                  <Descriptions.Item label="Tổng tiền">
                    <div>
                      <div style={{ fontWeight: "bold" }}>
                        {formatCurrency(bill.totalAmount)}
                      </div>
                      {(bill.paidAmount || 0) > 0 && (
                        <div style={{ fontSize: "12px", color: "#52c41a" }}>
                          Đã trả: {formatCurrency(bill.paidAmount || 0)}
                        </div>
                      )}
                      {(bill.outstandingAmount || 0) > 0 && (
                        <div style={{ fontSize: "12px", color: "#ff4d4f" }}>
                          Còn nợ:{" "}
                          {formatCurrency(bill.outstandingAmount || 0)}
                        </div>
                      )}
                    </div>
                  </Descriptions.Item>

                  <Descriptions.Item label="Trạng thái">
                    <div>
                      <Tag
                        color={
                          bill.status
                            ? "green"
                            : bill.isPartiallyPaid
                            ? "orange"
                            : "red"
                        }
                      >
                        {bill.status
                          ? "Đã thanh toán"
                          : bill.isPartiallyPaid
                          ? "Thanh toán từng phần"
                          : "Chưa thanh toán"}
                      </Tag>
                      {bill.lastPaymentDate && (
                        <div
                          style={{
                            fontSize: "11px",
                            color: "#666",
                            marginTop: "4px",
                          }}
                        >
                          Lần thanh toán cuối:{" "}
                          {(() => {
                            try {
                              const date = dayjs(bill.lastPaymentDate);
                              return date.isValid()
                                ? date.format("DD/MM/YYYY HH:mm")
                                : "Không xác định";
                            } catch {
                              return "Không xác định";
                            }
                          })()}
                        </div>
                      )}
                    </div>
                  </Descriptions.Item>

                  {bill.billType === "LATE_PENALTY" && (
                    <>
                      <Descriptions.Item label="Hóa đơn gốc">
                        <Button
                          type="link"
                          onClick={() =>
                            navigate(`/renter/bills/${bill.originalBillId}`)
                          }
                          style={{ padding: 0 }}
                        >
                          Xem hóa đơn #{bill.originalBillId}
                        </Button>
                      </Descriptions.Item>
                      <Descriptions.Item label="Tỷ lệ phạt">
                        <Tag color="volcano">{bill.penaltyRate}%</Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="Số ngày quá hạn">
                        <Tag color="red">{bill.overdueDays} ngày</Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="Số tiền phạt">
                        <span style={{ color: "#cf1322", fontWeight: "bold" }}>
                          {bill.penaltyAmount?.toLocaleString()} ₫
                        </span>
                      </Descriptions.Item>
                      {bill.notes && (
                        <Descriptions.Item label="Ghi chú" span={2}>
                          <span style={{ color: "#666" }}>{bill.notes}</span>
                        </Descriptions.Item>
                      )}
                    </>
                  )}
                </Descriptions>

                <h3 style={{ marginTop: 24, fontSize: isMobile ? 16 : 18 }}>
                  Chi tiết các khoản
                </h3>
                <Table
                  columns={columns}
                  dataSource={bill.details}
                  rowKey={(_, idx) => idx}
                  pagination={false}
                  size={isMobile ? "small" : "small"}
                  scroll={{ x: isMobile ? 400 : 600 }}
                />

                <div
                  style={{
                    marginTop: 24,
                    display: "flex",
                    flexDirection: isMobile ? "column" : "row",
                    gap: isMobile ? 8 : 16,
                  }}
                >
                  <Button
                    onClick={handleExport}
                    type="primary"
                    size={isMobile ? "small" : "middle"}
                  >
                    Xuất PDF
                  </Button>

                  {!bill.status && (
                    <Button
                      type="primary"
                      size={isMobile ? "small" : "middle"}
                      onClick={() => setPaymentModalVisible(true)}
                    >
                      Thanh toán
                    </Button>
                  )}

                  <Button
                    size={isMobile ? "small" : "middle"}
                    onClick={() => navigate(-1)}
                  >
                    Quay lại
                  </Button>
                </div>
              </>
            ) : (
              <div>Không tìm thấy hóa đơn</div>
            )}
          </Card>
        </div>

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
            <RenterSidebar
              isDrawer={true}
              onMenuClick={() => setDrawerVisible(false)}
            />
          </Drawer>
        )}
      </Layout>

      {/* Payment Options Modal */}
      <Modal
        title="Chọn phương thức thanh toán"
        open={paymentModalVisible}
        onOk={handlePaymentModalOk}
        onCancel={() => setPaymentModalVisible(false)}
        okText="Tiếp tục"
        cancelText="Hủy"
        width={500}
      >
        <div style={{ marginBottom: 16 }}>
          <Alert
            message="Thông tin hóa đơn"
            description={
              <div>
                <p>
                  <strong>Hóa đơn #:</strong> {bill?.id || "N/A"}
                </p>
                <p>
                  <strong>Phòng:</strong> {bill?.roomNumber || "N/A"}
                </p>
                <p>
                  <strong>Tổng tiền:</strong> {formatCurrency(bill?.totalAmount)}
                </p>
                <p>
                  <strong>Đã thanh toán:</strong>{" "}
                  {formatCurrency(bill?.paidAmount || 0)}
                </p>
                <p>
                  <strong>Còn nợ:</strong>{" "}
                  {formatCurrency(
                    bill?.outstandingAmount || bill?.totalAmount || 0
                  )}
                </p>
              </div>
            }
            type="info"
            showIcon
          />
        </div>

        <Divider />

        <Radio.Group
          value={paymentType}
          onChange={(e) => setPaymentType(e.target.value)}
          style={{ width: "100%" }}
        >
          <div style={{ marginBottom: 16 }}>
            <Radio value="full" style={{ width: "100%" }}>
              <div>
                <div style={{ fontWeight: "bold", color: "#1890ff" }}>
                  Thanh toán thẳng (VNPAY)
                </div>
                <div style={{ fontSize: "12px", color: "#666" }}>
                  Thanh toán toàn bộ số tiền còn nợ qua VNPAY
                </div>
              </div>
            </Radio>
          </div>
          <div>
            <Radio value="partial" style={{ width: "100%" }}>
              <div>
                <div style={{ fontWeight: "bold", color: "#faad14" }}>
                  Thanh toán một phần
                </div>
                <div style={{ fontSize: "12px", color: "#666" }}>
                  Thanh toán một phần số tiền và ghi nợ phần còn lại
                </div>
              </div>
            </Radio>
          </div>
        </Radio.Group>
      </Modal>

      {/* Partial Payment Modal */}
      {bill && (
        <PartialPaymentModal
          visible={partialPaymentModalVisible}
          onCancel={handlePartialPaymentCancel}
          onSuccess={handlePartialPaymentSuccess}
          bill={bill}
        />
      )}
    </Layout>
  );
}
