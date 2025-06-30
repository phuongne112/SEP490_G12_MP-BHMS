import React, { useEffect, useState } from "react";
import { Table, Card, Tag } from "antd";
import axiosClient from "../../services/axiosClient";
import LandlordSidebar from "../../components/layout/LandlordSidebar";
import PageHeader from "../../components/common/PageHeader";
import { useSelector } from "react-redux";
import { Layout } from "antd";

const { Sider, Content } = Layout;

export default function LandlordBookingListPage() {
  const [data, setData] = useState([]);
  const user = useSelector((state) => state.account.user);

  useEffect(() => {
    if (user?.id) {
      axiosClient
        .get(`/schedules/landlord?landlordId=${user.id}`)
        .then((res) => setData(res.data));
    }
  }, [user]);

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
        <Card>
          <Table columns={columns} dataSource={data} rowKey="id" />
        </Card>
      </div>
    </div>
  );
}
