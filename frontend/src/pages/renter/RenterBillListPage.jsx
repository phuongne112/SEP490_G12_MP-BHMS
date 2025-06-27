import React, { useEffect, useState } from "react";
import { Table, Button, Tag, message, Spin } from "antd";
import { useNavigate } from "react-router-dom";
import { getMyBills } from "../../services/billApi";
import dayjs from "dayjs";

export default function RenterBillListPage() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    setLoading(true);
    try {
      const res = await getMyBills();
      setBills(res.content || []);
    } catch (err) {
      message.error("Failed to load bills");
    }
    setLoading(false);
  };

  const columns = [
    { title: "Bill ID", dataIndex: "id", align: "center", render: id => `#${id}` },
    { title: "Room", dataIndex: "roomNumber", align: "center" },
    { title: "Type", dataIndex: "billType", align: "center", render: t => <Tag>{t}</Tag> },
    { title: "From", dataIndex: "fromDate", align: "center", render: d => dayjs(d).format("DD/MM/YYYY") },
    { title: "To", dataIndex: "toDate", align: "center", render: d => dayjs(d).format("DD/MM/YYYY") },
    { title: "Total", dataIndex: "totalAmount", align: "center", render: v => v?.toLocaleString() + " VND" },
    { title: "Status", dataIndex: "status", align: "center", render: s => <Tag color={s ? "green" : "red"}>{s ? "Paid" : "Unpaid"}</Tag> },
    {
      title: "Actions",
      align: "center",
      render: (_, record) => (
        <Button type="primary" onClick={() => navigate(`/renter/bills/${record.id}`)}>
          View
        </Button>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", background: "#fff", padding: 24, borderRadius: 12 }}>
      <h2>My Bills</h2>
      {loading ? <Spin /> : (
        <Table
          columns={columns}
          dataSource={bills}
          rowKey="id"
          pagination={false}
        />
      )}
    </div>
  );
} 