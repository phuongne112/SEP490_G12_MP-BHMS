import React, { useEffect, useState } from "react";
import { Table, Button, Space, Tooltip } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { getAllPermissions } from "../../services/permissionApi";
import dayjs from "dayjs";

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
  const [pagination, setPagination] = useState({ current: 1, total: 0 });

  const fetchData = async (page = 1, size = pageSize) => {
    setLoading(true);
    try {
      const params = {
        page: page - 1,
        size: size, // <-- Đúng size tại thời điểm gọi
        name: search.name || undefined,
        api: search.api || undefined,
        module: filters.module !== "All" ? filters.module : undefined,
        method: filters.method !== "All" ? filters.method : undefined,
      };

      const res = await getAllPermissions(params);

      const result = res?.data?.result || [];
      const total = res?.data?.meta?.total || 0;
      console.log("result[0] =", result[0]);

      setData(result);
      setPagination({ current: page, total, pageSize: size });
    } catch (err) {
      console.error("Error fetching permissions:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData(currentPage, pageSize);
  }, [pageSize, search, filters, refreshKey]);

  const columns = [
    { title: "Id", dataIndex: "id", key: "id" },
    { title: "Name", dataIndex: "name", key: "name" },
    { title: "API", dataIndex: "apiPath", key: "apiPath" },
    { title: "Method", dataIndex: "method", key: "method" },
    { title: "Module", dataIndex: "module", key: "module" },
    {
      title: "UpdatedAt",
      dataIndex: "updatedDate",
      key: "updatedDate",
      render: (value) =>
        value ? dayjs(value).format("DD-MM-YYYY HH:mm:ss") : "—",
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit">
            <Button
              icon={<EditOutlined />}
              onClick={() => onEditPermission(record)}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={() => onDeletePermission(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={data}
      rowKey="id"
      loading={loading}
      pagination={{
        current: pagination.current,
        total: pagination.total,
        pageSize: pagination.pageSize || pageSize,
        onChange: (page, size) => {
          onPageChange?.(page); // ✅ báo cho component cha biết page mới
          fetchData(page, size); // ✅ gọi đúng page
        },
      }}
    />
  );
}
