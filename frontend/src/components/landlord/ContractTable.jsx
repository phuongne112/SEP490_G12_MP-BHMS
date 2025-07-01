import React from "react";
import { Table, Button, Popconfirm, Statistic, Space } from "antd";
import { FilePdfOutlined, EditOutlined, HistoryOutlined, ReloadOutlined, StopOutlined } from "@ant-design/icons";

const { Countdown } = Statistic;

export default function ContractTable({ contracts = [], onExport, onDelete, onUpdate, onRenew, onViewAmendments, onTerminate, loading, onFilter }) {
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
      title: "Actions",
      align: "center",
      render: (_, record) => {
        const isTerminated = record.contractStatus === "TERMINATED" || record.contractStatus === "EXPIRED";
        return (
          <Space size="middle">
            <Button
              type="primary"
              icon={<FilePdfOutlined />}
              onClick={() => onExport(record.id)}
              size="small"
              disabled={isTerminated}
            >
              PDF
            </Button>
            <Button
              type="default"
              icon={<EditOutlined />}
              onClick={() => onUpdate && onUpdate(record)}
              size="small"
              style={{ color: "#faad14", borderColor: "#faad14" }}
              disabled={isTerminated}
            >
              Cập nhật
            </Button>
            <Button
              type="default"
              icon={<ReloadOutlined />}
              onClick={() => onRenew && onRenew(record)}
              size="small"
              style={{ color: "#52c41a", borderColor: "#52c41a" }}
              disabled={isTerminated}
            >
              Gia hạn
            </Button>
            <Button
              type="dashed"
              icon={<HistoryOutlined />}
              onClick={() => onViewAmendments && onViewAmendments(record.id)}
              size="small"
              disabled={isTerminated}
            >
              Lịch sử
            </Button>
            <Popconfirm title="Kết thúc hợp đồng này?" onConfirm={() => onTerminate(record.id)} okText="Kết thúc" cancelText="Hủy">
              <Button
                type="primary"
                danger
                icon={<StopOutlined />}
                size="small"
                disabled={isTerminated}
              >
                Kết thúc
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={contracts}
      rowKey="id"
      pagination={{ pageSize: 5 }}
      style={{ background: "#fff", borderRadius: 8, padding: 16 }}
      loading={loading}
    />
  );
}
