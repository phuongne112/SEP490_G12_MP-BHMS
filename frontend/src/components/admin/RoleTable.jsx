import React, { useEffect, useState } from "react";
import { Table, Button, Space, Tooltip, message, Alert, Popconfirm } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { getAllRoles } from "../../services/roleApi";
import { useSelector } from "react-redux";

// Hàm chuyển đổi ngày sang định dạng Việt Nam chuẩn (dd/mm/yyyy)
const formatDateToVietnamese = (dateString) => {
  if (!dateString) return "";
  
  // Xử lý format "2025-07-28 16:11:04 PM" từ API
  let date;
  
  // Thử parse trực tiếp
  date = new Date(dateString);
  
  // Nếu không hợp lệ, thử xử lý format đặc biệt
  if (isNaN(date.getTime())) {
    // Tách phần ngày từ "2025-07-28 16:11:04 PM"
    const datePart = dateString.split(' ')[0];
    if (datePart) {
      date = new Date(datePart);
    }
  }
  
  // Kiểm tra xem ngày có hợp lệ không
  if (isNaN(date.getTime())) {
    return "";
  }
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
};

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
  onTotalChange,
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
          createdAt: item.createdDate ? formatDateToVietnamese(item.createdDate) : "",
          updatedAt: item.updatedDate ? formatDateToVietnamese(item.updatedDate) : "",
        }))
      );
      setPagination({ current: page, total });
      if (onTotalChange) onTotalChange(total);
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
      align: "center",
      width: 200,
      render: (text) => <span>{text}</span>,
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      align: "center",
      width: 120,
    },
    {
      title: "Ngày cập nhật",
      dataIndex: "updatedAt",
      align: "center",
      width: 120,
    },
    ...(canEdit || canDelete
      ? [
          {
            title: "Thao tác",
            key: "actions",
            align: "center",
            width: 200,
            render: (_, record) => {
              const targetRole = record.roleName;

              if (
                currentRole?.roleName === "SUBADMIN" &&
                (targetRole === "ADMIN" || targetRole === "SUBADMIN")
              ) {
                return null;
              }

              return (
                <Space size="small" style={{ flexWrap: 'nowrap', justifyContent: 'center' }}>
                  {canEdit && (
                    <Button
                      type="default"
                      icon={<EditOutlined />}
                      size="small"
                      style={{ color: "#faad14", borderColor: "#faad14" }}
                      onClick={() => onEditRole(record)}
                      title="Chỉnh sửa thông tin vai trò"
                    >
                      Sửa
                    </Button>
                  )}
                  {canDelete &&
                    !(
                      currentRole?.roleName === "ADMIN" &&
                      record.roleName === "ADMIN"
                    ) && (
                      <Popconfirm
                        title="Xóa vai trò"
                        description="Bạn có chắc muốn xóa vai trò này?"
                        onConfirm={() => onDeleteRole(record)}
                        okText="Xóa"
                        cancelText="Hủy"
                      >
                        <Button
                          icon={<DeleteOutlined />}
                          type="primary"
                          danger
                          size="small"
                          title="Xóa vai trò"
                        />
                      </Popconfirm>
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
        style={{ background: "#fff", borderRadius: 8, padding: 16 }}
        scroll={{ x: 800 }}
        bordered
        rowKey="id"
      />
    </>
  );
}
