import React, { useEffect, useState } from "react";
import { Layout, message, Button, Popover } from "antd";
import PageHeader from "../../components/common/PageHeader";
import { getAllContracts, deleteContract, exportContractPdf } from "../../services/contractApi";
import LandlordSidebar from "../../components/layout/LandlordSidebar";
import ContractTable from "../../components/landlord/ContractTable";
import ContractFilterPopover from "../../components/landlord/ContractFilterPopover";

const { Sider, Content } = Layout;

export default function LandlordContractListPage() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [filter, setFilter] = useState({});

  const fetchContracts = async (params = {}) => {
    setLoading(true);
    try {
      const res = await getAllContracts(params);
      setContracts(res.result || []);
    } catch (err) {
      message.error("Failed to fetch contracts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts(filter);
  }, [filter]);

  const handleExport = async (id) => {
    try {
      const blob = await exportContractPdf(id);
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (err) {
      message.error("Export PDF failed");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteContract(id);
      message.success("Contract deleted");
      fetchContracts();
    } catch {
      message.error("Delete failed");
    }
  };

  const handleFilterApply = (values) => {
    const params = {};
    if (values.status && values.status !== "ALL") params.contractStatus = values.status;
    if (values.dateRange && values.dateRange.length === 2) {
      params.contractStartDateFrom = values.dateRange[0]?.startOf("day").toISOString();
      params.contractStartDateTo = values.dateRange[1]?.endOf("day").toISOString();
    }
    setFilter(params);
    setFilterVisible(false);
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider width={240}>
        <LandlordSidebar />
      </Sider>
      <Layout>
        <Content style={{ padding: "24px" }}>
          <PageHeader
            title="Contract List"
            extra={[
              <Popover
                key="filter"
                content={<ContractFilterPopover onApply={handleFilterApply} />}
                title={null}
                trigger="click"
                open={filterVisible}
                onOpenChange={setFilterVisible}
              >
                <Button>Filter</Button>
              </Popover>
            ]}
          />
          <ContractTable contracts={contracts} onExport={handleExport} onDelete={handleDelete} loading={loading} />
        </Content>
      </Layout>
    </Layout>
  );
}
