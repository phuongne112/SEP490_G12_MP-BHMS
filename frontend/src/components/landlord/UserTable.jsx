import React from "react";
import { Table, Button, Space, Popconfirm } from "antd";

export default function UserTable({ users, loading, pagination, onChangeRenter }) {
  const columns = [
    {
      title: "STT",
      dataIndex: "no",
      align: "center",
      render: (_, __, index) => (pagination && pagination.current ? (pagination.current - 1) * (pagination.pageSize || 10) + index + 1 : index + 1),
      width: 60,
    },
    {
      title: "Tên đăng nhập",
      dataIndex: "username",
      align: "center",
    },
    {
      title: "Họ và tên",
      align: "center",
      render: (_, record) => record.userInfo?.fullName || record.fullName || "---",
    },
    {
      title: "Email",
      dataIndex: "email",
      align: "center",
    },
    {
      title: "Số điện thoại",
      dataIndex: "phoneNumber",
      align: "center",
      render: (_, record) => record.userInfo?.phoneNumber || record.phoneNumber || "---",
    },
    {
      title: "Thao tác",
      align: "center",
      render: (_, record) => (
        <Space>
          {(!record.role || !record.role.roleName) && onChangeRenter && (
            <Popconfirm
              title="Bạn có chắc muốn chuyển người dùng này thành người thuê?"
              onConfirm={() => onChangeRenter(record)}
              okText="Có"
              cancelText="Không"
            >
              <Button type="primary">Chuyển thành người thuê</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={users}
      loading={loading}
      rowKey="id"
      pagination={pagination}
    />
  );
} 