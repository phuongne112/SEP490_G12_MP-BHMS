import React, { useState } from "react";
import { Button, Select, DatePicker, Input, InputNumber, Row, Col } from "antd";

const { Option } = Select;
const { RangePicker } = DatePicker;

const CONTRACT_STATUS = [
  { value: "ALL", label: "Tất cả" },
  { value: "PENDING", label: "Chờ phê duyệt" },
  { value: "ACTIVE", label: "Đang hiệu lực" },
  { value: "TERMINATED", label: "Đã chấm dứt" },
  { value: "EXPIRED", label: "Hết hạn" },
];
const PAYMENT_CYCLES = [
  { value: "ALL", label: "Tất cả" },
  { value: "MONTHLY", label: "Hàng tháng" },
  { value: "QUARTERLY", label: "Hàng quý" },
  { value: "YEARLY", label: "Hàng năm" },
];

export default function ContractFilterPopover({ onApply, rooms = [], tenants = [] }) {
  const [status, setStatus] = useState("ALL");
  const [dateRange, setDateRange] = useState(null);
  const [room, setRoom] = useState("ALL");
  const [tenant, setTenant] = useState("ALL");
  const [paymentCycle, setPaymentCycle] = useState("ALL");
  const [contractNumber, setContractNumber] = useState("");
  const [depositMin, setDepositMin] = useState();
  const [depositMax, setDepositMax] = useState();
  const [rentMin, setRentMin] = useState();
  const [rentMax, setRentMax] = useState();

  const handleApply = () => {
    onApply({
      status,
      dateRange,
      room,
      tenant,
      paymentCycle,
      contractNumber,
      depositMin,
      depositMax,
      rentMin,
      rentMax
    });
  };

  return (
    <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 4px 24px 0 rgba(0,0,0,0.10)', padding: 24, minWidth: 350 }}>
      <div style={{ marginBottom: 20, fontWeight: 700, fontSize: 18 }}>Bộ lọc nâng cao</div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, marginBottom: 6 }}>Chu kỳ thanh toán</div>
        <Select value={paymentCycle} onChange={setPaymentCycle} style={{ width: "100%" }}>
          {PAYMENT_CYCLES.map((s) => (
            <Option key={s.value} value={s.value}>{s.label}</Option>
          ))}
        </Select>
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, marginBottom: 6 }}>Phòng</div>
        <Select value={room} onChange={setRoom} style={{ width: "100%" }} showSearch allowClear>
          <Option value="ALL">Tất cả</Option>
          {rooms.map((r) => (
            <Option key={r.id} value={r.id}>{r.roomNumber || r.name || r.id}</Option>
          ))}
        </Select>
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, marginBottom: 6 }}>Khoảng ngày bắt đầu</div>
        <RangePicker style={{ width: "100%" }} onChange={setDateRange} placeholder={["Ngày bắt đầu", "Ngày kết thúc"]} />
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, marginBottom: 6 }}>Tiền cọc (VND)</div>
        <Row gutter={8}>
          <Col span={12}><InputNumber value={depositMin} onChange={setDepositMin} min={0} style={{ width: "100%" }} placeholder="Tối thiểu" /></Col>
          <Col span={12}><InputNumber value={depositMax} onChange={setDepositMax} min={0} style={{ width: "100%" }} placeholder="Tối đa" /></Col>
        </Row>
      </div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 14, marginBottom: 6 }}>Tiền thuê (VND)</div>
        <Row gutter={8}>
          <Col span={12}><InputNumber value={rentMin} onChange={setRentMin} min={0} style={{ width: "100%" }} placeholder="Tối thiểu" /></Col>
          <Col span={12}><InputNumber value={rentMax} onChange={setRentMax} min={0} style={{ width: "100%" }} placeholder="Tối đa" /></Col>
        </Row>
      </div>
      <Button type="primary" onClick={handleApply} style={{ width: "100%", borderRadius: 8, height: 40, fontWeight: 600, fontSize: 16 }}>
        Áp dụng
      </Button>
    </div>
  );
} 