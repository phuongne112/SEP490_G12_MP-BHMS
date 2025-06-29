import React, { useEffect, useState } from "react";
import { Table, Card, Tag, Input, Select, Pagination, Space } from "antd";
import { getLandlordBookingList } from "../../services/bookingApi";
import LandlordSidebar from "../../components/layout/LandlordSidebar";
import PageHeader from "../../components/common/PageHeader";
import { useSelector } from "react-redux";
import { Layout } from "antd";

const { Sider, Content } = Layout;

export default function LandlordBookingListPage() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [searchEmail, setSearchEmail] = useState("");
  const [searchName, setSearchName] = useState("");
  const [loading, setLoading] = useState(false);
  const user = useSelector((state) => state.account.user);
  const pageSizeOptions = [5, 10, 20, 50];

  const fetchData = async (page = 1, size = pageSize, email = searchEmail, fullName = searchName) => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await getLandlordBookingList(user.id, { page: page - 1, size, email, fullName });
      const arr = Array.isArray(res) ? res : (res.result || res.data || []);
      console.log("API response:", res);
      console.log("Booking data:", arr);
      setData(arr);
      setTotal(arr.length);
      console.log("Set data:", arr, "Set total:", arr.length);
    } catch (err) {
      setData([]);
      setTotal(0);
      console.error("Fetch booking error:", err);
    }
    setLoading(false);
    console.log("Current page:", page, "Page size:", size);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [user, pageSize, searchEmail, searchName]);

  useEffect(() => {
    fetchData(currentPage, pageSize, searchEmail, searchName);
    // eslint-disable-next-line
  }, [currentPage, pageSize, searchEmail, searchName, user]);

  const columns = [
    { title: "Khách đặt", dataIndex: "fullName" },
    { title: "SĐT", dataIndex: "phone" },
    { title: "Email", dataIndex: "email" },
    { title: "Thời gian", dataIndex: "appointmentTime" },
    { title: "Phòng", dataIndex: "roomId" },
    { title: "Ghi chú", dataIndex: "note" },
    {
      title: "Trạng thái",
      dataIndex: "status",
      render: (s) => (
        <Tag
          color={
            s === "PENDING" ? "orange" : s === "CONFIRMED" ? "green" : "red"
          }
        >
          {s}
        </Tag>
      ),
    },
  ];

  return (
    <div style={{ display: "flex" }}>
      <Sider width={220} style={{ background: "#001529" }}>
        <LandlordSidebar />
      </Sider>
      <div style={{ flex: 1, padding: 32 }}>
        <PageHeader title="Booking List" />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            Show
            <Select
              style={{ width: 80, margin: "0 8px" }}
              value={pageSize}
              onChange={(value) => setPageSize(value)}
              options={pageSizeOptions.map((v) => ({ value: v, label: v }))}
            />
            entries
          </div>
          <Space>
            <Input.Search
              placeholder="Search by email"
              allowClear
              value={searchEmail}
              onChange={e => setSearchEmail(e.target.value)}
              style={{ width: 200 }}
            />
            <Input.Search
              placeholder="Search by name"
              allowClear
              value={searchName}
              onChange={e => setSearchName(e.target.value)}
              style={{ width: 200 }}
            />
          </Space>
        </div>
        <Card>
          <Table columns={columns} dataSource={data} rowKey="id" loading={loading} pagination={false} />
        </Card>
        <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
          <Pagination
            current={currentPage}
            pageSize={pageSize}
            total={total}
            onChange={(page) => setCurrentPage(page)}
            showSizeChanger={false}
            showQuickJumper
            showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} bookings`}
          />
        </div>
      </div>
    </div>
  );
}
