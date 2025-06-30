import React, { useEffect, useState } from "react";
import { Layout, message, Button, Popover, Select } from "antd";
import PageHeader from "../../components/common/PageHeader";
import { getAllContracts, deleteContract, exportContractPdf } from "../../services/contractApi";
import { useSelector } from "react-redux";
import AdminSidebar from "../../components/layout/AdminSidebar";
import LandlordSidebar from "../../components/layout/LandlordSidebar";
import ContractTable from "../../components/landlord/ContractTable";
import ContractFilterPopover from "../../components/landlord/ContractFilterPopover";

const { Sider, Content } = Layout;

export default function LandlordContractListPage() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [filter, setFilter] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [total, setTotal] = useState(0);
  const pageSizeOptions = [5, 10, 20, 50];

  const user = useSelector((state) => state.account.user);

  const fetchContracts = async (page = currentPage, size = pageSize) => {
    setLoading(true);
    try {
      const params = { ...filter, page: page - 1, size };
      const res = await getAllContracts(params);
      setContracts(res.result || []);
      setTotal(res.meta?.total || 0);
    } catch (err) {
      message.error("Failed to load contracts");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchContracts(currentPage, pageSize);
    // eslint-disable-next-line
  }, [filter, currentPage, pageSize]);

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

  const handlePageSizeChange = (value) => {
    setPageSize(value);
    setCurrentPage(1);
    fetchContracts(1, value);
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider width={240}>
        {user?.role?.roleName?.toUpperCase?.() === "ADMIN" || user?.role?.roleName?.toUpperCase?.() === "SUBADMIN" ? (
          <AdminSidebar />
        ) : (
          <LandlordSidebar />
        )}
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
          <div
            style={{
              height: 16
            }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <div>
              Show
              <Select
                style={{ width: 80, margin: "0 8px", marginLeft: 8, marginRight: 8 }}
                value={pageSize}
                onChange={handlePageSizeChange}
                options={pageSizeOptions.map((v) => ({ value: v, label: v }))}
              />
              entries
            </div>
            <div style={{ fontWeight: 400, color: "#888" }}>
              Total: {total} contracts
            </div>
          </div>
          <ContractTable contracts={contracts} onExport={handleExport} onDelete={handleDelete} loading={loading} />
        </Content>
      </Layout>
    </Layout>
  );
}
