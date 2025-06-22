import React from "react";
import { Table, Button } from "antd";

export default function ContractTable({ contracts = [], onExport }) {
  const columns = [
    {
      title: "Contract ID",
      dataIndex: "id",
    },
    {
      title: "Renter Name",
      render: (_, record) =>
        record?.roomUser?.user?.userInfo?.fullName || "Unknown",
    },
    {
      title: "Room Number",
      render: (_, record) => record?.room?.roomNumber || "Unknown",
    },
    {
      title: "Start Date",
      dataIndex: "contractStartDate",
      render: (text) =>
        text ? new Date(text).toLocaleDateString("en-GB") : "—",
    },
    {
      title: "End Date",
      dataIndex: "contractEndDate",
      render: (text) =>
        text ? new Date(text).toLocaleDateString("en-GB") : "—",
    },
    {
      title: "Actions",
      render: (_, record) => (
        <Button type="link" onClick={() => onExport(record.id)}>
          Export PDF
        </Button>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={contracts}
      rowKey="id"
      pagination={{ pageSize: 5 }}
      style={{ background: "#fff", borderRadius: 8, padding: 16 }}
    />
  );
}
