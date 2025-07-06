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
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);

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
      <div style={{ marginBottom: 8 }}>Trạng thái</div>
      <Select
        allowClear
        style={{ width: "100%", marginBottom: 12 }}
        placeholder="Tất cả"
        value={status}
        onChange={setStatus}
        options={[
          { label: "Đã thanh toán", value: true },
          { label: "Chưa thanh toán", value: false },
        ]}
      />
      <div style={{ marginBottom: 8 }}>Giá tối thiểu</div>
      <Input
        type="number"
        placeholder="Giá tối thiểu"
        value={minPrice}
        onChange={(e) => setMinPrice(e.target.value)}
        style={{ marginBottom: 12 }}
      />
      <div style={{ marginBottom: 8 }}>Giá tối đa</div>
      <Input
        type="number"
        placeholder="Giá tối đa"
        value={maxPrice}
        onChange={(e) => setMaxPrice(e.target.value)}
        style={{ marginBottom: 12 }}
      />
      <Button type="primary" block onClick={handleApply}>
        Áp dụng
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
  const [pageSize, setPageSize] = useState(5);
  const pageSizeOptions = [5, 10, 20, 50];
  const [filterOpen, setFilterOpen] = useState(false);
  const navigate = useNavigate();

  const fetchBills = async (page = currentPage, size = pageSize) => {
    setLoading(true);
    try {
      const params = { 
        ...filter, 
        page: page - 1, 
        size: size 
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
    fetchBills(currentPage, pageSize);
    // eslint-disable-next-line
  }, [search, filter, currentPage, pageSize]);

  const handleDelete = async (id) => {
    try {
      await deleteBill(id);
      message.success("Xóa hóa đơn thành công");
      fetchBills();
    } catch (err) {
      message.error("Xóa thất bại");
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
      message.error("Gửi thất bại");
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
    if (date && dayjs(date, "YYYY-MM-DD HH:mm:ss A").isValid()) {
      return dayjs(date, "YYYY-MM-DD HH:mm:ss A").format("DD/MM/YYYY");
    }
    if (date && dayjs(date).isValid()) {
      return dayjs(date).format("DD/MM/YYYY");
    }
    return <span style={{ color: 'red', fontWeight: 500 }}>Không xác định</span>;
  };

  const handlePageSizeChange = (value) => {
    setPageSize(value);
    setCurrentPage(1);
    fetchBills(1, value);
  };

  const columns = [
    {
      title: "STT",
      align: "center",
      width: 70,
      render: (_, __, index) => (currentPage - 1) * pageSize + index + 1,
    },
    { 
      title: "Mã hóa đơn", 
      dataIndex: "id", 
      align: "center", 
      width: 100,
      render: (id) => `#${id}`
    },
    { 
      title: "Phòng", 
      dataIndex: "roomNumber", 
      align: "center", 
      width: 120 
    },
    { 
      title: "Mã hợp đồng", 
      dataIndex: "contractId", 
      align: "center", 
      width: 120,
      render: (contractId) => contractId ? `#${contractId}` : 'N/A'
    },
    { 
      title: "Loại hóa đơn", 
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
      title: "Từ ngày", 
      dataIndex: "fromDate", 
      align: "center", 
      width: 120,
      render: (date) => formatDate(date)
    },
    { 
      title: "Đến ngày", 
      dataIndex: "toDate", 
      align: "center", 
      width: 120,
      render: (date) => formatDate(date)
    },
    { 
      title: "Tổng tiền", 
      dataIndex: "totalAmount", 
      align: "center", 
      width: 140,
      render: (amount) => formatCurrency(amount)
    },
    {
      title: "Trạng thái",
      align: "center",
      width: 120,
      render: (_, record) => (
        <Tag color={record.status ? "green" : "red"}>
          {record.status ? "Đã thanh toán" : "Chưa thanh toán"}
        </Tag>
      ),
    },
    {
      title: "Thao tác",
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
            Xem
          </Button>
          <Popconfirm
            title="Bạn có chắc chắn muốn xóa hóa đơn này?"
            okText="Có"
            cancelText="Không"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button 
              danger 
              icon={<DeleteOutlined />}
              size="small"
            >
              Xóa
            </Button>
          </Popconfirm>
          <Button 
            type="primary"
            style={{ background: '#1677ff', borderColor: '#1677ff' }}
            onClick={() => handleExport(record.id)}
            size="small"
          >
            Xuất PDF
          </Button>
          <Button 
            icon={<SendOutlined />}
            onClick={() => handleSend(record.id)}
            size="small"
          >
            Gửi
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
            <PageHeader title="Danh sách hóa đơn" />
            <Space>
              <Input
                placeholder="Tìm hóa đơn..."
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
                <Button icon={<FilterOutlined />}>Bộ lọc</Button>
              </Popover>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate("/landlord/bills/create")}
              >
                Thêm hóa đơn
              </Button>
            </Space>
          </div>
          
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <div>
              Hiển thị
              <Select
                style={{ width: 80, margin: "0 8px" }}
                value={pageSize}
                onChange={handlePageSizeChange}
                options={pageSizeOptions.map((v) => ({ value: v, label: v }))}
              />
              mục
            </div>
            <div style={{ fontWeight: 400, color: "#888" }}>
              Tổng: {total} hóa đơn
            </div>
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
              onChange={(page, size) => {
                setCurrentPage(page);
                setPageSize(size);
                fetchBills(page, size);
              }}
              showSizeChanger={false}
              showQuickJumper
              showTotal={(total, range) => `${range[0]}-${range[1]} trên tổng số ${total} hóa đơn`}
            />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
