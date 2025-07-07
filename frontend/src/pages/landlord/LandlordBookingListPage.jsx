import React, { useEffect, useState } from "react";
import { Table, Card, Tag, Input, Select, DatePicker, Button, Popover, Form, Popconfirm, message } from "antd";
import axiosClient from "../../services/axiosClient";
import LandlordSidebar from "../../components/layout/LandlordSidebar";
import PageHeader from "../../components/common/PageHeader";
import { useSelector } from "react-redux";
import { Layout } from "antd";
import { FilterOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { sendNotification } from "../../services/notificationApi";

const { Sider, Content } = Layout;

const pageSizeOptions = [5, 10, 20, 50];

const statusOptions = [
  { value: "", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Đã xác nhận" },
  { value: "COMPLETED", label: "Hoàn thành" },
  { value: "CANCELLED", label: "Đã hủy" },
];

export default function LandlordBookingListPage() {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [loading, setLoading] = useState(false);
  const user = useSelector((state) => state.account.user);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDate, setFilterDate] = useState([]);
  const [total, setTotal] = useState(0);
  const [pendingFilterStatus, setPendingFilterStatus] = useState("");
  const [pendingFilterDate, setPendingFilterDate] = useState([]);

  const fetchData = () => {
    if (user?.id) {
      setLoading(true);
      const params = {
        landlordId: user.id,
        search: search || undefined,
        status: filterStatus || undefined,
        from: filterDate.length === 2 ? filterDate[0].startOf("day").toISOString() : undefined,
        to: filterDate.length === 2 ? filterDate[1].endOf("day").toISOString() : undefined,
        page: currentPage - 1,
        pageSize: pageSize,
      };
      axiosClient
        .get(`/schedules`, { params })
        .then((res) => {
          setData(res.data?.result || []);
          setTotal(res.data?.meta?.total || 0);
        })
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, [user, search, filterStatus, filterDate, currentPage, pageSize]);

  const handleConfirm = async (record) => {
    try {
      await axiosClient.patch(`/schedules/${record.id}/status?status=CONFIRMED`);
      // Send notification to guest
      if (record.email) {
        await sendNotification({
          recipientEmail: record.email,
          title: "Booking Confirmed",
          message: `Your booking for room ${record.roomId} has been confirmed by the landlord!`,
          type: "SCHEDULE"
        });
      }
      message.success("Booking accepted!");
      fetchData();
    } catch (e) {
      message.error("Failed to accept booking!");
    }
  };

  const handleReject = async (record) => {
    try {
      await axiosClient.patch(`/schedules/${record.id}/status?status=CANCELLED`);
      // Send notification to guest
      if (record.email) {
        await sendNotification({
          recipientEmail: record.email,
          title: "Booking Rejected",
          message: `Your booking for room ${record.roomId} has been rejected by the landlord.`,
          type: "SCHEDULE"
        });
      }
      message.success("Booking rejected!");
      fetchData();
    } catch (e) {
      message.error("Failed to reject booking!");
    }
  };

  const handleDelete = async (id) => {
    try {
      await axiosClient.delete(`/schedules/${id}`);
      message.success("Đã xóa đặt phòng!");
      fetchData();
    } catch (e) {
      message.error("Failed to delete booking!");
    }
  };

  const columns = [
    { title: "Tên Người Dùng", dataIndex: "fullName" },
    { title: "Số điện thoại", dataIndex: "phone" },
    { title: "Email", dataIndex: "email" },
    { title: "Thời gian hẹn", dataIndex: "appointmentTime" },
    { title: "Phòng", dataIndex: "roomId" },
    { title: "Ghi chú", dataIndex: "note" },
    {
      title: "Trạng thái",
      dataIndex: "status",
      render: (s) => (
        <Tag
          color={
            s === "PENDING" ? "orange" : s === "CONFIRMED" ? "green" : s === "COMPLETED" ? "red" : "red"
          }
        >
          {s === "CONFIRMED"
            ? "Đã xác nhận"
            : s === "COMPLETED"
            ? "Hoàn thành"
            : s === "CANCELLED"
            ? "Đã hủy"
            : s === "PENDING"
            ? "Chờ xử lý"
            : s}
        </Tag>
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      render: (_, record) => (
        <>
          {record.status === "PENDING" && (
            <>
              <Popconfirm
                title="Bạn có chắc chắn muốn chấp nhận đặt phòng này?"
                onConfirm={() => handleConfirm(record)}
                okText="Có"
                cancelText="Không"
              >
                <Button
                  type="primary"
                  size="small"
                  style={{ marginRight: 8 }}
                >
                  Accept
                </Button>
              </Popconfirm>
              <Popconfirm
                title="Bạn có chắc chắn muốn từ chối đặt phòng này?"
                onConfirm={() => handleReject(record)}
                okText="Reject"
                cancelText="Không"
              >
                <Button danger size="small" style={{ marginRight: 8 }}>Reject</Button>
              </Popconfirm>
            </>
          )}
          <Popconfirm
            title="Bạn có chắc chắn muốn xóa đặt phòng này?"
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa"
            cancelText="Không"
          >
            <Button danger size="small">Xóa</Button>
          </Popconfirm>
        </>
      ),
    },
  ];

  return (
    <div style={{ display: "flex" }}>
      <Sider width={220} style={{ background: "#001529" }}>
        <LandlordSidebar />
      </Sider>
      <div style={{ flex: 1, padding: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <PageHeader title="Danh sách đặt lịch xem phòng" style={{ margin: 0 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <Input.Search
              placeholder="Tìm đặt phòng..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              style={{ width: 220 }}
              allowClear
            />
            <Popover
              content={
                <Form layout="vertical">
                  <Form.Item label="Trạng thái">
                    <Select
                      value={pendingFilterStatus}
                      onChange={setPendingFilterStatus}
                      options={statusOptions}
                      style={{ width: 160 }}
                    />
                  </Form.Item>
                  <Form.Item label="Date Range">
                    <DatePicker.RangePicker
                      value={pendingFilterDate}
                      onChange={setPendingFilterDate}
                      style={{ width: 220 }}
                    />
                  </Form.Item>
                  <Button
                    type="primary"
                    block
                    onClick={() => {
                      setFilterStatus(pendingFilterStatus);
                      setFilterDate(pendingFilterDate);
                      setCurrentPage(1);
                      setFilterOpen(false);
                    }}
                  >
                    Apply
                  </Button>
                </Form>
              }
              title={null}
              trigger="click"
              open={filterOpen}
              onOpenChange={(open) => {
                setFilterOpen(open);
                if (open) {
                  setPendingFilterStatus(filterStatus);
                  setPendingFilterDate(filterDate);
                }
              }}
              placement="bottomRight"
            >
              <Button icon={<FilterOutlined />}>Bộ lọc</Button>
            </Popover>
          </div>
        </div>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              Hiển thị
              <Select
                value={pageSize}
                onChange={(value) => {
                  setPageSize(value);
                  setCurrentPage(1);
                }}
                style={{ width: 70, margin: "0 8px" }}
                options={pageSizeOptions.map((v) => ({ value: v, label: v }))}
              />
              / trang
            </div>
            <span style={{ marginRight: 0, fontWeight: 500 }}>
              Tổng: {total} đặt phòng
            </span>
          </div>
          <Table
            columns={columns}
            dataSource={data}
            rowKey="id"
            loading={loading}
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              total: total,
              showSizeChanger: false,
              onChange: (page) => setCurrentPage(page),
            }}
          />
        </Card>
      </div>
    </div>
  );
}
