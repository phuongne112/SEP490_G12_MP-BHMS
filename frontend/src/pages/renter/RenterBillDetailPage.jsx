import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, Descriptions, Table, Button, Spin, Tag, message, Modal } from "antd";
import { getBillDetail } from "../../services/billApi";
import dayjs from "dayjs";

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
      message.error("Failed to load bill detail");
    }
    setLoading(false);
  };

  const columns = [
    { title: "Description", dataIndex: "description" },
    { title: "Type", dataIndex: "itemType" },
    { title: "Service", dataIndex: "serviceName" },
    { title: "Unit Price", dataIndex: "unitPriceAtBill", render: v => v ? v.toLocaleString() + ' VND' : '' },
    { title: "Consumed", dataIndex: "consumedUnits" },
    { title: "Amount", dataIndex: "itemAmount", render: v => v ? v.toLocaleString() + ' VND' : '' },
  ];

  return (
    <div style={{ maxWidth: 800, margin: "40px auto", background: "#fff", padding: 24, borderRadius: 12 }}>
      <Button onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>Back</Button>
      <h2>Bill Detail</h2>
      <Card>
        {loading ? (
          <Spin />
        ) : bill ? (
          <>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="Bill ID">#{bill.id}</Descriptions.Item>
              <Descriptions.Item label="Room">{bill.roomNumber}</Descriptions.Item>
              <Descriptions.Item label="Contract ID">{bill.contractId ? `#${bill.contractId}` : "N/A"}</Descriptions.Item>
              <Descriptions.Item label="Type">
                <Tag color={bill.billType === "REGULAR" ? "blue" : bill.billType === "CUSTOM" ? "orange" : "green"}>
                  {bill.billType}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="From">{dayjs(bill.fromDate).format("DD/MM/YYYY")}</Descriptions.Item>
              <Descriptions.Item label="To">{dayjs(bill.toDate).format("DD/MM/YYYY")}</Descriptions.Item>
              <Descriptions.Item label="Total">{bill.totalAmount?.toLocaleString()} VND</Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={bill.status ? "green" : "red"}>{bill.status ? "Paid" : "Unpaid"}</Tag>
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
          </>
        ) : (
          <div>Bill not found</div>
        )}
      </Card>
    </div>
  );
} 