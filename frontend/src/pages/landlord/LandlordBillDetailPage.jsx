import React, { useEffect, useState } from "react";
import { Descriptions, Button, message, Spin } from "antd";
import { getBillDetail } from "../../services/billApi";
import { useParams, useNavigate } from "react-router-dom";

export default function LandlordBillDetailPage() {
  const { id } = useParams();
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBill = async () => {
      setLoading(true);
      try {
        const res = await getBillDetail(id);
        setBill(res.data || res); // lấy đúng trường data nếu có
      } catch {
        message.error("Failed to load bill detail");
      } finally {
        setLoading(false);
      }
    };
    fetchBill();
  }, [id]);

  if (loading) return <Spin style={{ margin: 40 }} />;
  if (!bill) return <div style={{ padding: 24 }}>No bill found.</div>;

  return (
    <div style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
      <h2>Bill Detail</h2>
      <Descriptions bordered column={1}>
        <Descriptions.Item label="Bill ID">{bill.id}</Descriptions.Item>
        <Descriptions.Item label="Room">{bill.roomNumber}</Descriptions.Item>
        <Descriptions.Item label="Contract ID">{bill.contractId}</Descriptions.Item>
        <Descriptions.Item label="From Date">{bill.fromDate}</Descriptions.Item>
        <Descriptions.Item label="To Date">{bill.toDate}</Descriptions.Item>
        <Descriptions.Item label="Bill Date">{bill.billDate}</Descriptions.Item>
        <Descriptions.Item label="Due Date">{bill.dueDate}</Descriptions.Item>
        <Descriptions.Item label="Paid Date">{bill.paidDate || 'N/A'}</Descriptions.Item>
        <Descriptions.Item label="Total">{bill.totalAmount}</Descriptions.Item>
        <Descriptions.Item label="Status">{bill.status === true ? 'Paid' : 'Unpaid'}</Descriptions.Item>
        {/* Thêm các trường khác nếu cần */}
      </Descriptions>
      <Button style={{ marginTop: 16 }} onClick={() => navigate(-1)}>Back</Button>
    </div>
  );
} 