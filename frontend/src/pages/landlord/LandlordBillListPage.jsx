import React, { useEffect, useState } from "react";
import {
  Layout,
  Table,
  Button,
  Space,
  message,
  Popconfirm,
  Input,
  Pagination,
  Popover,
  Select,
  Tag,
  Card,
} from "antd";
import {
  PlusOutlined,
  FilterOutlined,
  SearchOutlined,
  EyeOutlined,
  DeleteOutlined,
  DownloadOutlined,
  SendOutlined,
} from "@ant-design/icons";
import LandlordSidebar from "../../components/layout/LandlordSidebar";
import PageHeader from "../../components/common/PageHeader";
import {
  getAllBills,
  deleteBill,
  exportBillPdf,
  sendBillToRenter,
} from "../../services/billApi";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";

const { Sider, Content } = Layout;

function BillFilterPopover({ onFilter }) {
  const [status, setStatus] = useState();
  const [minPrice, setMinPrice] = useState();
  const [maxPrice, setMaxPrice] = useState();
  const [roomId, setRoomId] = useState();
  
  const handleApply = () => {
    const roomIdNumber = roomId && !isNaN(roomId) ? Number(roomId) : undefined;
    onFilter({ status, minPrice, maxPrice, roomId: roomIdNumber });
  };
  
  return (
    <div style={{ minWidth: 220 }}>
      <div style={{ marginBottom: 8 }}>Status</div>
      <Select
        allowClear
        style={{ width: "100%", marginBottom: 12 }}
        placeholder="All"
        value={status}
        onChange={setStatus}
        options={[
          { label: "Paid", value: true },
          { label: "Unpaid", value: false },
        ]}
      />
      <div style={{ marginBottom: 8 }}>Min Price</div>
      <Input
        type="number"
        placeholder="Min price"
        value={minPrice}
        onChange={(e) => setMinPrice(e.target.value)}
        style={{ marginBottom: 12 }}
      />
      <div style={{ marginBottom: 8 }}>Max Price</div>
      <Input
        type="number"
        placeholder="Max price"
        value={maxPrice}
        onChange={(e) => setMaxPrice(e.target.value)}
        style={{ marginBottom: 12 }}
      />
      <Button type="primary" block onClick={handleApply}>
        Apply
      </Button>
    </div>
  );
}

