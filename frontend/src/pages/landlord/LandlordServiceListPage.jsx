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
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [form] = Form.useForm();
  
  // STEP 1: Refactor state management
  // Central state for all active filters being sent to the API
  const [activeFilters, setActiveFilters] = useState({});
  // Separate state for the search input field to keep UI responsive
  const [searchInput, setSearchInput] = useState('');

  const serviceTypeOptions = [
    { label: "Electricity", value: "ELECTRICITY" },
    { label: "Water", value: "WATER" },
    { label: "Other", value: "OTHER" },
  ];

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
        message.success(editingService ? "Service updated successfully" : "Service added successfully");
        form.resetFields();
        setIsModalOpen(false);
        setEditingService(null);
        // STEP 2: Refresh with the correct active filters
        fetchServices(1, pagination.pageSize, activeFilters);
      } else {
        throw new Error(response.error || "Failed to save service");
      }
    } catch (error) {
      console.error("Error saving service:", error);
      message.error(error.message || "Failed to save service");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteService = async (id) => {
    try {
        await deleteService(id);
        message.success("Service deleted successfully");
        // STEP 2: Refresh with the correct active filters
        fetchServices(pagination.current, pagination.pageSize, activeFilters);
    } catch (error) {
        console.error("Error deleting service:", error);
        message.error("Failed to delete service");
    }
  };

  const handleModalCancel = () => {
    setIsModalOpen(false);
    setEditingService(null);
    form.resetFields();
  };

  return (
    <Layout style={{ minHeight: "100vh", flexDirection: "row" }}>
      <Sider width={220} style={{ background: "#001529" }}>
        <LandlordSidebar />
      </Sider>

      <Layout style={{ padding: 24 }}>
        <Content style={{ background: "#fff", padding: 24, borderRadius: 8, minHeight: "100%" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: 'center', marginBottom: 24 }}>
            <PageHeader title="List Service" />
            <Space>
                <Input
                    placeholder="Search service name"
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
                  <Button icon={<FilterOutlined />}>Filter</Button>
                </Popover>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
                  Add Service
                </Button>
            </Space>
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
            title={editingService ? "Edit Service" : "Add New Service"}
            open={isModalOpen}
            onCancel={handleModalCancel}
            footer={
              editingService ? (
                [
                  <Button key="back" onClick={handleModalCancel}>Cancel</Button>,
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
                  <Button key="back" onClick={handleModalCancel}>Cancel</Button>,
                  <Button key="submit" type="primary" loading={isSubmitting} onClick={() => form.submit()}>Save</Button>
                ]
              )
            }
          >
            <Form layout="vertical" form={form} onFinish={handleAddService}>
              <Form.Item label="Service Name" name="name" rules={[{ required: true, message: "Please enter service name" }]}>
                <Input placeholder="Enter service name" />
              </Form.Item>
              <Form.Item label="Unit" name="unit" rules={[{ required: true, message: "Please enter unit" }]}>
                <Input placeholder="e.g., kWh, m³, etc." />
              </Form.Item>
              <Form.Item label="Price (VND/unit)" name="price" rules={[{ required: true, message: "Please enter price" }]}>
                <InputNumber style={{ width: "100%" }} placeholder="Enter price" min={0} />
              </Form.Item>
              <Form.Item label="Service Type" name="type" rules={[{ required: true, message: "Please select service type" }]}>
                <Select options={serviceTypeOptions} placeholder="Select service type" />
              </Form.Item>
            </Form>
          </Modal>
        </Content>
      </Layout>
    </Layout>
  );
}
