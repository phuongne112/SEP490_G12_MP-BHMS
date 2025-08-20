import React, { useState } from "react";
import { Table, Button, Popconfirm, Statistic, Space, Spin, Tag } from "antd";
import { FilePdfOutlined, EditOutlined, HistoryOutlined, ReloadOutlined, StopOutlined, EyeOutlined } from "@ant-design/icons";
import { getContractHistoryByRoom } from "../../services/contractApi";
import { useMediaQuery } from "react-responsive";

const paymentCycleVN = {
  MONTHLY: "Hàng tháng",
  QUARTERLY: "Quý",
  YEARLY: "Năm"
};

const { Countdown } = Statistic;

function ContractHistoryTable({ roomId, onExport, onViewDetail }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 5;
  React.useEffect(() => {
    setLoading(true);
    getContractHistoryByRoom(roomId)
      .then(setHistory)
      .finally(() => setLoading(false));
  }, [roomId]);
  const columns = [
    { title: "Số hợp đồng", dataIndex: "contractNumber", key: "contractNumber", render: (num, record) => num || `#${record.id}` },
    { title: "Trạng thái", dataIndex: "contractStatus", key: "contractStatus",
      render: (status) => status === "TERMINATED" ? "Đã chấm dứt" : status === "ACTIVE" ? "Đang hiệu lực" : status === "EXPIRED" ? "Hết hạn" : status },
    { title: "Ngày bắt đầu", dataIndex: "contractStartDate", key: "contractStartDate", render: (d) => d ? new Date(d).toLocaleDateString("vi-VN") : "—" },
    { title: "Ngày kết thúc", dataIndex: "contractEndDate", key: "contractEndDate", render: (d) => d ? new Date(d).toLocaleDateString("vi-VN") : "—" },
    { title: "Ngày cập nhật", dataIndex: "createdDate", key: "createdDate", render: (d) => d ? `${new Date(d).toLocaleDateString("vi-VN")} ${new Date(d).toLocaleTimeString("vi-VN", { hour12: false })}` : "—" },
    {
      title: "Thao tác",
      key: "actions",
      render: (_, record) => (
        <Space size="small">
          <Button
            type="primary"
            icon={<EyeOutlined />}
            size="small"
            onClick={() => onViewDetail && onViewDetail(record)}
            title="Xem chi tiết"
          >
            Chi tiết
          </Button>
          <Button
            type="primary"
            icon={<FilePdfOutlined />}
            size="small"
            onClick={() => onExport && onExport(record.id)}
          >
            Xuất PDF
          </Button>
        </Space>
      )
    }
  ];
  if (loading) return <Spin />;
  const pagedData = history.slice((page - 1) * pageSize, page * pageSize);
  return (
    <div style={{ background: '#fafbfc', border: '1px solid #eee', borderRadius: 8, margin: '16px 0', padding: 16, overflowX: 'auto' }}>
      <Table
        columns={columns}
        dataSource={pagedData}
        rowKey="id"
        pagination={false}
        size="small"
        style={{ background: '#fafbfc', minWidth: 800 }}
        footer={() => history.length > pageSize ? (
          <div style={{ textAlign: 'right' }}>
            <span>Trang: </span>
            <Button size="small" disabled={page === 1} onClick={() => setPage(page - 1)} style={{ marginRight: 8 }}>Trước</Button>
            <span>{page}</span>
            <Button size="small" disabled={page * pageSize >= history.length} onClick={() => setPage(page + 1)} style={{ marginLeft: 8 }}>Sau</Button>
          </div>
        ) : null}
      />
    </div>
  );
}

