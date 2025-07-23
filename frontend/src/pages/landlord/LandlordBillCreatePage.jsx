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
  Divider,
  Radio,
  Alert
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

// Hàm tự động lấy hết hợp đồng qua nhiều trang
async function fetchAllContractsAuto() {
  let page = 0;
  const size = 200;
  let allContracts = [];
  let hasMore = true;

  while (hasMore) {
    const res = await getAllContracts({ page, size });
    const contracts = res.result || [];
    allContracts = allContracts.concat(contracts);
    hasMore = contracts.length === size;
    page += 1;
  }
  return allContracts;
}

// Hàm trả về các lựa chọn kỳ thanh toán hợp lệ theo paymentCycle
function getPeriodOptions(paymentCycle) {
  switch (paymentCycle) {
    case 'MONTHLY':
      return [{ value: '1m', label: '1 tháng', months: 1 }];
    case 'QUARTERLY':
      return [{ value: '3m', label: '3 tháng', months: 3 }];
    case 'YEARLY':
      return [{ value: '12m', label: '12 tháng', months: 12 }];
    default:
      return [];
  }
}

// Hàm chuẩn hóa ngày kết thúc kỳ hóa đơn giống backend
function calculateEndDate(startDate, paymentCycle, contractEndDate) {
  let endDate;
  switch (paymentCycle) {
    case 'MONTHLY':
      endDate = startDate.clone().add(1, 'month').subtract(1, 'day');
      break;
    case 'QUARTERLY':
      endDate = startDate.clone().add(3, 'month').subtract(1, 'day');
      break;
    case 'YEARLY':
      endDate = startDate.clone().add(12, 'month').subtract(1, 'day');
      break;
    default:
      endDate = startDate;
  }
  if (contractEndDate && endDate.isAfter(contractEndDate)) {
    return contractEndDate.clone();
  }
  return endDate;
}

// Hàm validation khoảng ngày tùy chọn theo chu kỳ thanh toán
function validateCustomPeriod(fromDate, toDate, paymentCycle) {
  if (!fromDate || !toDate || !paymentCycle) {
    return { isValid: false, message: "Thiếu thông tin để kiểm tra" };
  }

  // Tính số tháng giữa hai ngày
  const monthsDiff = toDate.diff(fromDate, 'month', true);
  
  // Lấy số tháng tiêu chuẩn theo chu kỳ thanh toán
  let expectedMonths;
  let cycleName;
  switch (paymentCycle) {
    case 'MONTHLY':
      expectedMonths = 1;
      cycleName = "hàng tháng";
      break;
    case 'QUARTERLY':
      expectedMonths = 3;
      cycleName = "hàng quý";
      break;
    case 'YEARLY':
      expectedMonths = 12;
      cycleName = "hàng năm";
      break;
    default:
      return { isValid: false, message: "Chu kỳ thanh toán không hợp lệ" };
  }

  // Kiểm tra độ chênh lệch - Frontend chỉ cảnh báo, để Backend quyết định chặn
  const diffFromExpected = Math.abs(monthsDiff - expectedMonths);
  
  if (diffFromExpected <= 0.2) { // Sai số nhỏ - OK
    return { 
      isValid: true, 
      message: `Khoảng ngày phù hợp với chu kỳ thanh toán ${cycleName}` 
    };
  } else if (diffFromExpected <= 1.0) { // Sai lệch trung bình - Cảnh báo
    return { 
      isValid: true, 
      isWarning: true,
      message: `Cảnh báo: Khoảng ngày sai lệch với chu kỳ thanh toán ${cycleName} (dự kiến ${expectedMonths} tháng, thực tế ${monthsDiff.toFixed(1)} tháng). Backend sẽ kiểm tra và quyết định.` 
    };
  } else { // Sai lệch lớn - Cảnh báo mạnh nhưng vẫn cho phép
    return { 
      isValid: true,
      isWarning: true, 
      message: `Cảnh báo nghiêm trọng: Khoảng ngày sai lệch lớn với chu kỳ thanh toán ${cycleName} (dự kiến ${expectedMonths} tháng, thực tế ${monthsDiff.toFixed(1)} tháng). Hệ thống có thể từ chối tạo hóa đơn.` 
    };
  }
}

