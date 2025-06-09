import React from "react";
import { Table, Button, Space } from "antd";

const mockData = [
  {
    key: 1,
    email: "minhphuong01@gmail.com",
    role: "admin",
    event: "Login Performed",
    description: "User minhphuong01@gmail.com just logged in",
    date: "2024-12-02 08:30:00",
  },
  {
    key: 2,
    email: "lethuha03@gmail.com",
    role: "admin",
    event: "Archiving Request",
    description: "System Policy initiated archiving",
    date: "2025-02-11 10:00:00",
  },
  {
    key: 3,
    email: "minhphuong01@gmail.com",
    role: "admin",
    event: "Login Performed",
    description: "User minhphuong01@gmail.com just logged in",
    date: "2024-12-02 08:30:00",
  },
  {
    key: 4,
    email: "lethuha03@gmail.com",
    role: "renter",
    event: "Archiving Request",
    description: "System Policy initiated archiving",
    date: "2025-02-11 10:00:00",
  },
  {
    key: 5,
    email: "minhphuong01@gmail.com",
    role: "landlord",
    event: "Login Performed",
    description: "User minhphuong01@gmail.com just logged in",
    date: "2024-12-02 08:30:00",
  },
  {
    key: 6,
    email: "lethuha03@gmail.com",
    role: "admin",
    event: "Archiving Request",
    description: "System Policy initiated archiving",
    date: "2025-02-11 10:00:00",
  },
  {
    key: 7,
    email: "minhphuong01@gmail.com",
    role: "admin",
    event: "Login Performed",
    description: "User minhphuong01@gmail.com just logged in",
    date: "2024-12-02 08:30:00",
  },
  {
    key: 8,
    email: "lethuha03@gmail.com",
    role: "admin",
    event: "Archiving Request",
    description: "System Policy initiated archiving",
    date: "2025-02-11 10:00:00",
  },
  {
    key: 9,
    email: "minhphuong01@gmail.com",
    role: "admin",
    event: "Login Performed",
    description: "User minhphuong01@gmail.com just logged in",
    date: "2024-12-02 08:30:00",
  },
  {
    key: 10,
    email: "lethuha03@gmail.com",
    role: "admin",
    event: "Archiving Request",
    description: "System Policy initiated archiving",
    date: "2025-02-11 10:00:00",
  },
  {
    key: 11,
    email: "minhphuong01@gmail.com",
    role: "admin",
    event: "Login Performed",
    description: "User minhphuong01@gmail.com just logged in",
    date: "2024-12-02 08:30:00",
  },
];
export default function NotificationTable({
  pageSize,
  searchTerm,
  filters,
  onView,
  onDelete,
}) {
  const columns = (onView, onDelete) => [
    { title: "No", dataIndex: "key", key: "key" },
    { title: "Account(Email)", dataIndex: "email", key: "email" },
    { title: "Role", dataIndex: "role", key: "role" },
    { title: "Event", dataIndex: "event", key: "event" },
    { title: "Description", dataIndex: "description", key: "description" },
    { title: "Date", dataIndex: "date", key: "date" },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button size="medium" onClick={() => onView(record)}>
            View
          </Button>
          <Button size="medium" danger onClick={() => onDelete(record)}>
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  const filteredData = mockData
    .filter((item) =>
      item.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter((item) =>
      filters.role === "All"
        ? true
        : item.role.toLowerCase() === filters.role.toLowerCase()
    )
    .filter((item) =>
      filters.event === "All" ? true : item.event === filters.event
    )
    .filter((item) => {
      if (!filters.dateRange) return true;
      const date = new Date(item.date);
      return (
        date >= filters.dateRange[0].toDate() &&
        date <= filters.dateRange[1].toDate()
      );
    });
  return (
    <Table
      columns={columns(onView, onDelete)}
      dataSource={filteredData}
      pagination={{ pageSize }}
    />
  );
}