export default function LandlordBillListPage() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;
  const [filterOpen, setFilterOpen] = useState(false);
  const navigate = useNavigate();

  const fetchBills = async () => {
    setLoading(true);
    try {
      const params = { 
        ...filter, 
        page: currentPage - 1, 
        size: pageSize 
      };
      if (search) params.search = search;
      
      const res = await getAllBills(params);
      setBills(res.content || []);
      setTotal(res.totalElements || 0);
    } catch (err) {
      message.error("Failed to load bills");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
    // eslint-disable-next-line
  }, [search, filter, currentPage]);

  const handleDelete = async (id) => {
    try {
      await deleteBill(id);
      message.success("Bill deleted successfully");
      fetchBills();
    } catch (err) {
      message.error("Delete failed");
    }
  };

  const handleExport = async (id) => {
    try {
      const data = await exportBillPdf(id);
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `bill_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      message.success("Bill exported successfully");
    } catch (err) {
      message.error("Export failed");
    }
  };

  const handleSend = async (id) => {
    try {
      await sendBillToRenter(id);
      message.success("Bill sent to renter successfully");
    } catch (err) {
      message.error("Send failed");
    }
  };

  const handleFilter = (newFilter) => {
    setFilter(newFilter);
    setCurrentPage(1);
    setFilterOpen(false);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const formatDate = (date) => {
    return dayjs(date).format('DD/MM/YYYY');
  };

  const columns = [
    {
      title: "No.",
      align: "center",
      width: 70,
      render: (_, __, index) => (currentPage - 1) * pageSize + index + 1,
    },
    { 
      title: "Bill ID", 
      dataIndex: "id", 
      align: "center", 
      width: 100,
      render: (id) => `#${id}`
    },
    { 
      title: "Room", 
      dataIndex: "roomNumber", 
      align: "center", 
      width: 120 
    },
    { 
      title: "Contract ID", 
      dataIndex: "contractId", 
      align: "center", 
      width: 120,
      render: (contractId) => contractId ? `#${contractId}` : 'N/A'
    },
    { 
      title: "Bill Type", 
      dataIndex: "billType", 
      align: "center", 
      width: 120,
      render: (billType) => (
        <Tag color={billType === 'REGULAR' ? 'blue' : 'green'}>
          {billType === 'REGULAR' ? 'Regular' : 'Service'}
        </Tag>
      )
    },
    { 
      title: "From Date", 
      dataIndex: "fromDate", 
      align: "center", 
      width: 120,
      render: (date) => formatDate(date)
    },
    { 
      title: "To Date", 
      dataIndex: "toDate", 
      align: "center", 
      width: 120,
      render: (date) => formatDate(date)
    },
    { 
      title: "Total Amount", 
      dataIndex: "totalAmount", 
      align: "center", 
      width: 140,
      render: (amount) => formatCurrency(amount)
    },
    {
      title: "Status",
      align: "center",
      width: 120,
      render: (_, record) => (
        <Tag color={record.status ? "green" : "red"}>
          {record.status ? "Paid" : "Unpaid"}
        </Tag>
      ),
    },
    {
      title: "Actions",
      align: "center",
      width: 280,
      render: (_, record) => (
        <Space>
          <Button 
            type="primary" 
            icon={<EyeOutlined />}
            onClick={() => navigate(`/landlord/bills/${record.id}`)}
            size="small"
          >
            View
          </Button>
          <Popconfirm
            title="Are you sure you want to delete this bill?"
            okText="Yes"
            cancelText="No"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button 
              danger 
              icon={<DeleteOutlined />}
              size="small"
            >
              Delete
            </Button>
          </Popconfirm>
          <Button 
            type="primary"
            style={{ background: '#1677ff', borderColor: '#1677ff' }}
            onClick={() => handleExport(record.id)}
            size="small"
          >
            Export PDF
          </Button>
          <Button 
            icon={<SendOutlined />}
            onClick={() => handleSend(record.id)}
            size="small"
          >
            Send
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider width={220}>
        <LandlordSidebar />
      </Sider>
      <Layout>
        <Content
          style={{
            padding: "24px",
            paddingTop: "32px",
            background: "#fff",
            borderRadius: 8,
          }}
        >
          <div
            style={{
              marginBottom: 16,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <PageHeader title="Bill List" />
            <Space>
              <Input
                placeholder="Search by bill ID or room number"
                allowClear
                prefix={<SearchOutlined />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onPressEnter={() => setCurrentPage(1)}
                style={{ width: 300 }}
              />
              <Popover
                open={filterOpen}
                onOpenChange={setFilterOpen}
                content={<BillFilterPopover onFilter={handleFilter} />}
                trigger="click"
                placement="bottomRight"
              >
                <Button icon={<FilterOutlined />}>Filter</Button>
              </Popover>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate("/landlord/bills/create")}
              >
                Create Bill
              </Button>
            </Space>
          </div>
          
          <Card>
            <Table
              columns={columns}
              dataSource={bills}
              loading={loading}
              rowKey="id"
              pagination={false}
              scroll={{ x: 1200 }}
            />
          </Card>
          
          <div
            style={{
              marginTop: 24,
              width: "100%",
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <Pagination
              current={currentPage}
              pageSize={pageSize}
              total={total}
              onChange={(page) => setCurrentPage(page)}
              showSizeChanger={false}
              showQuickJumper
              showTotal={(total, range) => 
                `${range[0]}-${range[1]} of ${total} bills`
              }
            />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
