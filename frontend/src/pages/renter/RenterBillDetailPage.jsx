import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, Descriptions, Table, Button, Spin, message, Tag, Layout } from "antd";
import { getBillDetail, exportBillPdf, createVnPayUrl } from "../../services/billApi";
import RenterSidebar from "../../components/layout/RenterSidebar";
import PageHeader from "../../components/common/PageHeader";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);

const { Sider } = Layout;

export default function RenterBillDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBill();
    // eslint-disable-next-line
  }, [id]);

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
      
      // Generate professional filename with room name and bill date range
      const fromDate = dayjs(bill.fromDate).format('YYYY-MM-DD');
      const toDate = bill.toDate && dayjs(bill.toDate, "YYYY-MM-DD HH:mm:ss A").isValid() 
        ? dayjs(bill.toDate, "YYYY-MM-DD HH:mm:ss A").format('YYYY-MM-DD')
        : getFallbackToDate(bill) 
        ? dayjs(getFallbackToDate(bill)).format('YYYY-MM-DD')
        : 'Unknown';
      const roomName = bill.roomNumber || 'Unknown';
      const filename = `HoaDon_${roomName}_${fromDate}_${toDate}.pdf`;
      
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      // Clean up the URL object
      window.URL.revokeObjectURL(url);
    } catch (err) {
      message.error("Xuất hóa đơn thất bại");
    }
  };

  const handlePayVnPay = async () => {
    try {
      const amount = Number(String(bill.totalAmount).replace(/[^0-9.-]+/g, ""));
      const paymentUrl = await createVnPayUrl({
        billId: bill.id,
        amount,
        orderInfo: `Thanh toán hóa đơn #${bill.id}`,
      });
      window.location.href = paymentUrl;
    } catch (err) {
      alert("Không tạo được link thanh toán!");
    }
  };

  const columns = [
    { title: "Mô tả", dataIndex: "description" },
    { 
      title: "Loại", 
      dataIndex: "itemType",
      render: (type) => {
        if (!type) return <Tag>Không xác định</Tag>;
        if (
          type === 'REGULAR' ||
          type === 'ROOM_RENT' ||
          type === 'CONTRACT_ROOM_RENT' ||
          type.includes('ROOM_RENT')
        ) {
          return <Tag color="blue">Tiền phòng</Tag>;
        }
        if (
          type === 'SERVICE' ||
          type === 'CONTRACT_SERVICE' ||
          type.includes('SERVICE')
        ) {
          return <Tag color="green">Dịch vụ</Tag>;
        }
        if (type === 'DEPOSIT' || type.includes('DEPOSIT')) {
          return <Tag color="purple">Đặt cọc</Tag>;
        }
        if (type === 'CONTRACT_TOTAL') {
          return <Tag color="geekblue">Tổng hợp đồng</Tag>;
        }
        if (type === 'LATE_PENALTY') {
          return <Tag color="volcano">Phạt quá hạn</Tag>;
        }
        return <Tag>{type}</Tag>;
      }
    },
    { title: "Dịch vụ", dataIndex: "serviceName", render: v => v || 'Không có' },
    {
      title: "Đơn giá",
      dataIndex: "unitPriceAtBill",
      render: (v) => (v ? v.toLocaleString() + " ₫" : "Không có"),
    },
    { title: "Số lượng", dataIndex: "consumedUnits", render: v => v || 'Không có' },
    {
      title: "Thành tiền",
      dataIndex: "itemAmount",
      render: (v) => (v ? v.toLocaleString() + " ₫" : "Không có"),
    },
  ];

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

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sider width={220} style={{ background: "#001529" }}>
        <RenterSidebar />
      </Sider>
      <div style={{ flex: 1, padding: 24 }}>
        <PageHeader title="Chi tiết hóa đơn" />
        <Card style={{ marginTop: 20 }}>
          {loading ? (
            <Spin />
          ) : bill ? (
            <>
              <Descriptions bordered column={2}>
                <Descriptions.Item label="Mã hóa đơn">#{bill.id}</Descriptions.Item>
                <Descriptions.Item label="Phòng">{bill.roomNumber}</Descriptions.Item>
                <Descriptions.Item label="Mã hợp đồng">{bill.contractId ? `#${bill.contractId}` : "Không có"}</Descriptions.Item>
                <Descriptions.Item label="Loại hóa đơn">
                  <Tag
                    color={
                      bill.billType === "REGULAR" || bill.billType === "ROOM_RENT" || bill.billType === "CONTRACT_ROOM_RENT" || (bill.billType && bill.billType.includes('ROOM_RENT'))
                        ? "blue"
                        : bill.billType === "SERVICE" || bill.billType === "CONTRACT_SERVICE" || (bill.billType && bill.billType.includes('SERVICE'))
                        ? "green"
                        : bill.billType === "DEPOSIT" || (bill.billType && bill.billType.includes('DEPOSIT'))
                        ? "purple"
                        : bill.billType === "CONTRACT_TOTAL"
                        ? "geekblue"
                        : bill.billType === "LATE_PENALTY"
                        ? "volcano"
                        : "default"
                    }
                  >
                    {bill.billType === "REGULAR" || bill.billType === "ROOM_RENT" || bill.billType === "CONTRACT_ROOM_RENT" || (bill.billType && bill.billType.includes('ROOM_RENT'))
                      ? "Tiền phòng"
                      : bill.billType === "SERVICE" || bill.billType === "CONTRACT_SERVICE" || (bill.billType && bill.billType.includes('SERVICE'))
                      ? "Dịch vụ"
                      : bill.billType === "DEPOSIT" || (bill.billType && bill.billType.includes('DEPOSIT'))
                      ? "Đặt cọc"
                      : bill.billType === "CONTRACT_TOTAL"
                      ? "Tổng hợp đồng"
                      : bill.billType === "LATE_PENALTY"
                      ? "Phạt quá hạn"
                      : bill.billType || 'Không xác định'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Từ ngày">{dayjs(bill.fromDate).format("DD/MM/YYYY")}</Descriptions.Item>
                <Descriptions.Item label="Đến ngày">
                  {bill.toDate && dayjs(bill.toDate, "YYYY-MM-DD HH:mm:ss A").isValid() ? (
                    dayjs(bill.toDate, "YYYY-MM-DD HH:mm:ss A").format("DD/MM/YYYY")
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
                <Descriptions.Item label="Tổng tiền">{bill.totalAmount?.toLocaleString()} ₫</Descriptions.Item>
                <Descriptions.Item label="Trạng thái">
                  <Tag color={bill.status ? "green" : "red"}>
                    {bill.status ? "Đã thanh toán" : "Chưa thanh toán"}
                  </Tag>
                </Descriptions.Item>
                {bill.billType === 'LATE_PENALTY' && (
                  <>
                    <Descriptions.Item label="Hóa đơn gốc">
                      <Button 
                        type="link" 
                        onClick={() => navigate(`/renter/bills/${bill.originalBillId}`)}
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
                      <span style={{ color: '#cf1322', fontWeight: 'bold' }}>
                        {bill.penaltyAmount?.toLocaleString()} ₫
                      </span>
                    </Descriptions.Item>
                    {bill.notes && (
                      <Descriptions.Item label="Ghi chú" span={2}>
                        <span style={{ color: '#666' }}>{bill.notes}</span>
                      </Descriptions.Item>
                    )}
                  </>
                )}
              </Descriptions>

              <h3 style={{ marginTop: 24 }}>Chi tiết các khoản</h3>
              <Table
                columns={columns}
                dataSource={bill.details}
                rowKey={(_, idx) => idx}
                pagination={false}
                size="small"
                scroll={{ x: 600 }}
              />

              <div style={{ marginTop: 24 }}>
                <Button onClick={handleExport} type="primary">Xuất PDF</Button>

                {!bill.status && (
                  <Button
                    type="primary"
                    style={{ marginLeft: 16 }}
                    onClick={handlePayVnPay}
                  >
                    Thanh toán VNPay
                  </Button>
                )}

                <Button style={{ marginLeft: 16 }} onClick={() => navigate(-1)}>
                  Quay lại
                </Button>
              </div>
            </>
          ) : (
            <div>Không tìm thấy hóa đơn</div>
          )}
        </Card>
      </div>
    </div>
  );
}
