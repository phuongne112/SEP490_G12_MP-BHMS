import React from "react";
import { Table, Tag, Button, Space } from "antd";

const mockData = [
  {
    key: 1,
    email: "minhphuong01@gmail.com",
    createdAt: "2024-12-01",
    status: "Active",
    role: "Landlord",
  },
  {
    key: 2,
    email: "minhphuong01@gmail.com",
    createdAt: "2024-12-01",
    status: "Active",
    role: "Landlord",
  },
  {
    key: 3,
    email: "lethuha03@gmail.com",
    createdAt: "2024-12-03",
    status: "Deactivate",
    role: "Renter",
  },
  {
    key: 4,
    email: "minhphuong01@gmail.com",
    createdAt: "2024-12-01",
    status: "Deactivate",
    role: "Landlord",
  },
  {
    key: 5,
    email: "minhphuong01@gmail.com",
    createdAt: "2024-12-01",
    status: "Active",
    role: "Landlord",
  },
  {
    key: 6,
    email: "minhphuong01@gmail.com",
    createdAt: "2024-12-01",
    status: "Active",
    role: "Landlord",
  },
  {
    key: 7,
    email: "minhphuong01@gmail.com",
    createdAt: "2024-12-01",
    status: "Active",
    role: "Landlord",
  },
  {
    key: 8,
    email: "minhphuong01@gmail.com",
    createdAt: "2024-12-01",
    status: "Active",
    role: "Landlord",
  },
  {
    key: 9,
    email: "minhphuong01@gmail.com",
    createdAt: "2024-12-01",
    status: "Active",
    role: "Landlord",
  },
  {
    key: 10,
    email: "lethuha03@gmail.com",
    createdAt: "2024-12-03",
    status: "Deactivate",
    role: "Renter",
  },
  {
    key: 11,
    email: "minhphuong01@gmail.com",
    createdAt: "2024-12-01",
    status: "Deactivate",
    role: "Landlord",
  },
  {
    key: 12,
    email: "minhphuong01@gmail.com",
    createdAt: "2024-12-01",
    status: "Active",
    role: "Landlord",
  },
  {
    key: 13,
    email: "minhphuong01@gmail.com",
    createdAt: "2024-12-01",
    status: "Active",
    role: "Landlord",
  },
  {
    key: 14,
    email: "minhphuong01@gmail.com",
    createdAt: "2024-12-01",
    status: "Active",
    role: "Landlord",
  },
];

export default function UserTable({ pageSize, searchTerm, filters, onEdit }) {
  const filteredData = mockData
    .filter((item) =>
      item.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter((item) =>
      filters.role === "All" ? true : item.role === filters.role
    )
    .filter((item) => {
      if (!filters.dateRange) return true;
      const created = new Date(item.createdAt);
      return (
        created >= filters.dateRange[0].toDate() &&
        created <= filters.dateRange[1].toDate()
      );
    });

  const columns = [
    {
      title: "No.",
      dataIndex: "key",
      width: 60,
    },
    {
      title: "Account(Email)",
      dataIndex: "email",
    },
    {
      title: "Created Date",
      dataIndex: "createdAt",
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (status) => (
        <Tag color={status === "Active" ? "green" : "red"}>{status}</Tag>
      ),
    },
    {
      title: "Role",
      dataIndex: "role",
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button size="medium" onClick={() => onEdit(record.email)}>
            Edit
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={filteredData}
      pagination={{ pageSize }}
    ></Table>
  );
}