export default function ContractTable({ rooms = [], onExport, onDelete, onUpdate, onRenew, onViewAmendments, onTerminate, onViewDetail, loading, onFilter, pageSize = 5, currentPage = 1, total = 0, onPageChange }) {
  const isMobile = useMediaQuery({ maxWidth: 768 });
  
  const columns = [
    {
      title: "Phòng",
      render: (_, record) => record?.room?.roomNumber || record?.roomNumber || "Không rõ",
      align: "center",
      width: isMobile ? 50 : 100
    },
    {
      title: "Bắt đầu",
      dataIndex: "contractStartDate",
      render: (text) =>
        text ? new Date(text).toLocaleDateString("vi-VN") : "—",
      align: "center",
      width: isMobile ? 60 : 100
    },
    {
      title: "Kết thúc",
      dataIndex: "contractEndDate",
      render: (text) =>
        text ? new Date(text).toLocaleDateString("vi-VN") : "—",
      align: "center",
      width: isMobile ? 60 : 100
    },
    {
      title: "Trạng thái",
      dataIndex: "contractStatus",
      render: status => (
        <Tag color={status === "TERMINATED" ? "red" : status === "ACTIVE" ? "green" : status === "EXPIRED" ? "#888" : "#888"}>
          {status === "TERMINATED" ? "Đã chấm dứt" : status === "ACTIVE" ? "Đang hiệu lực" : status === "EXPIRED" ? "Hết hạn" : status}
        </Tag>
      ),
      align: "center",
      width: isMobile ? 70 : 110
    },
    {
      title: "Còn lại",
      align: "center",
      width: isMobile ? 60 : 100,
      render: (_, record) => {
        if (record.contractStatus === "TERMINATED" || record.contractStatus === "EXPIRED") {
          return <span style={{ color: "#888", fontWeight: 600 }}>—</span>;
        }
        if (!record.contractStartDate || !record.contractEndDate) return "—";
        const start = new Date(record.contractStartDate).getTime();
        let endDateObj = new Date(record.contractEndDate);
        if (
          endDateObj.getHours() === 0 &&
          endDateObj.getMinutes() === 0 &&
          endDateObj.getSeconds() === 0
        ) {
          endDateObj.setDate(endDateObj.getDate() + 1);
          endDateObj.setSeconds(endDateObj.getSeconds() - 1);
        }
        const end = endDateObj.getTime();
        const now = Date.now();

        if (now < start) {
          return (
            <span style={{ color: "#1890ff", fontWeight: 600, whiteSpace: "nowrap" }}>
              Chưa bắt đầu
            </span>
          );
        }
        if (now >= end) {
          return (
            <span style={{ color: "#ff4d4f", fontWeight: 600, whiteSpace: "nowrap" }}>
              Đã hết hạn
            </span>
          );
        }

        const msLeft = end - now;
        let color = "#52c41a";
        if (msLeft < 24 * 60 * 60 * 1000) color = "#ff4d4f";
        else if (msLeft < 3 * 24 * 60 * 60 * 1000) color = "#faad14";

        return (
          <span style={{
            fontWeight: 600,
            fontSize: 13,
            color,
            minWidth: 60,
            display: "inline-block",
            textAlign: "center",
            whiteSpace: "nowrap"
          }}>
            <Countdown value={end} format="D [ngày]" style={{ color, fontWeight: 600 }} />
          </span>
        );
      }
    },
    {
      title: "Số HĐ",
      dataIndex: "contractNumber",
      render: (num, record) => num || `#${record.id}`,
      align: "center",
      width: isMobile ? 50 : 90
    },
    {
      title: "Người thuê",
      dataIndex: "roomUsers",
      key: "tenants",
      render: (users) => users?.map(u => u.fullName).join(", ") || "—",
      align: "center",
      width: isMobile ? 70 : 150,
            ellipsis: false
    },
    {
      title: "SĐT",
      dataIndex: "roomUsers",
      key: "phones",
      render: (users) => users?.map(u => u.phoneNumber).join(", ") || "—",
      align: "center",
      width: isMobile ? 60 : 110,
      ellipsis: false
    },
    {
      title: "Cọc",
      dataIndex: "depositAmount",
      key: "deposit",
      render: (amount) => amount ? amount.toLocaleString() + " VND" : "—",
      align: "center",
      width: isMobile ? 50 : 90,
      ellipsis: false
    },
    {
      title: "Tiền thuê",
      dataIndex: "rentAmount",
      key: "rent",
      render: (amount) => amount ? amount.toLocaleString() + " VND" : "—",
      align: "center",
      width: isMobile ? 60 : 90,
      ellipsis: false
    },
    {
      title: "Chu kỳ",
      dataIndex: "paymentCycle",
      key: "paymentCycle",
      render: (cycle) => paymentCycleVN[cycle] || cycle || "—",
      align: "center",
      width: isMobile ? 40 : 80,
      ellipsis: false
    },


    {
      title: "Thao tác",
      align: "center",
      width: isMobile ? 200 : 400,
      render: (_, record) => {
        const isTerminatedOrExpired = record.contractStatus === "TERMINATED" || record.contractStatus === "EXPIRED";
        return (
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '4px',
            flexWrap: 'wrap',
            width: '100%',
            padding: '2px 0'
          }}>
            <Button
              type="primary"
              icon={<EyeOutlined />}
              onClick={() => onViewDetail && onViewDetail(record)}
              size="small"
              title="Xem chi tiết"
              style={{ minWidth: 60 }}
            >
              Chi tiết
            </Button>
            <Button
              type="primary"
              icon={<FilePdfOutlined />}
              onClick={() => onExport(record.id)}
              size="small"
              style={{ minWidth: 60 }}
            >
              PDF
            </Button>
            <Button
              type="default"
              icon={<EditOutlined />}
              onClick={() => onUpdate && onUpdate(record)}
              size="small"
              style={{ color: "#faad14", borderColor: "#faad14", minWidth: 50 }}
              disabled={isTerminatedOrExpired}
            >
              Sửa
            </Button>
            <Button
              type="dashed"
              icon={<HistoryOutlined />}
              onClick={() => onViewAmendments && onViewAmendments(record.id)}
              size="small"
              disabled={isTerminatedOrExpired}
              style={{ minWidth: 60 }}
            >
              Lịch sử
            </Button>
            <Popconfirm title="Chấm dứt hợp đồng này?" onConfirm={() => onTerminate(record.id)} okText="Chấm dứt" cancelText="Hủy">
              <Button
                type="primary"
                danger
                icon={<StopOutlined />}
                size="small"
                disabled={isTerminatedOrExpired}
                style={{ minWidth: 70 }}
              >
                Chấm dứt
              </Button>
            </Popconfirm>
          </div>
        );
      },
    },
  ];

  let dataSource = rooms.map(room => {
    const c = room.latestContract || {};
    return {
      ...c,
      roomId: room.id,
      roomNumber: room.roomNumber,
    };
  });
  dataSource = dataSource.sort((a, b) => {
    const dateA = a.updatedDate || a.createdDate || 0;
    const dateB = b.updatedDate || b.createdDate || 0;
    return new Date(dateB) - new Date(dateA);
  });

  return (
    <div style={{ 
      background: "#fff", 
      borderRadius: 8, 
      padding: 16
    }}>
      <style>
        {`
          .ant-table-wrapper {
            overflow: hidden !important;
          }
          .ant-table-wrapper .ant-table-body {
            overflow-x: auto !important;
            max-height: 500px;
          }
          .ant-table-wrapper .ant-table-body::-webkit-scrollbar {
            height: 12px !important;
            background-color: #f5f5f5;
          }
          .ant-table-wrapper .ant-table-body::-webkit-scrollbar-track {
            background: #f1f1f1 !important;
            border-radius: 6px !important;
            border: 1px solid #ddd;
          }
          .ant-table-wrapper .ant-table-body::-webkit-scrollbar-thumb {
            background: #888 !important;
            border-radius: 6px !important;
            border: 1px solid #666;
          }
          .ant-table-wrapper .ant-table-body::-webkit-scrollbar-thumb:hover {
            background: #555 !important;
          }
          .ant-table-wrapper .ant-table-pagination {
            margin: 16px 0 0 0 !important;
          }
        `}
      </style>
      <Table
        columns={columns}
        dataSource={dataSource}
        rowKey="roomId"
        expandable={{
                        expandedRowRender: (record) => <ContractHistoryTable roomId={record.roomId} onExport={onExport} onViewDetail={onViewDetail} />,
          rowExpandable: () => true,
        }}
        pagination={{
          pageSize: pageSize,
          current: currentPage,
          total: total,
          showSizeChanger: false,
          onChange: onPageChange
        }}
        loading={loading}
        scroll={{ x: isMobile ? 1200 : 1800 }}
        bordered
      />
    </div>
  );
}
