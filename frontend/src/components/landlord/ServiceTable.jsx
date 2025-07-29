import React from "react";
import { Table, Button, Space, Switch, Popconfirm } from "antd";
import { EditOutlined, DeleteOutlined, HistoryOutlined, DollarOutlined } from "@ant-design/icons";

export default function ServiceTable({ services, pagination, loading, onEdit, onDelete, onTableChange, onUpdatePrice, onViewPriceHistory }) {
     const columns = [
           {
        title: "Tên dịch vụ",
        dataIndex: "name",
        key: "name",
        width: 200,
        align: "center",
      },
     {
       title: "Đơn vị",
       dataIndex: "unit",
       key: "unit",
       width: 100,
       align: "center",
     },
           {
        title: "Giá (VND/đơn vị)",
        dataIndex: "price",
        key: "price",
        width: 140,
        align: "center",
        render: (value) => value ? value.toLocaleString("vi-VN") : "0",
      },
     {
       title: "Loại",
       dataIndex: "type",
       key: "type",
       width: 100,
       align: "center",
       render: (type) => {
         const typeMap = {
           ELECTRICITY: "Điện",
           WATER: "Nước",
           OTHER: "Khác",
         };
         return typeMap[type] || type;
       },
     },
     {
       title: "Thao tác",
       key: "actions",
       width: 240,
       align: "center",
       render: (_, record) => (
         <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
           <Button
             type="primary"
             icon={<EditOutlined />}
             onClick={() => onEdit && onEdit(record.id)}
             size="small"
             title="Chỉnh sửa thông tin dịch vụ"
             style={{ fontSize: '13px', padding: '4px 10px', height: '32px' }}
           >
             Sửa
           </Button>
           <Button
             type="default"
             icon={<DollarOutlined />}
             onClick={() => onUpdatePrice && onUpdatePrice(record.id)}
             size="small"
             title="Cập nhật giá"
             style={{ fontSize: '13px', padding: '4px 10px', height: '32px' }}
           >
             Giá
           </Button>
           <Button
             type="default"
             icon={<HistoryOutlined />}
             onClick={() => onViewPriceHistory && onViewPriceHistory(record.id)}
             size="small"
             title="Xem lịch sử giá"
             style={{ fontSize: '13px', padding: '4px 10px', height: '32px' }}
           >
             Lịch sử
           </Button>
           <Popconfirm
             title="Xóa dịch vụ"
             description="Bạn có chắc muốn xóa dịch vụ này?"
             onConfirm={() => onDelete(record.id)}
             okText="Xóa"
             cancelText="Không"
           >
             <Button
               icon={<DeleteOutlined />}
               danger
               size="small"
               style={{ fontSize: '13px', padding: '4px 10px', height: '32px' }}
             />
           </Popconfirm>
         </div>
       ),
     },
   ];
=======
  const columns = [
    {
      title: "Tên dịch vụ",
      dataIndex: "name",
      key: "name",
      align: "center",
      width: 200,
    },
    {
      title: "Đơn vị",
      dataIndex: "unit",
      key: "unit",
      align: "center",
      width: 120,
    },
    {
      title: "Giá (VND/đơn vị)",
      dataIndex: "price",
      key: "price",
      align: "center",
      width: 150,
      render: (value) => value ? value.toLocaleString("vi-VN") : "0",
    },
    {
      title: "Loại",
      dataIndex: "type",
      key: "type",
      align: "center",
      width: 120,
      render: (type) => {
        const typeMap = {
          ELECTRICITY: "Điện",
          WATER: "Nước",
          OTHER: "Khác",
        };
        return typeMap[type] || type;
      },
    },
    {
      title: "Thao tác",
      key: "actions",
      align: "center",
      width: 400,
      render: (_, record) => (
        <Space size="small" style={{ flexWrap: 'nowrap', justifyContent: 'center' }}>
          <Button
            type="default"
            icon={<EditOutlined />}
            onClick={() => onEdit && onEdit(record.id)}
            size="small"
            style={{ color: "#faad14", borderColor: "#faad14" }}
            title="Chỉnh sửa thông tin dịch vụ"
          >
            Sửa
          </Button>
          <Button
            type="default"
            icon={<DollarOutlined />}
            onClick={() => onUpdatePrice && onUpdatePrice(record.id)}
            size="small"
            title="Cập nhật giá"
          >
            Giá
          </Button>
          <Button
            type="dashed"
            icon={<HistoryOutlined />}
            onClick={() => onViewPriceHistory && onViewPriceHistory(record.id)}
            size="small"
            title="Xem lịch sử giá"
          >
            Lịch sử
          </Button>
          <Popconfirm
            title="Xóa dịch vụ"
            description="Bạn có chắc muốn xóa dịch vụ này?"
            onConfirm={() => onDelete(record.id)}
            okText="Xóa"
            cancelText="Không"
          >
            <Button
              icon={<DeleteOutlined />}
              type="primary"
              danger
              size="small"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];
  return (
    <Table
      dataSource={services.map((s) => ({ ...s, key: s.id }))}
      columns={columns}
      pagination={{
        ...pagination,
        showSizeChanger: false,
        showQuickJumper: false,
        showTotal: (total, range) => `${range[0]}-${range[1]} trên tổng số ${total} mục`,
      }}
      rowKey="id"
      loading={loading}
      onChange={onTableChange}
      style={{ background: "#fff", borderRadius: 8, padding: 16 }}
      scroll={{ x: 1000 }}
      bordered
    />
  );
}
