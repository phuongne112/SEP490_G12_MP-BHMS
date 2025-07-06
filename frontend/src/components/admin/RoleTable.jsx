import React, { useEffect, useState } from "react";
import { Table, Button, Space, Tooltip, message, Alert } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { getAllRoles } from "../../services/roleApi";
import { useSelector } from "react-redux";

const buildFilterDSL = (searchTerm, filters) => {
  const dsl = [];
  if (searchTerm?.trim()) {
    dsl.push(`roleName~'${searchTerm.trim()}'`);
  }
  if (filters.dateRange && filters.dateRange.length === 2) {
    const [start, end] = filters.dateRange;
    if (start && end) {
      dsl.push(`createdDate >: '${start.format("YYYY-MM-DD")}'`);
      dsl.push(`createdDate <: '${end.format("YYYY-MM-DD")}'`);
    }
  }
  return dsl.join(" and ");
};

export default function RoleTable({
  pageSize,
  searchTerm,
  onEditRole,
  onDeleteRole,
  refreshKey,
  filters,
  deleteError,
}) {
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, total: 0 });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const currentUser = useSelector((state) => state.account.user);
  const currentRole = currentUser?.role;
  const permissions = currentUser?.permissions || [];

  const canEdit = permissions.includes("Update Role");
  const canDelete = permissions.includes("Delete Role");

  const fetchData = async (page = 1) => {
    setLoading(true);
    try {
      const filterDSL = buildFilterDSL(searchTerm, filters);
      const res = await getAllRoles(page - 1, pageSize, filterDSL);
      const result = res.result || [];
      const total = res.meta?.total || 0;

      setData(
        result.map((item, index) => ({
          key: item.id || index + 1 + (page - 1) * pageSize,
          ...item,
          createdAt: item.createdDate?.slice(0, 10),
        }))
      );
      setPagination({ current: page, total });
    } catch (err) {
      message.error("Không thể tải danh sách vai trò.");
      console.error("Lỗi khi lấy vai trò:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setErrorMsg(null);
    fetchData(1);
  }, [searchTerm, filters.dateRange, pageSize, refreshKey]);

  useEffect(() => {
    if (deleteError) {
      setErrorMsg(deleteError);
    }
  }, [deleteError]);

  const columns = [
    {
      title: "STT",
      dataIndex: "key",
      align: "center",
      width: 80,
      render: (_, __, index) => (pagination.current - 1) * pageSize + index + 1,
    },
    {
      title: "Tên vai trò",
      dataIndex: "roleName",
      width: "60%",
      render: (text) => <span style={{ fontWeight: 500 }}>{text}</span>,
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
    },
    ...(canEdit || canDelete
      ? [
          {
            title: "Thao tác",
            key: "actions",
            align: "center",
            width: 120,
            render: (_, record) => {
              const targetRole = record.roleName;

              if (
                currentRole?.roleName === "SUBADMIN" &&
                (targetRole === "ADMIN" || targetRole === "SUBADMIN")
              ) {
                return null;
              }

              return (
                <Space>
                  {canEdit && (
                    <Tooltip title="Chỉnh sửa">
                      <Button
                        icon={<EditOutlined />}
                        onClick={() => onEditRole(record)}
                      />
                    </Tooltip>
                  )}
                  {canDelete &&
                    !(
                      currentRole?.roleName === "ADMIN" &&
                      record.roleName === "ADMIN"
                    ) && (
                      <Tooltip title="Xóa">
                        <Button
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => onDeleteRole(record)}
                        />
                      </Tooltip>
                    )}
                </Space>
              );
            },
          },
        ]
      : []),
  ];

  return (
    <>
      {errorMsg && (
        <Alert
          message={errorMsg}
          type="error"
          showIcon
          closable
          onClose={() => setErrorMsg(null)}
          style={{ marginBottom: 16 }}
        />
      )}

      <Table
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{
          current: pagination.current,
          total: pagination.total,
          pageSize,
          onChange: (page) => fetchData(page),
        }}
        bordered
        rowKey="id"
      />
    </>
  );
}
