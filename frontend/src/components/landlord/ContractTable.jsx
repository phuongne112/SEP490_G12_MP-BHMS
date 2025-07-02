import React, { useState } from "react";
import { Table, Button, Popconfirm, Statistic, Space, Spin } from "antd";
import { FilePdfOutlined, EditOutlined, HistoryOutlined, ReloadOutlined, StopOutlined } from "@ant-design/icons";
import { getContractHistoryByRoom } from "../../services/contractApi";

const { Countdown } = Statistic;

function ContractHistoryTable({ roomId, onExport }) {
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
    { title: "Contract No.", dataIndex: "contractNumber", key: "contractNumber", render: (num, record) => num || `#${record.id}` },
    { title: "Status", dataIndex: "contractStatus", key: "contractStatus" },
    { title: "Start Date", dataIndex: "contractStartDate", key: "contractStartDate", render: (d) => d ? new Date(d).toLocaleDateString("en-GB") : "—" },
    { title: "End Date", dataIndex: "contractEndDate", key: "contractEndDate", render: (d) => d ? new Date(d).toLocaleDateString("en-GB") : "—" },
    { title: "Created At", dataIndex: "createdDate", key: "createdDate", render: (d) => d ? new Date(d).toLocaleDateString("en-GB") : "—" },
    {
      title: "PDF",
      key: "pdf",
      render: (_, record) => (
        <Button
          type="primary"
          icon={<FilePdfOutlined />}
          size="small"
          onClick={() => onExport && onExport(record.id)}
        >
          PDF
        </Button>
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
            <span>Page: </span>
            <Button size="small" disabled={page === 1} onClick={() => setPage(page - 1)} style={{ marginRight: 8 }}>Prev</Button>
            <span>{page}</span>
            <Button size="small" disabled={page * pageSize >= history.length} onClick={() => setPage(page + 1)} style={{ marginLeft: 8 }}>Next</Button>
          </div>
        ) : null}
      />
    </div>
  );
}

