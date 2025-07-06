// src/pages/landlord/LandlordServiceListPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Layout,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  message,
  Select,
  Popconfirm,
  Space,
  Popover,
  Pagination,
} from "antd";
import { PlusOutlined, SearchOutlined, FilterOutlined } from "@ant-design/icons";
import LandlordSidebar from "../../components/layout/LandlordSidebar";
import PageHeader from "../../components/common/PageHeader";
import ServiceTable from "../../components/landlord/ServiceTable";
import { getAllServices, createService, updateService, deleteService } from "../../services/serviceApi";
import { debounce } from "lodash";
import ServiceFilterPopover from "../../components/landlord/ServiceFilterPopover";

const { Sider, Content } = Layout;

export default function LandlordServiceListPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 5, total: 0 });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [form] = Form.useForm();
  
  // STEP 1: Refactor state management
  // Central state for all active filters being sent to the API
  const [activeFilters, setActiveFilters] = useState({});
  // Separate state for the search input field to keep UI responsive
  const [searchInput, setSearchInput] = useState('');

  const serviceTypeOptions = [
    { label: "Điện", value: "ELECTRICITY" },
    { label: "Nước", value: "WATER" },
    { label: "Khác", value: "OTHER" },
  ];

  const pageSizeOptions = [5, 10, 20, 50];

  const fetchServices = useCallback(async (page, size, filters) => {
    setLoading(true);
    try {
      const response = await getAllServices(page - 1, size, filters);
      if (response && response.data && response.data.result) {
        const transformedServices = response.data.result.map(service => ({
          id: service.id,
          name: service.serviceName,
          price: service.unitPrice,
          type: service.serviceType,
          unit: service.unit,
          status: true,
        }));
        setServices(transformedServices);
        setPagination(prev => ({ ...prev, total: response.data.meta.total, current: page, pageSize: size }));
      }
    } catch (error) {
      console.error("Error fetching services:", error);
      message.error("Failed to load services");
    } finally {
      setLoading(false);
    }
  }, []);
  
  // STEP 2: Define new handlers and debounced function
  const debouncedApplySearch = useCallback(
    debounce((filters) => setActiveFilters(filters), 500),
    []
  );

  useEffect(() => {
    fetchServices(pagination.current, pagination.pageSize, activeFilters);
  }, [activeFilters, pagination.current, pagination.pageSize, fetchServices]);

  const handleSearchInputChange = (e) => {
    const { value } = e.target;
    setSearchInput(value);
    // We update a temporary filter object to avoid re-rendering on every keystroke
    // The actual state update is debounced
    const newFilters = { ...activeFilters, serviceName: value };
    debouncedApplySearch(newFilters);
    setPagination(p => ({ ...p, current: 1 }));
  };

  const handleAdvancedFilterApply = (advancedFilters) => {
    // Merges advanced filters with existing filters (like search term)
    const newFilters = { ...activeFilters, ...advancedFilters };
    setActiveFilters(newFilters);
    setPagination(p => ({ ...p, current: 1 }));
    setIsFilterOpen(false); // Close popover on apply
  };
  
  const handleEdit = (id) => {
    const service = services.find(s => s.id === id);
    if (service) {
      setEditingService(service);
      form.setFieldsValue({
        name: service.name,
        price: service.price,
        type: service.type,
        unit: service.unit,
      });
      setIsModalOpen(true);
    }
  };
  
  const handleTableChange = (newPagination) => {
    setPagination(prev => ({
        ...prev,
        current: newPagination.current,
        pageSize: newPagination.pageSize
    }));
  };

  const handleAddService = async (values) => {
    setIsSubmitting(true);
    try {
      const serviceData = {
        serviceName: values.name,
        unitPrice: values.price,
        serviceType: values.type,
        unit: values.unit,
      };

      const response = editingService
        ? await updateService(editingService.id, serviceData)
        : await createService(serviceData);

      if (response && response.data) {
        message.success(editingService ? "Cập nhật dịch vụ thành công" : "Thêm dịch vụ thành công");
        form.resetFields();
        setIsModalOpen(false);
        setEditingService(null);
        // STEP 2: Refresh with the correct active filters
        fetchServices(1, pagination.pageSize, activeFilters);
      } else {
        throw new Error(response.error || "Lưu dịch vụ thất bại");
      }
    } catch (error) {
      console.error("Error saving service:", error);
      message.error(error.message || "Lưu dịch vụ thất bại");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteService = async (id) => {
    try {
        await deleteService(id);
        message.success("Xóa dịch vụ thành công");
        // STEP 2: Refresh with the correct active filters
        fetchServices(pagination.current, pagination.pageSize, activeFilters);
    } catch (error) {
        console.error("Error deleting service:", error);
        message.error("Xóa dịch vụ thất bại");
    }
  };

  const handleModalCancel = () => {
    setIsModalOpen(false);
    setEditingService(null);
    form.resetFields();
  };

  const handlePageSizeChange = (value) => {
    setPagination(p => ({ ...p, pageSize: value, current: 1 }));
    fetchServices(1, value, activeFilters);
  };

  return (
    <Layout style={{ minHeight: "100vh", flexDirection: "row" }}>
      <Sider width={220} style={{ background: "#001529" }}>
        <LandlordSidebar />
      </Sider>

      <Layout style={{ padding: 24 }}>
        <Content style={{ background: "#fff", padding: 24, borderRadius: 8, minHeight: "100%" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: 'center', marginBottom: 24 }}>
            <PageHeader title="Danh sách dịch vụ" />
            <Space>
                <Input
                    placeholder="Tìm tên dịch vụ"
                    prefix={<SearchOutlined />}
                    value={searchInput}
                    onChange={handleSearchInputChange}
                    style={{ width: 250 }}
                />
                <Popover
                  content={<ServiceFilterPopover onFilter={handleAdvancedFilterApply} onClose={() => setIsFilterOpen(false)} />}
                  trigger="click"
                  placement="bottomRight"
                  open={isFilterOpen}
                  onOpenChange={setIsFilterOpen}
                >
                  <Button icon={<FilterOutlined />}>Bộ lọc</Button>
                </Popover>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
                  Thêm dịch vụ
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
                value={pagination.pageSize}
                onChange={handlePageSizeChange}
                options={pageSizeOptions.map((v) => ({ value: v, label: v }))}
              />
              mục
            </div>
            <div style={{ fontWeight: 400, color: "#888" }}>
              Tổng số: {pagination.total} dịch vụ
            </div>
          </div>
          <div style={{ marginTop: 24 }}>
            <ServiceTable
                services={services}
                pagination={pagination}
                loading={loading}
                onEdit={handleEdit}
                onDelete={handleDeleteService}
                onTableChange={handleTableChange}
            />
          </div>

          <Modal
            title={editingService ? "Chỉnh sửa dịch vụ" : "Thêm dịch vụ mới"}
            open={isModalOpen}
            onCancel={handleModalCancel}
            footer={
              editingService ? (
                [
                  <Button key="back" onClick={handleModalCancel}>Hủy</Button>,
                  <Popconfirm
                    key="submit"
                    title="Update the service"
                    description="Are you sure you want to save these changes?"
                    onConfirm={() => form.submit()}
                    okText="Yes, Update"
                    cancelText="No"
                  >
                    <Button type="primary" loading={isSubmitting}>Update</Button>
                  </Popconfirm>
                ]
              ) : (
                [
                  <Button key="back" onClick={handleModalCancel}>Hủy</Button>,
                  <Button key="submit" type="primary" loading={isSubmitting} onClick={() => form.submit()}>Lưu</Button>
                ]
              )
            }
          >
            <Form layout="vertical" form={form} onFinish={handleAddService}>
              <Form.Item label="Tên dịch vụ" name="name" rules={[{ required: true, message: "Vui lòng nhập tên dịch vụ" }]}>
                <Input placeholder="Nhập tên dịch vụ" />
              </Form.Item>
              <Form.Item label="Đơn vị" name="unit" rules={[{ required: true, message: "Vui lòng nhập đơn vị" }]}>
                <Input placeholder="VD: kWh, m³, ..." />
              </Form.Item>
              <Form.Item label="Giá (VND/đơn vị)" name="price" rules={[{ required: true, message: "Vui lòng nhập giá" }]}>
                <InputNumber style={{ width: "100%" }} placeholder="Nhập giá" min={0} />
              </Form.Item>
              <Form.Item label="Loại dịch vụ" name="type" rules={[{ required: true, message: "Vui lòng chọn loại dịch vụ" }]}>
                <Select options={serviceTypeOptions} placeholder="Chọn loại dịch vụ" />
              </Form.Item>
            </Form>
          </Modal>
        </Content>
      </Layout>
    </Layout>
  );
}
