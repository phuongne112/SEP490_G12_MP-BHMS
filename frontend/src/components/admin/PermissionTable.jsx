import React, { useEffect, useState } from "react";
import { Table, Button, Space, Tooltip, message, Popconfirm } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { getAllPermissions } from "../../services/permissionApi";
import { useSelector } from "react-redux";
import { useMediaQuery } from "react-responsive";

// ✅ Hàm tạo DSL cho filter và tìm kiếm
const buildFilterDSL = (search, filters) => {
  const dsl = [];

  if (search.name?.trim()) {
    dsl.push(`name~'${search.name.trim()}'`);
  }

  if (search.api?.trim()) {
    dsl.push(`apiPath~'${search.api.trim()}'`);
  }

  if (filters.method && filters.method !== "All") {
    dsl.push(`method = '${filters.method}'`);
  }

  if (filters.module && filters.module !== "All") {
    dsl.push(`module ~'${filters.module}'`);
  }

  return dsl.join(" and ");
};

export default function PermissionTable({
  pageSize,
  currentPage,
  onPageChange,
  search,
  filters,
  onEditPermission,
  onDeletePermission,
  refreshKey,
  onTotalChange,
}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: currentPage || 1,
    total: 0,
  });

  const user = useSelector((state) => state.account.user);
  const permissions = user?.permissions || [];

  const hasEdit = permissions.includes("Update Permission");
  const hasDelete = permissions.includes("Delete Permission");

  // Responsive states
  const isMobile = useMediaQuery({ maxWidth: 768 });

  const fetchData = async (page = 1) => {
    setLoading(true);
    try {
      const filterDSL = buildFilterDSL(search, filters);
      const res = await getAllPermissions(page - 1, pageSize, filterDSL);

      const result = res?.result || [];
      const total = res?.meta?.total || 0;

      setData(result);
      setPagination({ current: page, total, pageSize });
      if (onTotalChange) onTotalChange(total);
      if (onPageChange) onPageChange(page);
    } catch (err) {
      console.error("Lỗi khi tải danh sách quyền:", err);
      message.error("Không thể tải danh sách quyền. Vui lòng thử lại.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData(currentPage || 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSize, search, filters, refreshKey]);

  const columns = [
    {
      title: "STT",
      dataIndex: "id",
      align: "center",
      width: isMobile ? 40 : 60,
      render: (_, __, index) => (pagination.current - 1) * pageSize + index + 1,
    },
    {
      title: "Tên quyền",
      dataIndex: "name",
      align: "center",
      width: isMobile ? 120 : 200,
    },
    {
      title: "API",
      dataIndex: "apiPath",
      align: "center",
      width: isMobile ? 150 : 250,
    },
    {
      title: "Phương thức",
      dataIndex: "method",
      align: "center",
      width: isMobile ? 80 : 120,
    },
    {
      title: "Chức năng",
      dataIndex: "module",
      align: "center",
      width: isMobile ? 100 : 150,
    },
  ];

  // ✅ Thêm cột Thao tác nếu có quyền
  if (hasEdit || hasDelete) {
    columns.push({
      title: "Thao tác",
      align: "center",
      width: isMobile ? 120 : 200,
      render: (_, record) => (
        <Space size="small" style={{ flexWrap: 'nowrap', justifyContent: 'center' }}>
          {hasEdit && (
            <Button
              type="default"
              icon={<EditOutlined />}
              size="small"
              style={{ color: "#faad14", borderColor: "#faad14" }}
              onClick={() => onEditPermission(record)}
              title="Chỉnh sửa thông tin quyền"
            >
              Sửa
            </Button>
          )}
          {hasDelete && (
            <Popconfirm
              title="Xóa quyền"
              description="Bạn có chắc muốn xóa quyền này?"
              onConfirm={() => onDeletePermission(record)}
              okText="Xóa"
                              cancelText="Hủy"
            >
              <Button
                icon={<DeleteOutlined />}
                type="primary"
                danger
                size="small"
                title="Xóa quyền"
              />
            </Popconfirm>
          )}
        </Space>
      ),
    });
  }

  return (
    <Table
      rowKey="id"
      columns={columns}
      dataSource={data}
      loading={loading}
      pagination={{
        current: pagination.current,
        total: pagination.total,
        pageSize,
        showSizeChanger: false,
        showQuickJumper: false,
        showTotal: (total, range) => `${range[0]}-${range[1]} trên tổng số ${total} quyền`,
        pageSizeOptions: ['5', '10', '20', '50'],
        onChange: (page) => fetchData(page)
      }}
      style={{ background: "#fff", borderRadius: 8 }}
      scroll={{ x: isMobile ? 600 : 1000 }}
      bordered
    />
  );
}
