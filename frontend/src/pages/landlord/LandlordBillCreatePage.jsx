import React, { useState, useEffect } from "react";
import { 
  Form, 
  Input, 
  InputNumber, 
  Button, 
  message, 
  Select, 
  Card, 
  Row, 
  Col,
  DatePicker,
  Space,
  Divider
} from "antd";
import { createBill, generateBill, generateFirstBill, createCustomBill } from "../../services/billApi";
import { getAllRooms } from "../../services/roomService";
import { getAllContracts } from "../../services/contractApi";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import LandlordSidebar from "../../components/layout/LandlordSidebar";
import PageHeader from "../../components/common/PageHeader";

const { Option } = Select;
const { RangePicker } = DatePicker;

export default function LandlordBillCreatePage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedContract, setSelectedContract] = useState(null);
  const [billType, setBillType] = useState("SERVICE");
  const navigate = useNavigate();

  useEffect(() => {
    fetchRooms();
    fetchContracts();
  }, []);

  const fetchRooms = async () => {
    try {
      const res = await getAllRooms(0, 1000);
      setRooms(res.result || []);
    } catch (err) {
      message.error("Failed to load rooms");
    }
  };

  const fetchContracts = async () => {
    try {
      const res = await getAllContracts();
      setContracts(res.data || []);
    } catch (err) {
      message.error("Failed to load contracts");
    }
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      let result;
      
      if (billType === "CUSTOM") {
        // Gọi API tạo bill custom
        const [from, to] = values.customDateRange || [];
        const payload = {
          roomId: values.roomId,
          name: values.customName,
          description: values.customDescription,
          amount: values.customAmount,
          fromDate: from ? from.format("YYYY-MM-DD") : undefined,
          toDate: to ? to.format("YYYY-MM-DD") : undefined,
          billType: "CUSTOM"
        };
        await createCustomBill(payload);
        message.success("Custom bill created successfully");
        navigate("/landlord/bills");
        setLoading(false);
        return;
      } else if (billType === "SERVICE") {
        // Tạo bill dịch vụ
        const month = values.month.month() + 1;
        const year = values.month.year();
        result = await createBill({
          roomId: values.roomId,
          month: month,
          year: year
        });
      } else if (billType === "CONTRACT") {
        // Tạo bill hợp đồng
        if (values.dateRange && values.dateRange.length === 2) {
          const fromDate = values.dateRange[0].format("YYYY-MM-DD");
          const toDate = values.dateRange[1].format("YYYY-MM-DD");
          result = await generateBill(
            values.contractId,
            fromDate,
            toDate,
            "REGULAR"
          );
        } else {
          result = await generateFirstBill(values.contractId);
        }
      }
      
      message.success("Bill created successfully");
      navigate("/landlord/bills");
    } catch (err) {
      const errorMsg = err?.response?.data?.message || "Create bill failed";
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleRoomChange = (roomId) => {
    const room = rooms.find(r => r.id === roomId);
    setSelectedRoom(room);
    setSelectedContract(null);
  };

  const handleContractChange = (contractId) => {
    const contract = contracts.find(c => c.id === contractId);
    setSelectedContract(contract);
  };

  // Sửa lỗi nhảy form: reset các trường phụ thuộc khi đổi billType
  const handleBillTypeChange = (value) => {
    setBillType(value);
    form.resetFields(["roomId", "month", "contractId", "dateRange"]);
    setSelectedRoom(null);
    setSelectedContract(null);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
      {/* Overlay blur background */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 0,
          background: 'rgba(255,255,255,0.4)',
          backdropFilter: 'blur(8px)'
        }}
      />
      <LandlordSidebar />
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        position: 'relative',
        zIndex: 1
      }}>
        <Card
          style={{
            width: 600,
            boxShadow: '0 4px 24px 0 rgba(0,0,0,0.08)',
            borderRadius: 16,
            padding: 32,
            margin: '40px 0',
            background: '#fff',
            position: 'relative',
            zIndex: 2
          }}
          bodyStyle={{ padding: 0 }}
        >
          <PageHeader title="Create Bill" />
          <Divider />
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
          >
            <Form.Item 
              name="billType" 
              label="Bill Type" 
              rules={[{ required: true, message: 'Please select bill type' }]}
            >
              <Select 
                value={billType}
                onChange={handleBillTypeChange}
                placeholder="Select bill type"
              >
                <Option value="SERVICE">Service Bill (Dịch vụ)</Option>
                <Option value="CONTRACT">Contract Bill (Hợp đồng)</Option>
                <Option value="CUSTOM">Custom Bill (Tuỳ chỉnh)</Option>
              </Select>
            </Form.Item>

            {billType === "SERVICE" && (
              <>
                <Form.Item 
                  name="roomId" 
                  label="Room" 
                  rules={[{ required: true, message: 'Please select room' }]}
                >
                  <Select 
                    placeholder="Select room"
                    onChange={handleRoomChange}
                    showSearch
                    filterOption={(input, option) =>
                      option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                    }
                  >
                    {rooms.map(room => (
                      <Option
                        key={room.id}
                        value={room.id}
                        disabled={!room.hasActiveContract}
                      >
                        {room.roomNumber} - {room.building || 'N/A'}
                        {!room.hasActiveContract ? ' (No contract)' : ''}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item 
                  name="month" 
                  label="Month/Year" 
                  rules={[{ required: true, message: 'Please select month' }]}
                >
                  <DatePicker 
                    picker="month" 
                    placeholder="Select month"
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </>
            )}

            {billType === "CONTRACT" && (
              <>
                <Form.Item 
                  name="contractId" 
                  label="Contract" 
                  rules={[{ required: true, message: 'Please select contract' }]}
                >
                  <Select 
                    placeholder="Select contract"
                    onChange={handleContractChange}
                    showSearch
                    filterOption={(input, option) =>
                      option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                    }
                  >
                    {contracts.map(contract => (
                      <Option key={contract.id} value={contract.id}>
                        Contract #{contract.id} - Room {contract.room?.roomNumber}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item 
                  name="dateRange" 
                  label="Date Range (Optional)"
                >
                  <RangePicker 
                    style={{ width: '100%' }}
                    placeholder={['Start Date', 'End Date']}
                  />
                </Form.Item>
              </>
            )}

            {billType === "CUSTOM" && (
              <>
                <Form.Item
                  name="roomId"
                  label="Room"
                  rules={[{ required: true, message: 'Please select room' }]}
                >
                  <Select
                    placeholder="Select room"
                    showSearch
                    filterOption={(input, option) =>
                      option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                    }
                  >
                    {rooms.map(room => (
                      <Option
                        key={room.id}
                        value={room.id}
                        disabled={!room.hasActiveContract}
                      >
                        {room.roomNumber} - {room.building || 'N/A'}
                        {!room.hasActiveContract ? ' (No contract)' : ''}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.Item
                  name="customName"
                  label="Bill Name"
                  rules={[{ required: true, message: 'Please enter bill name' }]}
                >
                  <Input placeholder="Enter bill name (e.g. Điện tháng 6, Phí vệ sinh...)" />
                </Form.Item>
                <Form.Item
                  name="customDescription"
                  label="Description"
                >
                  <Input.TextArea placeholder="Enter description (optional)" />
                </Form.Item>
                <Form.Item
                  name="customAmount"
                  label="Amount"
                  rules={[{ required: true, message: 'Please enter amount' }]}
                >
                  <InputNumber min={0} style={{ width: "100%" }} placeholder="Enter amount (VND)" />
                </Form.Item>
                <Form.Item
                  name="customDateRange"
                  label="Date Range (Optional)"
                >
                  <RangePicker style={{ width: '100%' }} />
                </Form.Item>
              </>
            )}

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" loading={loading}>
                  Create Bill
                </Button>
                <Button onClick={() => navigate("/landlord/bills")}>Cancel</Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </div>
  );
} 