export default function LandlordBillCreatePage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedContract, setSelectedContract] = useState(null);
  const [billType, setBillType] = useState("SERVICE");
  const [periodType, setPeriodType] = useState("1m");
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [billPeriods, setBillPeriods] = useState([]);
  const [selectedBillPeriod, setSelectedBillPeriod] = useState(null);
  const [existingBills, setExistingBills] = useState([]);
  const [availablePeriodOptions, setAvailablePeriodOptions] = useState([]);
  const [customPeriodValidation, setCustomPeriodValidation] = useState(null);
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
      message.error("Không thể tải danh sách phòng");
    }
  };

  const fetchContracts = async () => {
    try {
      const allContracts = await fetchAllContractsAuto();
      setContracts((allContracts || []).filter(c => c.contractStatus === 'ACTIVE'));
    } catch (err) {
      message.error("Không thể tải danh sách hợp đồng");
    }
  };

  const fetchBillsForContract = async (contractId) => {
    // Gọi API lấy danh sách hóa đơn của hợp đồng này (nếu có endpoint)
    // const bills = await getBillsByContractId(contractId);
    // setExistingBills(bills);
    // Nếu chưa có API, tạm thời để rỗng
    setExistingBills([]);
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      let result;
      
      if (billType === "CUSTOM") {
        const [from, to] = values.customDateRange || [];
        if (selectedContract) {
          const contractStart = dayjs(selectedContract.contractStartDate);
          const contractEnd = dayjs(selectedContract.contractEndDate);
          if (from && (from.isBefore(contractStart) || from.isAfter(contractEnd))) {
            message.error("Ngày bắt đầu hóa đơn phải nằm trong phạm vi hợp đồng!");
            setLoading(false);
            return;
          }
          if (to && (to.isBefore(contractStart) || to.isAfter(contractEnd))) {
            message.error("Ngày kết thúc hóa đơn phải nằm trong phạm vi hợp đồng!");
            setLoading(false);
            return;
          }
          if (from && to && from.isAfter(to)) {
            message.error("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc!");
            setLoading(false);
            return;
          }
        }
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
        message.success("Tạo hóa đơn tùy chỉnh thành công");
        navigate("/landlord/bills");
        setLoading(false);
        return;
      } else if (billType === "SERVICE") {
        const month = values.month.month() + 1;
        const year = values.month.year();
        result = await createBill({
          roomId: values.roomId,
          month: month,
          year: year
        });
        message.success("Tạo hóa đơn dịch vụ thành công");
        navigate("/landlord/bills");
        setLoading(false);
        return;
      } else if (billType === "CONTRACT_TOTAL" || billType === "CONTRACT_ROOM_RENT") {
        console.log("🎯 FRONTEND: Processing CONTRACT bill type:", billType);
        console.log("🎯 FRONTEND: periodType =", periodType);
        console.log("🎯 FRONTEND: selectedBillPeriod =", selectedBillPeriod);
        
        let periods = [];
        // 🔧 FIX: Ưu tiên custom period trước selectedBillPeriod
        if (selectedContract && periodType === 'custom' && values.dateRange && values.dateRange.length === 2) {
          console.log("🎯 FRONTEND: Using CUSTOM date range");
          const [from, to] = values.dateRange;
          console.log("🎯 FRONTEND: Custom dates:", from.format('YYYY-MM-DD'), "to", to.format('YYYY-MM-DD'));
          console.log("🎯 FRONTEND: Contract cycle:", selectedContract.paymentCycle);
          
          const contractStart = dayjs(selectedContract.contractStartDate);
          const contractEnd = dayjs(selectedContract.contractEndDate);
          if (from.isBefore(contractStart) || to.isAfter(contractEnd)) {
            message.error("Kỳ hóa đơn phải nằm trong phạm vi hợp đồng!");
            setLoading(false);
            return;
          }
          if (from.isAfter(to)) {
            message.error("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc!");
            setLoading(false);
            return;
          }
          
          // Kiểm tra tính phù hợp với chu kỳ thanh toán - Chỉ cảnh báo, không chặn
          const validationResult = validateCustomPeriod(from, to, selectedContract.paymentCycle);
          console.log("🎯 FRONTEND: Validation result:", validationResult);
          if (validationResult.isWarning) {
            message.warning(validationResult.message);
          } else if (validationResult.isValid) {
            message.success(validationResult.message);
          }
          // Không chặn, để backend xử lý validation cuối cùng
          
          periods = [{
            fromDate: from.format('YYYY-MM-DD'),
            toDate: to.format('YYYY-MM-DD')
          }];
        } else if (selectedContract && billPeriods.length > 0 && selectedBillPeriod) {
          console.log("🎯 FRONTEND: Using STANDARD bill period");
          const period = billPeriods.find(p => p.fromDate.format('YYYY-MM-DD') === selectedBillPeriod);
          if (period) {
            // Kiểm tra lại kỳ hóa đơn có hợp lệ không
            const contractStart = dayjs(selectedContract.contractStartDate);
            const contractEnd = dayjs(selectedContract.contractEndDate);
            if (period.fromDate.isBefore(contractStart) || period.toDate.isAfter(contractEnd)) {
              message.error("Kỳ hóa đơn phải nằm trong phạm vi hợp đồng!");
              setLoading(false);
              return;
            }
            periods = [{
              fromDate: period.fromDate.format('YYYY-MM-DD'),
              toDate: period.toDate.format('YYYY-MM-DD')
            }];
          }
        }
        if (periods.length === 0) {
          message.error("Vui lòng chọn kỳ hóa đơn hoặc khoảng ngày!");
          setLoading(false);
          return;
        }
        
        console.log("🎯 FRONTEND: Total periods to process:", periods.length);
        for (const period of periods) {
          console.log("🎯 FRONTEND: Calling generateBill with:", {
            contractId: values.contractId,
            fromDate: period.fromDate,
            toDate: period.toDate,
            billType: billType
          });
          
          await generateBill(
            values.contractId,
            period.fromDate,
            period.toDate,
            billType
          );
        }
        message.success("Tạo hóa đơn thành công");
        navigate("/landlord/bills");
        setLoading(false);
        return;
      }
      
      message.success("Tạo hóa đơn thành công");
      navigate("/landlord/bills");
    } catch (err) {
      const errorMsg = err?.response?.data?.message || "Tạo hóa đơn thất bại";
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
    setCustomPeriodValidation(null);
    fetchBillsForContract(contractId);
    if (contract) {
      const periodOptions = getPeriodOptions(contract.paymentCycle);
      setAvailablePeriodOptions(periodOptions);
      setPeriodType(periodOptions[0]?.value || 'custom');
      let periods = [];
      let current = dayjs(contract.contractStartDate);
      let idx = 1;
      const contractEnd = dayjs(contract.contractEndDate);
      let monthsPerBill = periodOptions[0]?.months || 1;
      while (current.isBefore(contractEnd)) {
        let to = current.clone().add(monthsPerBill, 'month').subtract(1, 'day');
        if (to.isAfter(contractEnd)) to = contractEnd.clone();
        // Kiểm tra nếu đã có bill cho kỳ này thì disable
        const isDisabled = existingBills.some(bill => {
          const from = dayjs(bill.fromDate).format('YYYY-MM-DD');
          const toD = dayjs(bill.toDate).format('YYYY-MM-DD');
          return from === current.format('YYYY-MM-DD') && toD === to.format('YYYY-MM-DD');
        });
        periods.push({
          label: `Kỳ ${idx}: ${current.format('DD/MM/YYYY')} - ${to.format('DD/MM/YYYY')}`,
          fromDate: current.clone(),
          toDate: to.clone(),
          disabled: isDisabled
        });
        if (to.isSame(contractEnd, 'day')) break;
        current = to.add(1, 'day');
        idx++;
        if (current.isAfter(contractEnd)) break;
      }
      setBillPeriods(periods);
      const firstAvailable = periods.find(p => !p.disabled);
      setSelectedBillPeriod(firstAvailable ? firstAvailable.fromDate.format('YYYY-MM-DD') : null);
    } else {
      setBillPeriods([]);
      setSelectedBillPeriod(null);
      setAvailablePeriodOptions([]);
    }
  };

  // Sửa lỗi nhảy form: reset các trường phụ thuộc khi đổi billType
  const handleBillTypeChange = (value) => {
    setBillType(value);
    form.resetFields(["roomId", "month", "contractId", "dateRange"]);
    setSelectedRoom(null);
    setSelectedContract(null);
  };

  const handlePeriodTypeChange = (e) => {
    const newPeriodType = e.target.value;
    setPeriodType(newPeriodType);
    form.setFieldsValue({ months: undefined, dateRange: undefined });
    setSelectedMonths([]);
    setCustomPeriodValidation(null);
    
    // 🔧 FIX: Reset selectedBillPeriod khi chọn "custom"
    if (newPeriodType === 'custom') {
      setSelectedBillPeriod(null);
      console.log("🎯 FRONTEND: Reset selectedBillPeriod for custom period");
    }
  };

  const handleCustomDateRangeChange = (dates) => {
    setCustomPeriodValidation(null);
    if (dates && dates.length === 2 && selectedContract) {
      const [from, to] = dates;
      const validationResult = validateCustomPeriod(from, to, selectedContract.paymentCycle);
      setCustomPeriodValidation(validationResult);
    }
  };

  const handleMonthChange = (date) => {
    if (!date) {
      setSelectedMonths([]);
      return;
    }
    let months = [];
    if (periodType === "1m") {
      months = [date];
    } else if (periodType === "3m") {
      months = [date, date.clone().add(1, 'month'), date.clone().add(2, 'month')];
    } else if (periodType === "6m") {
      months = [date];
      for (let i = 1; i < 6; i++) {
        months.push(date.clone().add(i, 'month'));
      }
    }
    setSelectedMonths(months);
    form.setFieldsValue({ months: months });
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
          <PageHeader title="Tạo hóa đơn" />
          <Divider />
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
          >
            <Form.Item 
              name="billType" 
              label="Loại hóa đơn" 
              rules={[{ required: true, message: 'Vui lòng chọn loại hóa đơn' }]}
            >
              <Select 
                value={billType}
                onChange={handleBillTypeChange}
                placeholder="Chọn loại hóa đơn"
              >
                <Option value="SERVICE">Hóa đơn dịch vụ</Option>
                <Option value="CONTRACT_TOTAL">Hóa đơn tổng hợp (Phòng + dịch vụ)</Option>
                <Option value="CONTRACT_ROOM_RENT">Hóa đơn tiền phòng</Option>
                <Option value="CUSTOM">Hóa đơn tùy chỉnh</Option>
              </Select>
            </Form.Item>

            {billType === "SERVICE" && (
              <>
                <Form.Item 
                  name="roomId" 
                  label="Phòng" 
                  rules={[{ required: true, message: 'Vui lòng chọn phòng' }]}
                >
                  <Select 
                    placeholder="Chọn phòng"
                    onChange={handleRoomChange}
                    showSearch
                    filterOption={(input, option) =>
                      String(option.children).toLowerCase().indexOf(input.toLowerCase()) >= 0
                    }
                  >
                    {rooms.map(room => (
                      <Option
                        key={room.id}
                        value={room.id}
                        disabled={!room.hasActiveContract}
                      >
                        {room.roomNumber} - {room.building || 'Không xác định'}
                        {!room.hasActiveContract ? ' (Không có hợp đồng)' : ''}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item 
                  name="month" 
                  label="Tháng/Năm" 
                  rules={[{ required: true, message: 'Vui lòng chọn tháng' }]}
                >
                  <DatePicker 
                    picker="month" 
                    placeholder="Chọn tháng"
                    style={{ width: '100%' }}
                    disabledDate={date => date && date.endOf('month').isBefore(dayjs().startOf('month'))}
                  />
                </Form.Item>
              </>
            )}

            {(billType === "CONTRACT_TOTAL" || billType === "CONTRACT_ROOM_RENT") && (
              <>
                <Form.Item 
                  name="contractId" 
                  label="Hợp đồng" 
                  rules={[{ required: true, message: 'Vui lòng chọn hợp đồng' }]}
                >
                  <Select 
                    placeholder="Chọn hợp đồng"
                    onChange={handleContractChange}
                    showSearch
                    filterOption={(input, option) =>
                      String(option.children).toLowerCase().indexOf(input.toLowerCase()) >= 0
                    }
                  >
                    {contracts.map(contract => (
                      <Option key={contract.id} value={contract.id}>
                        Hợp đồng #{contract.id} - Phòng {contract.roomNumber}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.Item label="Kỳ hóa đơn">
                  <Radio.Group onChange={handlePeriodTypeChange} value={periodType}>
                    {availablePeriodOptions.map(opt => (
                      <Radio key={opt.value} value={opt.value}>{opt.label}</Radio>
                    ))}
                    <Radio value="custom">Tùy chọn</Radio>
                  </Radio.Group>
                </Form.Item>
                {periodType === "custom" && (
                  <>
                    {selectedContract && (
                      <Alert
                        message={`Chu kỳ thanh toán hợp đồng: ${
                          selectedContract.paymentCycle === 'MONTHLY' ? 'Hàng tháng (1 tháng)' :
                          selectedContract.paymentCycle === 'QUARTERLY' ? 'Hàng quý (3 tháng)' :
                          selectedContract.paymentCycle === 'YEARLY' ? 'Hàng năm (12 tháng)' : 'Không xác định'
                        }`}
                        description="Khoảng ngày tùy chọn nên phù hợp với chu kỳ thanh toán để đảm bảo tính nhất quán"
                        type="info"
                        showIcon
                        style={{ marginBottom: 16 }}
                      />
                    )}
                    <Form.Item 
                      name="dateRange" 
                      label="Khoảng ngày (Tùy chọn)"
                      rules={[{ required: true, message: 'Chọn khoảng ngày' }]}
                    >
                      <RangePicker 
                        style={{ width: '100%' }}
                        placeholder={['Ngày bắt đầu', 'Ngày kết thúc']}
                        onChange={handleCustomDateRangeChange}
                      />
                    </Form.Item>
                    {customPeriodValidation && (
                      <Alert
                        message={customPeriodValidation.message}
                        type={customPeriodValidation.isValid ? (customPeriodValidation.isWarning ? "warning" : "success") : "error"}
                        showIcon
                        style={{ marginBottom: 16 }}
                      />
                    )}
                  </>
                )}
                {(billType !== "CUSTOM" && periodType !== "custom" && selectedContract && billPeriods.length > 0) && (
                  <Form.Item label="Chọn kỳ hóa đơn" required>
                    <Radio.Group
                      value={selectedBillPeriod}
                      onChange={e => setSelectedBillPeriod(e.target.value)}
                    >
                      {billPeriods.map(period => (
                        <Radio key={period.fromDate.format('YYYY-MM-DD')} value={period.fromDate.format('YYYY-MM-DD')} disabled={period.disabled}>
                          {period.label} {period.disabled ? '(Đã có hóa đơn)' : ''}
                        </Radio>
                      ))}
                    </Radio.Group>
                  </Form.Item>
                )}
              </>
            )}

            {billType === "CUSTOM" && (
              <>
                <Form.Item
                  name="roomId"
                  label="Phòng"
                  rules={[{ required: true, message: 'Vui lòng chọn phòng' }]}
                >
                  <Select
                    placeholder="Chọn phòng"
                    showSearch
                    filterOption={(input, option) =>
                      String(option.children).toLowerCase().indexOf(input.toLowerCase()) >= 0
                    }
                  >
                    {rooms.map(room => (
                      <Option
                        key={room.id}
                        value={room.id}
                        disabled={!room.hasActiveContract}
                      >
                        {room.roomNumber} - {room.building || 'Không xác định'}
                        {!room.hasActiveContract ? ' (Không có hợp đồng)' : ''}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.Item
                  name="customName"
                  label="Tên hóa đơn"
                  rules={[{ required: true, message: 'Vui lòng nhập tên hóa đơn' }]}
                >
                  <Input placeholder="Nhập tên hóa đơn (VD: Điện tháng 6, Phí vệ sinh...)" />
                </Form.Item>
                <Form.Item
                  name="customDescription"
                  label="Mô tả"
                >
                  <Input.TextArea placeholder="Nhập mô tả (không bắt buộc)" />
                </Form.Item>
                <Form.Item
                  name="customAmount"
                  label="Số tiền"
                  rules={[{ required: true, message: 'Vui lòng nhập số tiền' }]}
                >
                  <InputNumber min={0} style={{ width: "100%" }} placeholder="Nhập số tiền (VND)" />
                </Form.Item>
                <Form.Item
                  name="customDateRange"
                  label="Khoảng ngày"
                  rules={[{ required: true, message: 'Vui lòng chọn khoảng ngày' }]}
                >
                  <RangePicker style={{ width: '100%' }} placeholder={["Ngày bắt đầu", "Ngày kết thúc"]} />
                </Form.Item>
              </>
            )}

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" loading={loading}>
                  Tạo hóa đơn
                </Button>
                <Button onClick={() => navigate("/landlord/bills")}>Hủy</Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </div>
  );
} 