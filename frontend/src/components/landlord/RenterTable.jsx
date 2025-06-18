import React from "react";
import { Table, Tag } from "antd";

const columns = [
  {
    title: "No.",
    dataIndex: "no",
    key: "no",
    width: 50,
  },
  {
    title: "Name",
    dataIndex: "name",
    key: "name",
    width: 150,
  },
  {
    title: "Room",
    dataIndex: "room",
    key: "room",
    width: 150,
  },
  {
    title: "Check-in Date",
    dataIndex: "checkInDate",
    key: "checkInDate",
    width: 150,
  },
];

const data = [
  {
    key: 1,
    no: 1,
    name: "John Doe",
    room: "101",
    checkInDate: "01/10/2024",
  },
  {
    key: 2,
    no: 2,
    name: "Jane Smith",
    room: "202",
    checkInDate: "03/15/2024",
  },
  {
    key: 3,
    no: 3,
    name: "Robert Johnson",
    room: "105",
    checkInDate: "05/20/2024",
  },
  {
    key: 4,
    no: 4,
    name: "Emily Davis",
    room: "204",
    checkInDate: "07/25/2024",
  },
  {
    key: 5,
    no: 5,
    name: "Michael Wilson",
    room: "303",
    checkInDate: "09/30/2024",
  },
  {
    key: 6,
    no: 6,
    name: "Sarah Brown",
    room: "104",
    checkInDate: "02/05/2024",
  },
  {
    key: 7,
    no: 7,
    name: "David Miller",
    room: "205",
    checkInDate: "04/10/2024",
  },
  {
    key: 8,
    no: 8,
    name: "Amanda Taylor",
    room: "302",
    checkInDate: "06/15/2024",
  },
  {
    key: 9,
    no: 9,
    name: "James Anderson",
    room: "203",
    checkInDate: "08/20/2024",
  },
  {
    key: 10,
    no: 10,
    name: "Jessica Martinez",
    room: "301",
    checkInDate: "10/25/2024",
  },
];

export default function RenterTable() {
  return (
    <Table
      columns={columns}
      dataSource={data}
      pagination={{ pageSize: 5 }}
      bordered
    />
  );
}
