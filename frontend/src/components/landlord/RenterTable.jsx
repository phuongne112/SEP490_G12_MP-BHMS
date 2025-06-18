import React from "react";
import { Table } from "antd";

const mockData = [
  {
    key: "1",
    name: "John Doe",
    room: "Room 201",
    checkInDate: "2024-01-10",
  },
  {
    key: "2",
    name: "Jane Smith",
    room: "Room 202",
    checkInDate: "2024-03-15",
  },
  {
    key: "3",
    name: "Michael Wilson",
    room: "Room 203",
    checkInDate: "2024-05-01",
  },
];

export default function RenterTable({ search = "", filter = {} }) {
  const filteredData = mockData.filter((renter) => {
    const matchSearch =
      renter.name.toLowerCase().includes(search.toLowerCase()) ||
      renter.room.toLowerCase().includes(search.toLowerCase());

    const matchRoom = filter.room ? renter.room === filter.room : true;

    const matchDate =
      filter.checkInDateRange?.length === 2
        ? new Date(renter.checkInDate) >= filter.checkInDateRange[0]._d &&
          new Date(renter.checkInDate) <= filter.checkInDateRange[1]._d
        : true;

    return matchSearch && matchRoom && matchDate;
  });

  const columns = [
    { title: "No.", dataIndex: "key", key: "key" },
    { title: "Name", dataIndex: "name", key: "name" },
    { title: "Room", dataIndex: "room", key: "room" },
    { title: "Check-in Date", dataIndex: "checkInDate", key: "checkInDate" },
  ];

  return (
    <Table
      columns={columns}
      dataSource={filteredData}
      pagination={{ pageSize: 5 }}
    />
  );
}
