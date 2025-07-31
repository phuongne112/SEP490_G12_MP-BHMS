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
  Alert,
  Modal,
  Form,
  DatePicker,
  InputNumber,
  Radio,
  Divider,
} from "antd";
import {
  PlusOutlined,
  FilterOutlined,
  SearchOutlined,
  EyeOutlined,
  DeleteOutlined,
  DownloadOutlined,
  SendOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import LandlordSidebar from "../../components/layout/LandlordSidebar";
import PageHeader from "../../components/common/PageHeader";
import {
  getAllBills,
  deleteBill,
  exportBillPdf,
  sendBillToRenter,
  bulkGenerateBills,
  updateBillPaymentStatus,
  createLatePenaltyBill,
  checkAndCreateLatePenalties,
  getOverdueBills,
  runLatePenaltyCheck,
  createBill,
  generateBill,
  createCustomBill,
} from "../../services/billApi";
import { getAllRooms } from "../../services/roomService";
import { getAllContracts } from "../../services/contractApi";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import axiosClient from '../../services/axiosClient';
import { useMediaQuery } from "react-responsive";
dayjs.extend(customParseFormat);

const { Sider, Content } = Layout;
const { Option } = Select;
const { RangePicker } = DatePicker;

function BillFilterPopover({ onFilter }) {
  const [status, setStatus] = useState();
  const [minPrice, setMinPrice] = useState();
  const [maxPrice, setMaxPrice] = useState();
  const [roomId, setRoomId] = useState();
  const [overdueFilter, setOverdueFilter] = useState();
  
  const handleApply = () => {
    const roomIdNumber = roomId && !isNaN(roomId) ? Number(roomId) : undefined;
    onFilter({ status, minPrice, maxPrice, roomId: roomIdNumber, overdue: overdueFilter });
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
      <div style={{ marginBottom: 8 }}>Tình trạng quá hạn</div>
      <Select
        allowClear
        style={{ width: "100%", marginBottom: 12 }}
        placeholder="Tất cả"
        value={overdueFilter}
        onChange={setOverdueFilter}
        options={[
          { label: "Quá hạn", value: true },
          { label: "Chưa quá hạn", value: false },
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
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const isTablet = useMediaQuery({ minWidth: 769, maxWidth: 1024 });
  
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [filterOpen, setFilterOpen] = useState(false);
  const [emailLoading, setEmailLoading] = useState({});
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkPenaltyLoading, setBulkPenaltyLoading] = useState(false);
  const [sentEmailsToday, setSentEmailsToday] = useState(new Set());
  const [autoRefresh, setAutoRefresh] = useState(true); // Tự động refresh
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 giây
  const [overdueBills, setOverdueBills] = useState([]);
  const [overdueModalVisible, setOverdueModalVisible] = useState(false);
  const [penaltyLoading, setPenaltyLoading] = useState({});
  const [createBillModalVisible, setCreateBillModalVisible] = useState(false);
  const [generateBillModalVisible, setGenerateBillModalVisible] = useState(false);
  const [customBillModalVisible, setCustomBillModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [billType, setBillType] = useState('REGULAR');
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [totalAmount, setTotalAmount] = useState(0);
  const [roomId, setRoomId] = useState(null);
  const [contractId, setContractId] = useState(null);
  const [billId, setBillId] = useState(null);
  
  // State cho modal tạo hóa đơn
  const [createBillForm] = Form.useForm();
  const [createBillLoading, setCreateBillLoading] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedContract, setSelectedContract] = useState(null);
  const [createBillType, setCreateBillType] = useState("SERVICE");
  const [periodType, setPeriodType] = useState("1m");
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [billPeriods, setBillPeriods] = useState([]);
  const [selectedBillPeriod, setSelectedBillPeriod] = useState(null);
  const [existingBills, setExistingBills] = useState([]);
  const [availablePeriodOptions, setAvailablePeriodOptions] = useState([]);
  const [customPeriodValidation, setCustomPeriodValidation] = useState(null);

  const navigate = useNavigate();

  // Kiểm tra hóa đơn quá hạn (từ ngày thứ 7 trở đi)
  const checkOverdue = (bill) => {
    if (bill.status) return false; // Đã thanh toán thì không quá hạn
    
    const today = dayjs();
    
    // Parse dueDate nếu có
    let dueDate = null;
    if (bill.dueDate) {
      dueDate = dayjs(bill.dueDate, "YYYY-MM-DD HH:mm:ss A");
    }
    
    // Parse toDate nếu có
    let toDate = null;
    if (bill.toDate) {
      toDate = dayjs(bill.toDate, "YYYY-MM-DD HH:mm:ss A");
    }
    
    // Logic mới: toDate + 7 ngày là hạn thanh toán (ngày thứ 7)
    const actualDueDate = dueDate || (toDate ? toDate.add(7, 'day') : null);
    
    return actualDueDate && today.isAfter(actualDueDate, 'day');
  };

  // Tính số ngày quá hạn
  const getOverdueDays = (bill) => {
    if (bill.status) return 0;
    
    const today = dayjs();
    
    // Parse dueDate nếu có
    let dueDate = null;
    if (bill.dueDate) {
      dueDate = dayjs(bill.dueDate, "YYYY-MM-DD HH:mm:ss A");
    }
    
    // Parse toDate nếu có
    let toDate = null;
    if (bill.toDate) {
      toDate = dayjs(bill.toDate, "YYYY-MM-DD HH:mm:ss A");
    }
    
    const actualDueDate = dueDate || (toDate ? toDate.add(7, 'day') : null);
    
    if (actualDueDate && today.isAfter(actualDueDate, 'day')) {
      return today.diff(actualDueDate, 'day');
    }
    return 0;
  };

  // Xử lý tạo phạt cho hóa đơn quá hạn
  const handleCreatePenalty = async (bill) => {
    setPenaltyLoading(prev => ({ ...prev, [bill.id]: true }));
    try {
      const response = await createLatePenaltyBill(bill.id);
      if (response.success) {
        message.success(`Đã tạo hóa đơn phạt cho hóa đơn #${bill.id}`);
        fetchBills(); // Refresh danh sách
      } else {
        message.error(response.message || "Không thể tạo hóa đơn phạt");
      }
    } catch (error) {
      message.error("Lỗi khi tạo hóa đơn phạt: " + (error.response?.data?.message || error.message));
    } finally {
      setPenaltyLoading(prev => ({ ...prev, [bill.id]: false }));
    }
  };

  // Xử lý hóa đơn quá hạn - Gửi email cảnh báo (ngày thứ 7)
  const handleOverdueBill = async (bill) => {
    // Set loading state
    setEmailLoading(prev => ({ ...prev, [bill.id]: true }));
    
    try {
      // Kiểm tra xem đã gửi hôm nay chưa
      if (isEmailSentToday(bill.id)) {
        message.warning(`Đã gửi email cho hóa đơn #${bill.id} hôm nay rồi`);
        return;
      }

      // Gửi cảnh báo quá hạn (ngày thứ 7)
      await sendBillToRenter(bill.id);
      message.success(`Đã gửi email cảnh báo cho hóa đơn #${bill.id} (ngày thứ 7)`);
      
      // Đánh dấu đã gửi hôm nay
      markEmailSentToday(bill.id);
      
      // Cập nhật danh sách
      fetchBills();
    } catch (error) {
      message.error("Không thể gửi email cảnh báo: " + (error.response?.data?.message || error.message));
    } finally {
      // Clear loading state
      setEmailLoading(prev => ({ ...prev, [bill.id]: false }));
    }
  };

  // Xử lý hàng loạt hóa đơn quá hạn - Gửi cảnh báo cho hóa đơn từ ngày thứ 7
  const handleBulkOverdue = async () => {
    setBulkPenaltyLoading(true);
    try {
      // Gửi cảnh báo cho tất cả hóa đơn quá hạn (từ ngày thứ 7)
      let successCount = 0;
      for (const bill of overdueBills) {
        try {
          await sendBillToRenter(bill.id);
          successCount++;
        } catch (error) {
          console.error(`Lỗi gửi cảnh báo cho hóa đơn #${bill.id}:`, error);
        }
      }
      
      if (successCount > 0) {
        message.success(`✅ Đã gửi cảnh báo cho ${successCount}/${overdueBills.length} hóa đơn quá hạn (từ ngày thứ 7)`);
      } else {
        message.warning("⚠️ Không thể gửi cảnh báo cho hóa đơn nào");
      }
      
      // Refresh danh sách
      fetchBills();
    } catch (error) {
      message.error("❌ Lỗi khi xử lý hàng loạt: " + (error.response?.data?.message || error.message));
    } finally {
      setBulkPenaltyLoading(false);
    }
  };

  // Check if a bill was sent today
  const isEmailSentToday = (billId) => {
    const today = new Date().toDateString();
    const key = `${billId}-${today}`;
    return sentEmailsToday.has(key);
  };

  // Mark a bill as sent today and save to localStorage
  const markEmailSentToday = (billId) => {
    const today = new Date().toDateString();
    const key = `${billId}-${today}`;
    const newSet = new Set([...sentEmailsToday, key]);
    setSentEmailsToday(newSet);
    
    // Save to localStorage
    localStorage.setItem('sentEmailsToday', JSON.stringify({
      date: today,
      bills: Array.from(newSet)
    }));
  };

  // Load sent emails from localStorage
  const loadSentEmailsFromStorage = () => {
    const saved = localStorage.getItem('sentEmailsToday');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        const today = new Date().toDateString();
        if (data.date === today) {
          setSentEmailsToday(new Set(data.bills));
        } else {
          // Clear old data if it's not today
          setSentEmailsToday(new Set());
          localStorage.removeItem('sentEmailsToday');
        }
      } catch (error) {
        console.error('Error loading sent emails:', error);
        setSentEmailsToday(new Set());
      }
    }
  };

  // Load sent emails from localStorage on mount
  useEffect(() => {
    loadSentEmailsFromStorage();
  }, []);

  const fetchBills = async (page = currentPage, size = pageSize) => {
    setLoading(true);
    try {
      // Load sent emails state before fetching bills
      loadSentEmailsFromStorage();
      
      const params = {
        page: page - 1,
        size,
        search: search.trim() || undefined,
        ...filter,
      };

      const response = await getAllBills(params);
      const billsData = response.content || response.result || [];
      
      // Xử lý hóa đơn quá hạn
      const processedBills = billsData.map(bill => ({
        ...bill,
        isOverdue: checkOverdue(bill),
        overdueDays: getOverdueDays(bill)
      }));
      
      setBills(processedBills);
      setTotal(response.totalElements || response.meta?.total || 0);
      
      // Cập nhật danh sách hóa đơn quá hạn
      const overdueBillsList = processedBills.filter(bill => bill.isOverdue);
      setOverdueBills(overdueBillsList);
      
    } catch (error) {
      console.error("Error fetching bills:", error);
      message.error("Không thể tải danh sách hóa đơn");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills(currentPage, pageSize);
    // eslint-disable-next-line
  }, [search, filter, currentPage, pageSize]);

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

  // Auto refresh effect
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      fetchBills();
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, currentPage, pageSize, search, filter]);

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
      message.success("Xuất hóa đơn thành công");
    } catch (err) {
      message.error("Xuất hóa đơn thất bại");
    }
  };

  const handleSend = async (id) => {
    try {
      await sendBillToRenter(id);
      message.success("Gửi hóa đơn cho người thuê thành công");
    } catch (err) {
      message.error("Gửi thất bại");
    }
  };

  const handleSendEmail = async (id) => {
    // Check if email was already sent today
    if (isEmailSentToday(id)) {
      message.warning("Hóa đơn này đã được gửi email hôm nay!");
      return;
    }

    setEmailLoading(prev => ({ ...prev, [id]: true }));
    try {
      await axiosClient.post(`/bills/send-email/${id}`);
      message.success("Đã gửi hóa đơn qua email thành công!");
      // Mark as sent today after successful sending
      markEmailSentToday(id);
    } catch (err) {
      message.error("Gửi email thất bại!");
    } finally {
      setEmailLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleFilter = (newFilter) => {
    setFilter(newFilter);
    setCurrentPage(1);
    setFilterOpen(false);
  };

  const handleBulkGenerate = async () => {
    setBulkLoading(true);
    try {
      const result = await bulkGenerateBills();
      // API trả về object với format: { success: true, count: number, generatedBills: array }
      const count = result && result.count ? result.count : 0;
      message.success("Đã tạo " + count + " hóa đơn tự động!");
      fetchBills();
    } catch (error) {
      message.error("Có lỗi xảy ra khi tạo hóa đơn tự động");
    } finally {
      setBulkLoading(false);
    }
  };
  
  // Chạy job kiểm tra và tạo phạt tự động (chỉ tạo phạt từ ngày thứ 8 trở đi)
  const handleRunLatePenaltyCheck = async () => {
    try {
      const result = await runLatePenaltyCheck();
      message.success(result);
      fetchBills(); // Refresh danh sách
    } catch (error) {
      message.error("Có lỗi xảy ra khi chạy job kiểm tra phạt: " + error.message);
    }
  };

  // Functions cho modal tạo hóa đơn
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

  const handleCreateBillModalOpen = () => {
    setCreateBillModalVisible(true);
    fetchRooms();
    fetchContracts();
  };

  const handleCreateBillModalClose = () => {
    setCreateBillModalVisible(false);
    createBillForm.resetFields();
    setSelectedRoom(null);
    setSelectedContract(null);
    setCreateBillType("SERVICE");
    setPeriodType("1m");
    setSelectedMonths([]);
    setBillPeriods([]);
    setSelectedBillPeriod(null);
    setExistingBills([]);
    setAvailablePeriodOptions([]);
    setCustomPeriodValidation(null);
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

  const handleBillTypeChange = (value) => {
    setCreateBillType(value);
    createBillForm.resetFields(["roomId", "month", "contractId", "dateRange"]);
    setSelectedRoom(null);
    setSelectedContract(null);
  };

  const handlePeriodTypeChange = (e) => {
    const newPeriodType = e.target.value;
    setPeriodType(newPeriodType);
    createBillForm.setFieldsValue({ months: undefined, dateRange: undefined });
    setSelectedMonths([]);
    setCustomPeriodValidation(null);
    
    if (newPeriodType === 'custom') {
      setSelectedBillPeriod(null);
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

  const handleCreateBillSubmit = async (values) => {
    setCreateBillLoading(true);
    try {
      let result;
      
      if (createBillType === "CUSTOM") {
        const [from, to] = values.customDateRange || [];
        if (selectedContract) {
          const contractStart = dayjs(selectedContract.contractStartDate);
          const contractEnd = dayjs(selectedContract.contractEndDate);
          if (from && (from.isBefore(contractStart) || from.isAfter(contractEnd))) {
            message.error("Ngày bắt đầu hóa đơn phải nằm trong phạm vi hợp đồng!");
            setCreateBillLoading(false);
            return;
          }
          if (to && (to.isBefore(contractStart) || to.isAfter(contractEnd))) {
            message.error("Ngày kết thúc hóa đơn phải nằm trong phạm vi hợp đồng!");
            setCreateBillLoading(false);
            return;
          }
          if (from && to && from.isAfter(to)) {
            message.error("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc!");
            setCreateBillLoading(false);
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
        handleCreateBillModalClose();
        fetchBills();
        setCreateBillLoading(false);
        return;
      } else if (createBillType === "SERVICE") {
        const month = values.month.month() + 1;
        const year = values.month.year();
        result = await createBill({
          roomId: values.roomId,
          month: month,
          year: year
        });
        message.success("Tạo hóa đơn dịch vụ thành công");
        handleCreateBillModalClose();
        fetchBills();
        setCreateBillLoading(false);
        return;
      } else if (createBillType === "CONTRACT_TOTAL" || createBillType === "CONTRACT_ROOM_RENT") {
        let periods = [];
        if (selectedContract && periodType === 'custom' && values.dateRange && values.dateRange.length === 2) {
          const [from, to] = values.dateRange;
          const contractStart = dayjs(selectedContract.contractStartDate);
          const contractEnd = dayjs(selectedContract.contractEndDate);
          if (from.isBefore(contractStart) || to.isAfter(contractEnd)) {
            message.error("Kỳ hóa đơn phải nằm trong phạm vi hợp đồng!");
            setCreateBillLoading(false);
            return;
          }
          if (from.isAfter(to)) {
            message.error("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc!");
            setCreateBillLoading(false);
            return;
          }
          
          const validationResult = validateCustomPeriod(from, to, selectedContract.paymentCycle);
          if (validationResult.isWarning) {
            message.warning(validationResult.message);
          } else if (validationResult.isValid) {
            message.success(validationResult.message);
          }
          
          periods = [{
            fromDate: from.format('YYYY-MM-DD'),
            toDate: to.format('YYYY-MM-DD')
          }];
        } else if (selectedContract && billPeriods.length > 0 && selectedBillPeriod) {
          const period = billPeriods.find(p => p.fromDate.format('YYYY-MM-DD') === selectedBillPeriod);
          if (period) {
            const contractStart = dayjs(selectedContract.contractStartDate);
            const contractEnd = dayjs(selectedContract.contractEndDate);
            if (period.fromDate.isBefore(contractStart) || period.toDate.isAfter(contractEnd)) {
              message.error("Kỳ hóa đơn phải nằm trong phạm vi hợp đồng!");
              setCreateBillLoading(false);
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
          setCreateBillLoading(false);
          return;
        }
        
        for (const period of periods) {
          await generateBill(
            values.contractId,
            period.fromDate,
            period.toDate,
            createBillType
          );
        }
        message.success("Tạo hóa đơn thành công");
        handleCreateBillModalClose();
        fetchBills();
        setCreateBillLoading(false);
        return;
      }
      
      message.success("Tạo hóa đơn thành công");
      handleCreateBillModalClose();
      fetchBills();
    } catch (err) {
      const errorMsg = err?.response?.data?.message || "Tạo hóa đơn thất bại";
      message.error(errorMsg);
    } finally {
      setCreateBillLoading(false);
    }
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
      width: isMobile ? 50 : 70,
      render: (_, __, index) => (currentPage - 1) * pageSize + index + 1,
    },
    { 
      title: "Mã hóa đơn", 
      dataIndex: "id", 
      align: "center", 
      width: isMobile ? 80 : 100,
      render: (id) => `#${id}`
    },
    { 
      title: "Phòng", 
      dataIndex: "roomNumber", 
      align: "center", 
      width: isMobile ? 80 : 120 
    },
    ...(isMobile ? [] : [
      { 
        title: "Mã hợp đồng", 
        dataIndex: "contractId", 
        align: "center", 
        width: 120,
        render: (contractId) => contractId ? `#${contractId}` : 'Không có'
      }
    ]),
    { 
      title: "Loại hóa đơn", 
      dataIndex: "billType", 
      align: "center", 
      width: isMobile ? 100 : 120,
      render: (billType) => {
        if (!billType) return <span style={{ color: '#888' }}>Không xác định</span>;
        if (
          billType === 'REGULAR' ||
          billType === 'ROOM_RENT' ||
          billType === 'CONTRACT_ROOM_RENT' ||
          billType.includes('ROOM_RENT')
        ) {
          return <Tag color="blue">Tiền phòng</Tag>;
        }
        if (
          billType === 'SERVICE' ||
          billType === 'CONTRACT_SERVICE' ||
          billType.includes('SERVICE')
        ) {
          return <Tag color="green">Dịch vụ</Tag>;
        }
        if (billType === 'DEPOSIT' || billType.includes('DEPOSIT')) {
          return <Tag color="purple">Đặt cọc</Tag>;
        }
        if (billType === 'CONTRACT_TOTAL') {
          return <Tag color="geekblue">Tổng hợp đồng</Tag>;
        }
        if (billType === 'LATE_PENALTY') {
          return <Tag color="volcano">Phạt quá hạn</Tag>;
        }
        return <Tag>{billType}</Tag>;
      }
    },
    ...(isMobile ? [] : [
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
      }
    ]),
    { 
      title: "Tổng tiền", 
      dataIndex: "totalAmount", 
      align: "center", 
      width: isMobile ? 100 : 140,
      render: (amount) => formatCurrency(amount)
    },
    {
      title: "Trạng thái",
      align: "center",
      width: isMobile ? 80 : 120,
      render: (_, record) => (
        <Tag color={record.status ? "green" : "red"}>
          {record.status ? "Đã thanh toán" : "Chưa thanh toán"}
        </Tag>
      ),
    },
    {
      title: "Quá hạn",
      align: "center",
      width: isMobile ? 80 : 120,
      render: (_, record) => (
        <Tag color={record.isOverdue ? "red" : "green"}>
          {record.isOverdue ? "Quá hạn" : "Chưa quá hạn"}
        </Tag>
      ),
    },
    {
      title: "Thao tác",
      align: "center",
      width: isMobile ? 200 : 320,
      render: (_, record) => {
        const isOverdue = record.isOverdue;
        const overdueDays = record.overdueDays;

        return (
          <div style={{ 
            display: 'flex', 
            gap: '4px', 
            flexWrap: 'nowrap', 
            justifyContent: 'flex-start',
            alignItems: 'center',
            minHeight: '32px'
          }}>
            {/* 1. Nút "Xem" - Luôn hiển thị */}
            <Button 
              type="primary" 
              icon={<EyeOutlined />}
              onClick={() => navigate(`/landlord/bills/${record.id}`)}
              size="small"
              style={{ minWidth: '60px' }}
            >
              Xem
            </Button>
            
            {/* 2. Nút "Xuất PDF" - Chỉ hiển thị trên desktop */}
            {!isMobile && (
              <Button 
                type="default"
                icon={<DownloadOutlined />}
                onClick={() => handleExport(record.id)}
                size="small"
                style={{ minWidth: '80px' }}
              >
                Xuất PDF
              </Button>
            )}
            
            {/* 3. Nút "Quá hạn/Gửi Email" - Nút thông minh tự động hóa */}
            <Popover
              content={
                isOverdue
                  ? overdueDays === 7 
                    ? `Gửi email cảnh báo hết hạn (ngày thứ 7) - 1 lần/ngày`
                    : overdueDays >= 8
                      ? `Hóa đơn quá hạn ${overdueDays} ngày - Tự động tạo phạt từ ngày thứ 8`
                      : `Gửi email cho hóa đơn quá hạn ${overdueDays} ngày (1 lần/ngày)`
                  : record.status
                    ? 'Chỉ gửi email cho hóa đơn chưa thanh toán'
                    : isEmailSentToday(record.id)
                      ? 'Đã gửi hôm nay'
                      : 'Gửi email hóa đơn'
              }
              placement="top"
            >
              <Button
                type={isOverdue ? "default" : "default"}
                icon={isOverdue ? <ClockCircleOutlined /> : <SendOutlined />}
                onClick={() => isOverdue ? handleOverdueBill(record) : handleSendEmail(record.id)}
                size="small"
                loading={emailLoading[record.id]}
                disabled={record.status === true || isEmailSentToday(record.id)}
                style={{ 
                  minWidth: '90px',
                  color: isOverdue ? '#ff4d4f' : undefined,
                  borderColor: isOverdue ? '#ff4d4f' : undefined
                }}
              >
                {isOverdue ? (overdueDays === 7 ? "Cảnh báo" : "Gửi email") : (isMobile ? "Email" : (isEmailSentToday(record.id) ? "Đã gửi hôm nay" : "Gửi email"))}
              </Button>
            </Popover>
            
                         {/* 4. Nút "Tạo phạt" - Ẩn hoàn toàn vì hệ thống tự động tạo phạt từ ngày thứ 8 */}
             {/* {isOverdue && overdueDays >= 8 && !record.status && record.billType !== 'LATE_PENALTY' && (
               <Popover
                 content={`Tạo hóa đơn phạt cho hóa đơn quá hạn ${overdueDays} ngày (từ ngày thứ 8)`}
                 placement="top"
               >
                 <Button 
                   type="default"
                   icon={<ExclamationCircleOutlined />}
                   onClick={() => handleCreatePenalty(record)}
                   size="small"
                   danger
                   loading={penaltyLoading[record.id]}
                   style={{ minWidth: '80px' }}
                 >
                   Tạo phạt
                 </Button>
               </Popover>
             )} */}
            
            {/* 6. Nút "Xóa" - Luôn hiển thị (cuối cùng) */}
            <Popconfirm
              title="Bạn có chắc chắn muốn xóa hóa đơn này?"
              okText="Có"
              cancelText="Không"
              onConfirm={() => handleDelete(record.id)}
            >
              <Button 
                icon={<DeleteOutlined />}
                type="primary"
                danger
                size="small"
                style={{ minWidth: '32px' }}
              />
            </Popconfirm>
          </div>
        );
      },
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh", flexDirection: isMobile ? "column" : "row" }}>
      {!isMobile && (
        <Sider width={220}>
          <LandlordSidebar />
        </Sider>
      )}
      <Layout>
        <Content style={{ padding: isMobile ? 16 : 24, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
          {/* Header Section */}
          <div style={{ 
            background: 'white', 
            padding: isMobile ? 16 : 20, 
            borderRadius: 8, 
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            marginBottom: 20
          }}>
            <div style={{ 
              display: "flex", 
              flexDirection: isMobile ? "column" : "row",
              justifyContent: "space-between", 
              alignItems: isMobile ? "stretch" : "center", 
              marginBottom: 12,
              gap: isMobile ? 12 : 0
            }}>
              <PageHeader title="Danh sách hóa đơn" style={{ margin: 0, padding: 0 }} />
              <div style={{ 
                display: 'flex', 
                flexDirection: isMobile ? "column" : "row",
                alignItems: 'center', 
                gap: 12,
                width: isMobile ? "100%" : "auto"
              }}>
                <Input
                  placeholder="Tìm hóa đơn..."
                  allowClear
                  prefix={<SearchOutlined />}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onPressEnter={() => setCurrentPage(1)}
                  style={{ width: isMobile ? "100%" : 300 }}
                />
                <Popover
                  open={filterOpen}
                  onOpenChange={setFilterOpen}
                  content={<BillFilterPopover onFilter={handleFilter} />}
                  trigger="click"
                  placement="bottomRight"
                >
                  <Button 
                    icon={<FilterOutlined />} 
                    type="default"
                    style={{ width: isMobile ? "100%" : "auto" }}
                  >
                    Bộ lọc
                  </Button>
                </Popover>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleCreateBillModalOpen}
                  style={{ width: isMobile ? "100%" : "auto" }}
                >
                  Thêm hóa đơn
                </Button>
                <Button
                  type="default"
                  style={{ 
                    background: '#52c41a', 
                    borderColor: '#52c41a', 
                    color: '#fff',
                    width: isMobile ? "100%" : "auto"
                  }}
                  loading={bulkLoading}
                  onClick={handleBulkGenerate}
                >
                  Tạo Hóa Đơn Tự Động
                </Button>
              </div>
            </div>
            
            {/* Status bar */}
            <div style={{ 
              display: 'flex', 
              flexDirection: isMobile ? "column" : "row",
              justifyContent: 'space-between', 
              alignItems: isMobile ? "stretch" : "center",
              borderTop: '1px solid #f0f0f0',
              paddingTop: 12,
              fontSize: isMobile ? 12 : 14,
              gap: isMobile ? 8 : 0
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8,
                color: '#666'
              }}>
                <span>Hiển thị</span>
                <Select
                  value={pageSize}
                  onChange={handlePageSizeChange}
                  style={{ width: 100 }}
                  options={[
                    { label: '5', value: 5 },
                    { label: '10', value: 10 },
                    { label: '20', value: 20 },
                    { label: '50', value: 50 }
                  ]}
                />
                <span>mục</span>
              </div>
              <div style={{ fontWeight: 500, color: "#1890ff" }}>
                Tổng: {total} hóa đơn
              </div>
            </div>
          </div>
          
          {/* Main Table Section */}
          <div style={{ 
            background: 'white', 
            borderRadius: 8, 
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            <Table
              columns={columns}
              dataSource={bills}
              loading={loading}
              rowKey="id"
              pagination={false}
              scroll={{ x: isMobile ? 600 : 1200 }}
              size={isMobile ? "small" : "middle"}
              bordered
            />
            
            <div
              style={{
                padding: isMobile ? 12 : 16,
                width: "100%",
                display: "flex",
                justifyContent: "flex-end",
                borderTop: '1px solid #f0f0f0'
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
                showQuickJumper={false}
                showTotal={!isMobile ? (total, range) => `${range[0]}-${range[1]} trên tổng số ${total} hóa đơn` : undefined}
                size={isMobile ? "small" : "default"}
              />
            </div>
          </div>

          {/* Modal tạo hóa đơn */}
          <Modal
            open={createBillModalVisible}
            title="Tạo hóa đơn mới"
            onCancel={handleCreateBillModalClose}
            footer={null}
            width={800}
            style={{ top: 20 }}
          >
            <Form
              form={createBillForm}
              layout="vertical"
              onFinish={handleCreateBillSubmit}
            >
              <Form.Item 
                name="billType" 
                label="Loại hóa đơn" 
                rules={[{ required: true, message: 'Vui lòng chọn loại hóa đơn' }]}
              >
                <Select 
                  value={createBillType}
                  onChange={handleBillTypeChange}
                  placeholder="Chọn loại hóa đơn"
                >
                  <Option value="SERVICE">Hóa đơn dịch vụ</Option>
                  <Option value="CONTRACT_TOTAL">Hóa đơn tổng hợp (Phòng + dịch vụ)</Option>
                  <Option value="CONTRACT_ROOM_RENT">Hóa đơn tiền phòng</Option>
                  <Option value="CUSTOM">Hóa đơn tùy chỉnh</Option>
                </Select>
              </Form.Item>

              {createBillType === "SERVICE" && (
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

              {(createBillType === "CONTRACT_TOTAL" || createBillType === "CONTRACT_ROOM_RENT") && (
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
                  {(createBillType !== "CUSTOM" && periodType !== "custom" && selectedContract && billPeriods.length > 0) && (
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

              {createBillType === "CUSTOM" && (
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
                  <Button type="primary" htmlType="submit" loading={createBillLoading}>
                    Tạo hóa đơn
                  </Button>
                  <Button onClick={handleCreateBillModalClose}>Hủy</Button>
                </Space>
              </Form.Item>
            </Form>
          </Modal>
        </Content>
      </Layout>
    </Layout>
  );
}