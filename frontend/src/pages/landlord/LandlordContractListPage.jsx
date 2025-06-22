import React, { useEffect, useState } from "react";
import { Layout, message } from "antd";
import PageHeader from "../../components/common/PageHeader";
import contractApi from "../../services/contractApi";
import LandlordSidebar from "../../components/layout/LandlordSidebar";
import ContractTable from "../../components/landlord/ContractTable";

const { Sider, Content } = Layout;

export default function LandlordContractListPage() {
  const [contracts] = useState([
    {
      id: 1,
      roomUser: {
        user: {
          userInfo: {
            fullName: "Nguyen Van A",
          },
        },
      },
      room: {
        roomNumber: "101",
      },
      contractStartDate: "2024-01-01T00:00:00Z",
      contractEndDate: "2024-12-31T00:00:00Z",
    },
    {
      id: 2,
      roomUser: {
        user: {
          userInfo: {
            fullName: "Tran Thi B",
          },
        },
      },
      room: {
        roomNumber: "203",
      },
      contractStartDate: "2024-06-01T00:00:00Z",
      contractEndDate: "2025-05-31T00:00:00Z",
    },
  ]);

  const handleExport = (id) => {
    message.info(`Export contract ID ${id} (mock)`);
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider width={240}>
        <LandlordSidebar />
      </Sider>
      <Layout>
        <Content style={{ padding: "24px" }}>
          <PageHeader title="Contract List" />
          <ContractTable contracts={contracts} onExport={handleExport} />
        </Content>
      </Layout>
    </Layout>
  );
}