export default function ContractTable({ rooms = [], onExport, onDelete, onUpdate, onRenew, onViewAmendments, onTerminate, loading, onFilter, pageSize = 5, currentPage = 1, total = 0, onPageChange }) {
  const columns = [
    {
      title: "Contract ID",
      dataIndex: "id",
    },
    {
      title: "Room Number",
      render: (_, record) => record?.room?.roomNumber || record?.roomNumber || "Unknown",
    },
    {
      title: "Start Date",
      dataIndex: "contractStartDate",
      render: (text) =>
        text ? new Date(text).toLocaleDateString("en-GB") : "—",
    },
    {
      title: "End Date",
      dataIndex: "contractEndDate",
      render: (text) =>
        text ? new Date(text).toLocaleDateString("en-GB") : "—",
    },
    {
      title: "Status",
      dataIndex: "contractStatus",
      render: status => (
        <span style={{
          color: status === "TERMINATED" ? "red" : status === "ACTIVE" ? "green" : "#888",
          fontWeight: 600
        }}>
          {status}
        </span>
      )
    },
    {
      title: "Time Left",
      align: "center",
      render: (_, record) => {
        if (record.contractStatus === "TERMINATED" || record.contractStatus === "EXPIRED") {
          return <span style={{ color: "#888", fontWeight: 600 }}>—</span>;
        }
        if (!record.contractStartDate || !record.contractEndDate) return "—";
        const start = new Date(record.contractStartDate).getTime();
        // Xử lý endDate: nếu chỉ có ngày (giờ = 0), cộng thêm 1 ngày và trừ 1 giây để lấy 23:59:59
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
          // Chưa hiệu lực
          return (
            <span style={{ color: "#1890ff", fontWeight: 600 }}>
              <span style={{ marginRight: 6, fontSize: 18 }}>⏰</span>
              Chưa hiệu lực
            </span>
          );
        }
        if (now >= end) {
          // Đã hết hạn
          return (
            <span style={{ color: "#ff4d4f", fontWeight: 600 }}>
              <span style={{ marginRight: 6, fontSize: 18 }}>⏰</span>
              Đã hết hạn
            </span>
          );
        }

        // Đang hiệu lực, đếm ngược đến end
        const msLeft = end - now;
        let color = "#52c41a";
        if (msLeft < 24 * 60 * 60 * 1000) color = "#ff4d4f";
        else if (msLeft < 3 * 24 * 60 * 60 * 1000) color = "#faad14";

        return (
          <span style={{
            fontWeight: 600,
            fontSize: 18,
            color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <span style={{ marginRight: 6, fontSize: 18 }}>⏰</span>
            <Countdown value={end} format="D [days] HH:mm:ss" style={{ color }} />
          </span>
        );
      }
    },
    {
      title: "Contract Number",
      dataIndex: "contractNumber",
      render: (num, record) => num || `#${record.id}`,
    },
    {
      title: "Tenant(s)",
      dataIndex: "roomUsers",
      key: "tenants",
      render: (users) => users?.map(u => u.fullName).join(", ") || "—"
    },
    {
      title: "Phone(s)",
      dataIndex: "roomUsers",
      key: "phones",
      render: (users) => users?.map(u => u.phoneNumber).join(", ") || "—"
    },
    {
      title: "Deposit",
      dataIndex: "depositAmount",
      key: "deposit",
      render: (amount) => amount ? amount.toLocaleString() + " VND" : "—"
    },
    {
      title: "Rent",
      dataIndex: "rentAmount",
      key: "rent",
      render: (amount) => amount ? amount.toLocaleString() + " VND" : "—"
    },
    {
      title: "Payment Cycle",
      dataIndex: "paymentCycle",
      key: "paymentCycle",
      render: (cycle) => cycle || "—"
    },
    {
      title: "Created At",
      dataIndex: "createdDate",
      render: (d) => d ? new Date(d).toLocaleDateString("en-GB") : "—"
    },
    {
      title: "Updated At",
      dataIndex: "updatedDate",
      render: (d) => d ? new Date(d).toLocaleDateString("en-GB") : "—"
    },
    {
      title: "Actions",
      align: "center",
      render: (_, record) => {
        const isTerminatedOrExpired = record.contractStatus === "TERMINATED" || record.contractStatus === "EXPIRED";
        return (
          <Space size="middle">
            <Button
              type="primary"
              icon={<FilePdfOutlined />}
              onClick={() => onExport(record.id)}
              size="small"
            >
              PDF
            </Button>
            <Button
              type="default"
              icon={<EditOutlined />}
              onClick={() => onUpdate && onUpdate(record)}
              size="small"
              style={{ color: "#faad14", borderColor: "#faad14" }}
              disabled={isTerminatedOrExpired}
            >
              Cập nhật
            </Button>
            <Button
              type="default"
              icon={<ReloadOutlined />}
              onClick={() => onRenew && onRenew(record)}
              size="small"
              style={{ color: "#52c41a", borderColor: "#52c41a" }}
              disabled={isTerminatedOrExpired}
            >
              Gia hạn
            </Button>
            <Button
              type="dashed"
              icon={<HistoryOutlined />}
              onClick={() => onViewAmendments && onViewAmendments(record.id)}
              size="small"
              disabled={isTerminatedOrExpired}
            >
              Lịch sử
            </Button>
            <Popconfirm title="Kết thúc hợp đồng này?" onConfirm={() => onTerminate(record.id)} okText="Kết thúc" cancelText="Hủy">
              <Button
                type="primary"
                danger
                icon={<StopOutlined />}
                size="small"
                disabled={isTerminatedOrExpired}
              >
                Kết thúc
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  // Mỗi phòng 1 dòng, lấy hợp đồng mới nhất từ latestContract
  let dataSource = rooms.map(room => {
    const c = room.latestContract || {};
    return {
      ...c,
      roomId: room.id,
      roomNumber: room.roomNumber,
    };
  });
  // Sắp xếp theo updatedDate mới nhất, nếu không có thì theo createdDate
  dataSource = dataSource.sort((a, b) => {
    const dateA = a.updatedDate || a.createdDate || 0;
    const dateB = b.updatedDate || b.createdDate || 0;
    return new Date(dateB) - new Date(dateA);
  });

  return (
    <Table
      columns={columns}
      dataSource={dataSource}
      rowKey="roomId"
      expandable={{
        expandedRowRender: (record) => <ContractHistoryTable roomId={record.roomId} onExport={onExport} />,
        rowExpandable: () => true,
      }}
      pagination={{
        pageSize: pageSize,
        current: currentPage,
        total: total,
        showSizeChanger: false,
        onChange: onPageChange
      }}
      style={{ background: "#fff", borderRadius: 8, padding: 16 }}
      loading={loading}
      scroll={{ x: 1400 }}
    />
  );
}
