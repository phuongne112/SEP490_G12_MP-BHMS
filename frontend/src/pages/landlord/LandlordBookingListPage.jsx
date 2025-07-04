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
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
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

  const handleDelete = async (id) => {
    try {
      await axiosClient.delete(`/schedules/${id}`);
      message.success("Booking deleted!");
      fetchData();
    } catch (e) {
      message.error("Failed to delete booking!");
    }
  };

  const columns = [
    { title: "Guest Name", dataIndex: "fullName" },
    { title: "Phone", dataIndex: "phone" },
    { title: "Email", dataIndex: "email" },
    { title: "Appointment Time", dataIndex: "appointmentTime" },
    { title: "Room", dataIndex: "roomId" },
    { title: "Note", dataIndex: "note" },
    {
      title: "Status",
      dataIndex: "status",
      render: (s) => (
        <Tag
          color={
            s === "PENDING" ? "orange" : s === "CONFIRMED" ? "green" : s === "COMPLETED" ? "red" : "red"
          }
        >
          {s}
        </Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <>
          {record.status === "PENDING" && (
            <Popconfirm
              title="Are you sure you want to accept this booking?"
              onConfirm={() => handleConfirm(record)}
              okText="Accept"
              cancelText="Cancel"
            >
              <Button
                type="primary"
                size="small"
                style={{ marginRight: 8 }}
              >
                Accept
              </Button>
            </Popconfirm>
          )}
          <Popconfirm
            title="Are you sure you want to delete this booking?"
            onConfirm={() => handleDelete(record.id)}
            okText="Delete"
            cancelText="Cancel"
          >
            <Button danger size="small">Delete</Button>
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
          <PageHeader title="Booking List" style={{ margin: 0 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <Input.Search
              placeholder="Search guest name"
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
                  <Form.Item label="Status">
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
              <Button icon={<FilterOutlined />}>
                Filter
              </Button>
            </Popover>
          </div>
        </div>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              Show
              <Select
                value={pageSize}
                onChange={(value) => {
                  setPageSize(value);
                  setCurrentPage(1);
                }}
                style={{ width: 70, margin: "0 8px" }}
                options={pageSizeOptions.map((v) => ({ value: v, label: v }))}
              />
              entries
            </div>
            <span style={{ marginRight: 0, fontWeight: 500 }}>
              Total: {total} bookings
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
