import React from "react";
import { Table, Button, Popconfirm } from "antd";

export default function ContractTable({ contracts = [], onExport, onDelete, loading, onFilter }) {
  const columns = [
    {
      title: "Contract ID",
      dataIndex: "id",
    },
    {
      title: "Renter Name",
      render: (_, record) =>
        Array.isArray(record?.renterNames) && record.renterNames.length > 0
          ? record.renterNames.join(", ")
          : "Unknown",
    },
    {
      title: "Room Number",
      render: (_, record) => record?.roomNumber || "Unknown",
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
        <>
        <Button type="link" onClick={() => onExport(record.id)}>
          Export PDF
        </Button>
          <Popconfirm title="Delete contract?" onConfirm={() => onDelete(record.id)}>
            <Button type="link" danger>
              Delete
            </Button>
          </Popconfirm>
        </>
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
      loading={loading}
    />
  );
}
