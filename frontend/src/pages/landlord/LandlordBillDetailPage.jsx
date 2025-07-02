import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, Descriptions, Table, Button, Spin, message, Tag, Layout } from "antd";
import { getBillDetail, exportBillPdf, createVnPayUrl } from "../../services/billApi";
import LandlordSidebar from "../../components/layout/LandlordSidebar";
import PageHeader from "../../components/common/PageHeader";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);

const { Sider } = Layout;

export default function LandlordBillDetailPage() {
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
      message.error("Failed to load bill detail");
    }
    setLoading(false);
  };

  const handleExport = async () => {
    try {
      const data = await exportBillPdf(bill.id);
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `bill_${bill.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      message.error("Export failed");
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
    { title: "Description", dataIndex: "description" },
    { title: "Type", dataIndex: "itemType" },
    { title: "Service", dataIndex: "serviceName" },
    {
      title: "Unit Price",
      dataIndex: "unitPriceAtBill",
      render: (v) => (v ? v.toLocaleString() + " VND" : ""),
    },
    { title: "Consumed", dataIndex: "consumedUnits" },
    {
      title: "Amount",
      dataIndex: "itemAmount",
      render: (v) => (v ? v.toLocaleString() + " VND" : ""),
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
        <LandlordSidebar />
      </Sider>
      <div style={{ flex: 1, padding: 24 }}>
        <PageHeader title="Bill Detail" />
        <Card style={{ marginTop: 20 }}>
          {loading ? (
            <Spin />
          ) : bill ? (
            <>
              <Descriptions bordered column={2}>
                <Descriptions.Item label="Bill ID">#{bill.id}</Descriptions.Item>
                <Descriptions.Item label="Room">{bill.roomNumber}</Descriptions.Item>
                <Descriptions.Item label="Contract ID">
                  {bill.contractId ? `#${bill.contractId}` : "N/A"}
                </Descriptions.Item>
                <Descriptions.Item label="Type">
                  <Tag
                    color={
                      bill.billType === "REGULAR"
                        ? "blue"
                        : bill.billType === "CUSTOM"
                        ? "orange"
                        : "green"
                    }
                  >
                    {bill.billType}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="From">
                  {dayjs(bill.fromDate).format("DD/MM/YYYY")}
                </Descriptions.Item>
                <Descriptions.Item label="To">
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
                <Descriptions.Item label="Total">
                  {bill.totalAmount?.toLocaleString()} VND
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Tag color={bill.status ? "green" : "red"}>
                    {bill.status ? "Paid" : "Unpaid"}
                  </Tag>
                </Descriptions.Item>
              </Descriptions>

              <h3 style={{ marginTop: 24 }}>Bill Details</h3>
              <Table
                columns={columns}
                dataSource={bill.details}
                rowKey={(_, idx) => idx}
                pagination={false}
                size="small"
              />

              <div style={{ marginTop: 24 }}>
                <Button onClick={handleExport} type="primary">
                  Export PDF
                </Button>

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
                  Back
                </Button>
              </div>
            </>
          ) : (
            <div>Bill not found</div>
          )}
        </Card>
      </div>
    </div>
  );
}
