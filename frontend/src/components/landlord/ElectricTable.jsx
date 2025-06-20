import React from "react";
import { Table } from "antd";

export default function ElectricTable({
  dataSource = [],
  currentPage = 1,
  pageSize = 5,
  total = 0,
  onPageChange = () => {},
}) {
  const columns = [
    { title: "Room", dataIndex: "room" },
    {
      title: "Last Month",
      dataIndex: "lastMonth",
    },
    {
      title: "This Month",
      dataIndex: "thisMonth",
    },
    {
      title: "Bill (VND)",
      dataIndex: "bill",
      render: (value) => value.toLocaleString("vi-VN"),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={dataSource}
      pagination={{
        current: currentPage,
        pageSize: pageSize,
        total: total,
        onChange: onPageChange,
      }}
    />
  );
}
