import React, { useEffect, useState } from "react";
import { Table, Button, Space, Tooltip, message } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { getAllPermissions } from "../../services/permissionApi";
import { useSelector } from "react-redux";

// ✅ Hàm tạo DSL cho filter và search
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

  const fetchData = async (page = 1) => {
    setLoading(true);
    try {
      const filterDSL = buildFilterDSL(search, filters);
      const res = await getAllPermissions(page - 1, pageSize, filterDSL);

      const result = res?.result || [];
      const total = res?.meta?.total || 0;

      setData(result);
      setPagination({ current: page, total, pageSize });
      if (onPageChange) onPageChange(page);
    } catch (err) {
      console.error("Error fetching permissions:", err);
      message.error("Failed to load permissions");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData(currentPage || 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSize, search, filters, refreshKey]);

  const columns = [
    {
      title: "No.",
      dataIndex: "id",
      render: (_, __, index) => (pagination.current - 1) * pageSize + index + 1,
    },
    {
      title: "Name",
      dataIndex: "name",
    },
    {
      title: "API",
      dataIndex: "apiPath",
    },
    {
      title: "Method",
      dataIndex: "method",
    },
    {
      title: "Module",
      dataIndex: "module",
    },
  ];
  // ✅ Thêm cột Actions nếu còn ít nhất 1 quyền
  if (hasEdit || hasDelete) {
    columns.push({
      title: "Actions",
      render: (_, record) => (
        <Space>
          {hasEdit && (
            <Tooltip title="Edit">
              <Button
                icon={<EditOutlined />}
                onClick={() => onEditPermission(record)}
              />
            </Tooltip>
          )}
          {hasDelete && (
            <Tooltip title="Delete">
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={() => onDeletePermission(record)}
              />
            </Tooltip>
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
        onChange: (page) => fetchData(page),
      }}
    />
  );
}
