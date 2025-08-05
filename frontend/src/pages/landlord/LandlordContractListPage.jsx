import React, { useEffect, useState } from "react";
import { Layout, message, Button, Popover, Select, Modal, Input, DatePicker, List, Pagination, Tag, Drawer } from "antd";
import PageHeader from "../../components/common/PageHeader";
import { getAllContracts, deleteContract, exportContractPdf, buildContractFilterString } from "../../services/contractApi";
import { useSelector } from "react-redux";
import AdminSidebar from "../../components/layout/AdminSidebar";
import LandlordSidebar from "../../components/layout/LandlordSidebar";
import ContractTable from "../../components/landlord/ContractTable";
import ContractFilterPopover from "../../components/landlord/ContractFilterPopover";
import dayjs from "dayjs";
import { getAllRenters, getRentersForAssign, getAllRentersForAssignFull } from "../../services/renterApi";
import {
  renewContract,
  terminateContract,
  updateContract as updateRoomUserContract,
  getContractAmendments,
  getContractAmendmentsByStatus,
  processExpiredContracts,
  approveAmendment,
  requestTerminateContract,
  rejectAmendment
} from "../../services/roomUserApi";
import { getAllRooms } from "../../services/roomService";
import { FilterOutlined, ReloadOutlined, MenuOutlined } from "@ant-design/icons";
import { useMediaQuery } from "react-responsive";

const { Sider, Content } = Layout;

const paymentCycleOptions = [
  { value: "MONTHLY", label: "Hàng tháng" },
  { value: "QUARTERLY", label: "Hàng quý" },
  { value: "YEARLY", label: "Hàng năm" },
];

// Thêm hàm tự động lấy hết hợp đồng qua nhiều trang
async function fetchAllContractsAuto(filter = {}) {
  let page = 0;
  const size = 200;
  let allContracts = [];
  let hasMore = true;
  const filterString = buildContractFilterString(filter);
  
  while (hasMore) {
    const res = await getAllContracts({ page, size, filter: filterString });
    const contracts = res.result || [];
    allContracts = allContracts.concat(contracts);
    hasMore = contracts.length === size;
    page += 1;
  }
  return allContracts;
}

export default function LandlordContractListPage() {
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [filter, setFilter] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(isMobile ? 3 : 5);
  const [total, setTotal] = useState(0);
  const pageSizeOptions = isMobile ? [3, 5, 10] : [5, 10, 20, 50];
  const [sidebarDrawerOpen, setSidebarDrawerOpen] = useState(false);
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [renewDate, setRenewDate] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [updateContract, setUpdateContract] = useState(null);
  const [updateReason, setUpdateReason] = useState("");
  const [amendmentsModalOpen, setAmendmentsModalOpen] = useState(false);
  const [amendments, setAmendments] = useState([]);
  const [updateRentAmount, setUpdateRentAmount] = useState();
  const [updateDeposit, setUpdateDeposit] = useState();
  const [updateEndDate, setUpdateEndDate] = useState();
  const [updatePaymentCycle, setUpdatePaymentCycle] = useState();
  const [updateTerms, setUpdateTerms] = useState([]);
  const [updateRenters, setUpdateRenters] = useState([]);
  const [allRenters, setAllRenters] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState();
  const [filterPaymentCycle, setFilterPaymentCycle] = useState();
  const [filterDateRange, setFilterDateRange] = useState();
  const [filterRoomId, setFilterRoomId] = useState();
  const [roomContracts, setRoomContracts] = useState([]);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailContract, setDetailContract] = useState(null);
  const [terminateReason, setTerminateReason] = useState("");
  const [terminateModalOpen, setTerminateModalOpen] = useState(false);
  const [terminateContractId, setTerminateContractId] = useState(null);
  const [amendmentsPage, setAmendmentsPage] = useState(1);
  const amendmentsPageSize = 3;
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectLoading, setRejectLoading] = useState(false);
  const [currentAmendmentContractId, setCurrentAmendmentContractId] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [showAllAmendments, setShowAllAmendments] = useState(false);
  const [allAmendments, setAllAmendments] = useState([]); // Lưu tất cả amendments
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [previousContractIds, setPreviousContractIds] = useState(new Set());

  const user = useSelector((state) => state.account.user);

  const refreshData = async () => {
    await fetchRoomsAndLatestContracts(currentPage, pageSize);
    setLastUpdated(new Date());
  };

  // Detect new contracts and show notification
  useEffect(() => {
    const currentContractIds = new Set(roomContracts.map(room => room.latestContract?.id).filter(Boolean));
    
    if (previousContractIds.size > 0) {
      const newContractIds = [...currentContractIds].filter(id => !previousContractIds.has(id));
      
      if (newContractIds.length > 0) {
        message.success({
          content: `🔄 Đã phát hiện ${newContractIds.length} hợp đồng mới được tạo sau cập nhật!`,
          duration: 4,
        });
      }
    }
    
    setPreviousContractIds(currentContractIds);
  }, [roomContracts, previousContractIds]);

  const fetchRoomsAndLatestContracts = async (page = currentPage, size = pageSize) => {
    setLoading(true);
    try {
      const roomRes = await getAllRooms(page - 1, size);
      const roomsData = roomRes.result || [];
      
      // Lấy toàn bộ hợp đồng qua nhiều trang, truyền filter
      let allContracts = [];
      try {
        allContracts = await fetchAllContractsAuto(filter);
      } catch (contractError) {
        console.error("Error fetching contracts:", contractError);
        message.error("Không thể tải hợp đồng, nhưng đã tải phòng thành công");
        allContracts = [];
      }
      
      const data = roomsData.map(room => {
        const contractsOfRoom = allContracts.filter(c => {
          const contractRoomId = c.roomId || (c.room && c.room.id);
          return String(contractRoomId) === String(room.id);
        });
        
        // IMPORTANT: Luôn ưu tiên hợp đồng ACTIVE mới nhất
        let latestContract = null;
        
        // Tìm tất cả hợp đồng ACTIVE
        const activeContracts = contractsOfRoom.filter(c => c.contractStatus === 'ACTIVE');
        
        if (activeContracts.length > 0) {
          // Nếu có hợp đồng ACTIVE, lấy cái mới nhất (theo updatedDate/createdDate)
          latestContract = activeContracts
            .sort((a, b) => {
              const dateA = new Date(a.updatedDate || a.createdDate || 0);
              const dateB = new Date(b.updatedDate || b.createdDate || 0);
              return dateB - dateA;
            })[0];
        } else {
          // Nếu không có ACTIVE, lấy hợp đồng mới nhất bất kể trạng thái
          latestContract = contractsOfRoom
            .sort((a, b) => {
              const dateA = new Date(a.updatedDate || a.createdDate || 0);
              const dateB = new Date(b.updatedDate || b.createdDate || 0);
              return dateB - dateA;
            })[0] || null;
        }
        
        return {
          ...room,
          latestContract: latestContract ? { 
            ...latestContract, 
            roomId: room.id, 
            roomNumber: room.roomNumber,
            roomUsers: room.roomUsers // Include room users from room data
          } : null
        };
      })
      .filter(room => room.latestContract); // Chỉ hiển thị phòng có hợp đồng
      
      setRoomContracts(data);
      setTotal(roomRes.meta?.total || data.length);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Error in fetchRoomsAndLatestContracts:", err);
      message.error("Không thể tải phòng/hợp đồng");
    }
    setLoading(false);
  };

  useEffect(() => {
    refreshData();
    
    // Auto-refresh every 30 seconds to catch backend changes
    let interval = null;
    if (autoRefresh) {
      interval = setInterval(() => {
        refreshData();
      }, 30000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
    // eslint-disable-next-line
  }, [filter, currentPage, pageSize, selectedRoomId, autoRefresh]);

  const handleExport = async (id) => {
    try {
      const blob = await exportContractPdf(id);
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (err) {
      message.error("Xuất PDF thất bại");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteContract(id);
      message.success("Đã xóa hợp đồng");
      fetchRoomsAndLatestContracts();
    } catch {
      message.error("Xóa thất bại");
    }
  };

  const handleFilterApply = (values) => {
    const params = {};

    if (values.status && values.status !== "ALL") {
      params.contractStatus = values.status;
    }
    if (values.paymentCycle && values.paymentCycle !== "ALL") {
      params.paymentCycle = values.paymentCycle;
    }
    if (values.room && values.room !== "ALL") {
      params.roomId = values.room;
    }
    if (values.tenant && values.tenant !== "ALL") {
      params.tenantId = values.tenant;
    }
    if (values.contractNumber && values.contractNumber.trim()) {
      params.contractNumber = values.contractNumber;
    }
    if (values.dateRange && values.dateRange.length === 2) {
      params.contractStartDateFrom = values.dateRange[0]?.startOf("day").toISOString();
      params.contractStartDateTo = values.dateRange[1]?.endOf("day").toISOString();
    }
    if (values.depositMin !== undefined && values.depositMin !== null) {
      params.depositAmountFrom = values.depositMin;
    }
    if (values.depositMax !== undefined && values.depositMax !== null) {
      params.depositAmountTo = values.depositMax;
    }
    if (values.rentMin !== undefined && values.rentMin !== null) {
      params.rentAmountFrom = values.rentMin;
    }
    if (values.rentMax !== undefined && values.rentMax !== null) {
      params.rentAmountTo = values.rentMax;
    }

    setFilter(params);
    setFilterVisible(false);
  };

  const handleRenewContract = (contract) => {
    setSelectedContract(contract);
    setRenewDate(null);
    setRenewModalOpen(true);
  };

  const doRenewContract = async () => {
    if (!renewDate) {
      message.error("Chọn ngày gia hạn!");
      return;
    }
  
    if (!selectedContract || !selectedContract.id) {
      message.error("Không xác định được hợp đồng!");
      return;
    }
  
    setUpdating(true);
  
    try {
      const isoDate = dayjs(renewDate).endOf('day').toISOString();
      const reason = "Chủ nhà yêu cầu gia hạn hợp đồng";
      await renewContract(selectedContract.id, isoDate, reason);
  
      message.success("Đã gửi yêu cầu gia hạn, chờ người thuê duyệt");
      setRenewModalOpen(false);
      // Auto refresh trang
      window.location.reload();
    } catch (e) {
      console.error("Lỗi khi gửi yêu cầu gia hạn:", e);
      const errorMsg = e.response?.data || e.message || "Gửi yêu cầu gia hạn thất bại";
      message.error(errorMsg);
    } finally {
      setUpdating(false);
    }
  };
  

  const handleTerminateContract = (contractId) => {
    setTerminateContractId(contractId);
    setTerminateModalOpen(true);
  };

  const doRequestTerminate = async () => {
    if (!terminateReason) {
      message.error("Nhập lý do kết thúc hợp đồng!");
      return;
    }
    setUpdating(true);
    try {
      await requestTerminateContract(terminateContractId, terminateReason);
      message.success("Đã gửi yêu cầu kết thúc hợp đồng, chờ các bên phê duyệt.");
      setTerminateModalOpen(false);
      setTerminateReason("");
      // Auto refresh trang
      window.location.reload();
    } catch {
      message.error("Gửi yêu cầu thất bại!");
    } finally {
      setUpdating(false);
    }
  };

  const resetUpdateForm = () => {
    setUpdateReason("");
    setUpdateEndDate(null);
    setUpdateRentAmount("");
    setUpdateDeposit("");
    setUpdateTerms([]);
    setUpdateRenters([]);
    setUpdatePaymentCycle("MONTHLY");
  };

  const handleUpdateContract = async (contract) => {
    // Lấy danh sách amendment của hợp đồng này
    let contractAmendments = [];
    try {
      const res = await getContractAmendments(contract.id);
      contractAmendments = res.data || [];
    } catch {
      contractAmendments = [];
    }
    if (contractAmendments.some(a => a.status === "PENDING")) {
      message.warning("Bạn không thể gửi yêu cầu thay đổi mới khi hợp đồng đang có yêu cầu thay đổi chờ duyệt.");
      return;
    }
    setUpdateContract(contract);
    setUpdateReason("");
    setUpdateRentAmount(contract.rentAmount);
    setUpdateDeposit(contract.depositAmount);
    setUpdateEndDate(contract.contractEndDate ? dayjs(contract.contractEndDate) : null);
    setUpdatePaymentCycle(contract.paymentCycle);
    setUpdateTerms(Array.isArray(contract.terms) ? contract.terms : (contract.terms ? [contract.terms] : []));
    setUpdateRenters(
      contract.roomUsers?.filter(u => u.isActive !== false).map(u => u.userId || u.id) || []
    );
    setUpdateModalOpen(true);
    getAllRentersForAssignFull().then(res => {
      if (Array.isArray(res.data)) {
        setAllRenters(res.data);
      } else if (res.data && Array.isArray(res.data.result)) {
        setAllRenters(res.data.result);
      } else {
        setAllRenters([]);
      }
    });
  };

  const doUpdateContract = async () => {
    if (!updateContract || !updateReason || !updateEndDate) {
      message.error("Vui lòng điền đầy đủ thông tin cập nhật");
      return;
    }

    // Validate điều khoản hợp đồng
    const invalidTerms = updateTerms
      .map((term, idx) => ({ term: term?.trim(), index: idx + 1 }))
      .filter(({ term }) => term && term.length > 0 && term.length < 10);
    
    if (invalidTerms.length > 0) {
      message.error(`Điều khoản ${invalidTerms.map(t => t.index).join(', ')} quá ngắn (tối thiểu 10 ký tự)`);
      return;
    }

    const tooLongTerms = updateTerms
      .map((term, idx) => ({ term: term?.trim(), index: idx + 1 }))
      .filter(({ term }) => term && term.length > 2000);
    
    if (tooLongTerms.length > 0) {
      message.error(`Điều khoản ${tooLongTerms.map(t => t.index).join(', ')} quá dài (tối đa 2000 ký tự)`);
      return;
    }

    // Validate điều khoản không được trùng nhau
    const validTerms = updateTerms
      .map(term => term?.trim())
      .filter(term => term && term.length >= 10);
    
    const duplicateTerms = [];
    const seenTerms = new Set();
    
    validTerms.forEach((term, index) => {
      const normalizedTerm = term.toLowerCase().trim();
      if (seenTerms.has(normalizedTerm)) {
        duplicateTerms.push(index + 1);
      } else {
        seenTerms.add(normalizedTerm);
      }
    });
    
    if (duplicateTerms.length > 0) {
      message.error(`Điều khoản ${duplicateTerms.join(', ')} bị trùng lặp. Vui lòng kiểm tra lại!`);
      return;
    }

    // Kiểm tra xem có thay đổi gì không
    const hasChanges = 
      updateRentAmount !== updateContract.rentAmount ||
      updateDeposit !== updateContract.depositAmount ||
      updatePaymentCycle !== updateContract.paymentCycle ||
      updateEndDate?.toISOString() !== updateContract.contractEndDate ||
      updateTerms.length > 0 ||
      updateRenters.length !== (updateContract.roomUsers?.filter(u => u.isActive !== false).length || 0);

    if (!hasChanges) {
      message.warning("Không có thay đổi nào được thực hiện. Vui lòng cập nhật ít nhất một thông tin.");
      return;
    }

    // Lọc bỏ điều khoản trống (đã được validate ở trên)
    const finalValidTerms = validTerms;

    setUpdating(true);
    try {
      const request = {
        contractId: updateContract.id,
        reasonForUpdate: updateReason,
        newEndDate: updateEndDate?.toISOString(),
        newRentAmount: updateRentAmount ? parseFloat(updateRentAmount) : null,
        newDepositAmount: updateDeposit ? parseFloat(updateDeposit) : null,
        newTerms: finalValidTerms, // Luôn gửi mảng (có thể rỗng) thay vì null
        requiresTenantApproval: true,
        renterIds: updateRenters,
        paymentCycle: updatePaymentCycle
      };
      
      await updateRoomUserContract(request);
      message.success("Yêu cầu cập nhật hợp đồng đã được gửi!");
      setUpdateModalOpen(false);
      resetUpdateForm();
      // Auto refresh trang
      window.location.reload();
    } catch (err) {
      console.error("Error updating contract:", err);
      message.error(err.response?.data?.message || "Cập nhật hợp đồng thất bại!");
    } finally {
      setUpdating(false);
    }
  };

  const handleViewAmendments = async (contractId) => {
    setAmendments([]);
    setAmendmentsModalOpen(true);
    setAmendmentsPage(1); // Reset page when opening amendments modal
    setShowAllAmendments(false); // Reset to default view
    setCurrentAmendmentContractId(contractId); // Track current contract ID
    try {
      // Luôn load tất cả amendments trước
      const allRes = await getContractAmendments(contractId);
      const allAmendmentsData = allRes.data || [];
      setAllAmendments(allAmendmentsData); // Lưu tất cả amendments
      console.log('Loaded all amendments:', allAmendmentsData);
      
      // Kiểm tra có pending amendments không
      const hasPending = allAmendmentsData.some(a => a.status === 'PENDING');
      
      if (hasPending) {
        // Nếu có pending, chỉ hiển thị pending
        const pendingAmendments = allAmendmentsData.filter(a => a.status === 'PENDING');
        setAmendments(pendingAmendments);
        console.log('Filtered to pending only:', pendingAmendments);
      } else {
        // Nếu không có pending, hiển thị tất cả
        setAmendments(allAmendmentsData);
        console.log('Showing all amendments:', allAmendmentsData);
      }
    } catch (e) {
      console.error('Failed to load amendments:', e);
      setAmendments([]);
      setAllAmendments([]);
      // Don't show error message here as it's just a refresh operation
    }
  };

  const loadAmendmentsByStatus = async (contractId, status) => {
    try {
      const res = await getContractAmendmentsByStatus(contractId, status);
      console.log(`Loaded ${status} amendments:`, res.data);
      return res.data || [];
    } catch (e) {
      console.error(`Failed to load ${status} amendments:`, e);
      return [];
    }
  };

  const handleProcessExpiredContracts = async () => {
    try {
      await processExpiredContracts();
      message.success('Đã xử lý hợp đồng hết hạn');
      fetchRoomsAndLatestContracts();
    } catch (e) {
      message.error('Lỗi khi xử lý hợp đồng hết hạn');
    }
  };

  const handleApproveAmendment = async (amendmentId, isLandlord) => {
    try {
      await approveAmendment(amendmentId, isLandlord);
      message.success({
        content: 'Phê duyệt thành công!',
        key: `approve-${amendmentId}`,
        duration: 3
      });
      
      // Auto refresh trang
      window.location.reload();
    } catch (e) {
      console.error('Approval error:', e);
      message.error({
        content: 'Phê duyệt thất bại!',
        key: `approve-error-${amendmentId}`,
        duration: 4
      });
    }
  };

  const handleRejectAmendment = (amendmentId) => {
    setRejectingId(amendmentId);
    setRejectReason("");
    setRejectModalOpen(true);
  };

  const doRejectAmendment = async () => {
    if (!rejectReason) {
      message.error({
        content: "Vui lòng nhập lý do từ chối!",
        key: 'reject-validation'
      });
      return;
    }
    setRejectLoading(true);
    try {
      await rejectAmendment(rejectingId, rejectReason);
      message.success({
        content: "Đã từ chối yêu cầu thay đổi!",
        key: `reject-${rejectingId}`,
        duration: 3
      });
      setRejectModalOpen(false);
      setRejectingId(null);
      setRejectReason("");
      
      // Auto refresh trang
      window.location.reload();
    } catch (e) {
      console.error('Rejection error:', e);
      message.error({
        content: "Từ chối thất bại!",
        key: `reject-error-${rejectingId}`,
        duration: 4
      });
    } finally {
      setRejectLoading(false);
    }
  };

  // Debug dữ liệu
  console.log('allRenters:', allRenters);
  console.log('roomUsers:', updateContract?.roomUsers);

  const currentRenters = (updateContract?.roomUsers || [])
    .filter(u => u.isActive !== false)
    .map(u => ({
      value: u.userId || u.id,
      label: `${u.fullName ? u.fullName : 'Không rõ tên'}${u.phoneNumber ? ` (${u.phoneNumber})` : ''} (Đang ở)`
    }));

  const newRenters = allRenters
    .filter(r => !currentRenters.some(c => c.value === r.id))
    .map(r => ({
      value: r.id,
      label: `${r.fullName ? r.fullName : 'Không rõ tên'}${r.phoneNumber ? ` (${r.phoneNumber})` : ''}`
    }));

  const selectOptions = allRenters.map(r => ({
    value: r.id,
    label:
      r.fullName && r.fullName.trim() !== ""
        ? r.fullName + (r.phoneNumber ? ` (${r.phoneNumber})` : "")
        : r.username
          ? r.username
          : r.email
            ? r.email
            : "Không rõ tên"
  }));

  const currentCount = currentRenters.length;
  const maxCount = updateContract?.maxOccupants || 0;

  const handleAdvancedFilter = () => {
    const params = { ...filter };
    if (filterPaymentCycle) params.paymentCycle = filterPaymentCycle;
    if (filterDateRange && filterDateRange.length === 2) {
      params.contractStartDateFrom = filterDateRange[0]?.startOf("day").toISOString();
      params.contractStartDateTo = filterDateRange[1]?.endOf("day").toISOString();
    }
    if (filterRoomId) params.roomId = filterRoomId;
    setFilter(params);
    setCurrentPage(1);
  };

  // Test function để debug filter
  const testFilter = () => {
    const testParams = {
      paymentCycle: "MONTHLY"
    };
    const filterString = buildContractFilterString(testParams);
    console.log("Test filter params:", testParams);
    console.log("Test filter string:", filterString);
    
    // Test API call
    getAllContracts({ page: 0, size: 10, filter: filterString })
      .then(response => {
        console.log("Test API response:", response);
      })
      .catch(error => {
        console.error("Test API error:", error);
      });
  };

  // Thêm button test vào UI (tạm thời)
  useEffect(() => {
    // Uncomment để test
    // testFilter();
  }, []);

  // Hàm map loại amendment sang tiếng Việt
  const getAmendmentTypeText = (type) => {
    switch (type) {
      case 'RENT_INCREASE': return 'Tăng tiền thuê';
      case 'DEPOSIT_CHANGE': return 'Thay đổi tiền cọc';
      case 'TERMS_UPDATE': return 'Cập nhật điều khoản';
      case 'DURATION_EXTENSION': return 'Gia hạn hợp đồng';
      case 'RENTER_CHANGE': return 'Thay đổi người thuê';
      case 'PAYMENT_CYCLE_CHANGE': return 'Thay đổi chu kỳ thanh toán';
      case 'TERMINATION': return 'Chấm dứt hợp đồng';
      case 'OTHER': return 'Khác';
      default: return type;
    }
  };
  // Hàm map trạng thái sang tiếng Việt
  const getAmendmentStatusText = (status) => {
    switch (status) {
      case 'REJECTED': return 'Đã từ chối';
      case 'PENDING': return 'Chờ duyệt';
      case 'APPROVED': return 'Đã duyệt';
      default: return status;
    }
  };

  const formatAmendmentValue = (value) => {
    if (!value) return value;
    
    // Format số tiền
    const formatMoney = (text) => {
      // Tìm và format các số tiền trong text
      return text.replace(/(\d+(?:\.\d+)?(?:E\d+)?)\s*(?:VND|₫)/gi, (match, number) => {
        const num = parseFloat(number);
        if (!isNaN(num)) {
          return num.toLocaleString('vi-VN') + ' VND';
        }
        return match;
      });
    };
    
    return formatMoney(value);
  };

  // Polling cập nhật động trạng thái phê duyệt khi modal mở
  useEffect(() => {
    if (amendmentsModalOpen && updateContract) {
      const interval = setInterval(() => {
        getContractAmendments(updateContract.id).then(res => setAmendments(res.data));
      }, 3000); // 3 giây cập nhật 1 lần
      return () => clearInterval(interval);
    }
  }, [amendmentsModalOpen, updateContract]);

  // Map userId sang tên
  const userIdToName = {};
  (updateContract?.roomUsers || []).forEach(u => {
    userIdToName[u.userId || u.id] = u.fullName || u.username || u.email || `Người thuê ${u.userId || u.id}`;
  });
  (allRenters || []).forEach(u => {
    userIdToName[u.id] = u.fullName || u.username || u.email || `Người thuê ${u.id}`;
  });

  // Lấy userId hiện tại
  const currentUserId = user?.id;

  return (
    <div style={{ width: '100%', minHeight: '100vh' }}>
      <style>
        {`
          @media (max-width: 768px) {
            .ant-layout-sider {
              display: none !important;
            }
          }
        `}
      </style>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        {/* Desktop Sidebar - chỉ hiển thị trên desktop */}
        {!isMobile && (
          <div
            style={{
              width: 220,
              background: "#001529",
              position: "fixed",
              height: "100vh",
              zIndex: 1000,
            }}
          >
            {user?.role?.roleName?.toUpperCase?.() === "ADMIN" || user?.role?.roleName?.toUpperCase?.() === "SUBADMIN" ? (
              <AdminSidebar />
            ) : (
              <LandlordSidebar />
            )}
          </div>
        )}

        {/* Main Layout */}
        <div style={{ 
          flex: 1, 
          marginLeft: isMobile ? 0 : 220,
          display: "flex",
          flexDirection: "column"
        }}>
          {/* Mobile Header - chỉ hiển thị trên mobile */}
          {isMobile && (
            <div style={{ 
              background: '#001529', 
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'sticky',
              top: 0,
              zIndex: 100,
              width: '100%'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 12,
                color: 'white'
              }}>
                <div style={{ 
                  fontWeight: 600, 
                  fontSize: 18,
                  color: 'white'
                }}>
                  MP-BHMS
                </div>
                <div style={{ 
                  fontSize: 14,
                  color: 'rgba(255,255,255,0.8)'
                }}>
                  Xin chào Landlord
                </div>
              </div>
              <Button
                type="text"
                icon={<MenuOutlined />}
                onClick={() => setSidebarDrawerOpen(true)}
                style={{ 
                  color: 'white',
                  fontSize: '18px'
                }}
              />
            </div>
          )}
          
          {/* Content Area */}
          <div style={{ 
            flex: 1, 
            padding: isMobile ? 16 : 24,
            backgroundColor: "#f5f5f5",
            minHeight: isMobile ? "calc(100vh - 60px)" : "100vh"
          }}>
            {/* Controls Section cho cả mobile và desktop */}
            {isMobile ? (
              <div style={{ 
                background: 'white', 
                padding: 16, 
                borderRadius: 8, 
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                marginBottom: 16
              }}>
                <PageHeader title="Danh sách hợp đồng" style={{ margin: 0, padding: 0, marginBottom: 16 }} />
                
                {/* Search and Filter Controls */}
                <div style={{ 
                  display: 'flex', 
                  flexDirection: "column",
                  gap: 12,
                  marginBottom: 16
                }}>
                  <div style={{ 
                    display: 'flex', 
                    gap: 8
                  }}>
                    <Popover
                      content={<ContractFilterPopover onApply={handleFilterApply} rooms={roomContracts} tenants={allRenters} />}
                      title="Bộ lọc hợp đồng"
                      trigger="click"
                      open={filterVisible}
                      onOpenChange={setFilterVisible}
                      placement="bottom"
                    >
                      <Button 
                        icon={<FilterOutlined />} 
                        type="default"
                        style={{ flex: 1 }}
                        size="large"
                      >
                        Bộ lọc
                      </Button>
                    </Popover>
                    <Button
                      onClick={() => { setFilter({}); setFilterVisible(false); setCurrentPage(1); }}
                      type="default"
                      style={{ flex: 1 }}
                      size="large"
                    >
                      Xóa lọc
                    </Button>
                  </div>
                  <Button
                    onClick={refreshData}
                    loading={loading}
                    icon={<ReloadOutlined />}
                    title="Làm mới dữ liệu"
                    type="primary"
                    size="large"
                    style={{ width: '100%' }}
                  >
                    Làm mới
                  </Button>
                </div>
                
                {/* Mobile Status bar */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: "center",
                  borderTop: '1px solid #f0f0f0',
                  paddingTop: 12,
                  fontSize: 12
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
                      onChange={value => {
                        setPageSize(value);
                        setCurrentPage(1);
                        fetchRoomsAndLatestContracts(1, value);
                      }}
                      style={{ width: 80 }}
                      size="small"
                      options={pageSizeOptions.map((v) => ({ value: v, label: `${v}` }))}
                    />
                    <span>mục</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    {lastUpdated && (
                      <span style={{ fontSize: '10px', color: '#999' }}>
                        Cập nhật: {lastUpdated.toLocaleTimeString('vi-VN')}
                      </span>
                    )}
                    <span style={{ fontWeight: 500, color: "#1890ff", fontSize: '12px' }}>
                      Tổng: {total} hợp đồng
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ 
                background: 'white', 
                padding: 20, 
                borderRadius: 8, 
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                marginBottom: 20
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <PageHeader title="Danh sách hợp đồng" style={{ margin: 0, padding: 0 }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Popover
                      content={<ContractFilterPopover onApply={handleFilterApply} rooms={roomContracts} tenants={allRenters} />}
                      title="Bộ lọc hợp đồng"
                      trigger="click"
                      open={filterVisible}
                      onOpenChange={setFilterVisible}
                      placement="bottomRight"
                    >
                      <Button icon={<FilterOutlined />} type="default">Bộ lọc</Button>
                    </Popover>
                    <Button onClick={() => { setFilter({}); setFilterVisible(false); setCurrentPage(1); }} type="default">
                      Xóa lọc
                    </Button>
                    <Button
                      onClick={refreshData}
                      loading={loading}
                      icon={<ReloadOutlined />}
                      title="Làm mới dữ liệu"
                      type="primary"
                      size="default"
                    >
                      Làm mới
                    </Button>
                  </div>
                </div>
                
                {/* Status bar */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  borderTop: '1px solid #f0f0f0',
                  paddingTop: 12,
                  fontSize: 14
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
                      onChange={value => {
                        setPageSize(value);
                        setCurrentPage(1);
                        fetchRoomsAndLatestContracts(1, value);
                      }}
                      style={{ width: 100 }}
                      options={pageSizeOptions.map((v) => ({ value: v, label: `${v}` }))}
                    />
                    <span>mục</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    {lastUpdated && (
                      <span style={{ fontSize: '12px', color: '#999' }}>
                        Cập nhật: {lastUpdated.toLocaleTimeString('vi-VN')}
                      </span>
                    )}
                    <span style={{ fontWeight: 500, color: "#1890ff" }}>
                      Tổng: {total} hợp đồng
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Main Table Section */}
            <div style={{ 
              background: 'white', 
              borderRadius: 8, 
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              overflow: 'hidden'
            }}>
              <ContractTable
                rooms={roomContracts}
                onExport={handleExport}
                onDelete={handleDelete}
                onUpdate={handleUpdateContract}
                onRenew={handleRenewContract}
                onViewAmendments={handleViewAmendments}
                onTerminate={handleTerminateContract}
                onViewDetail={contract => { setDetailContract(contract); setDetailModalOpen(true); }}
                loading={loading || updating}
                pageSize={pageSize}
                currentPage={currentPage}
                total={total}
                onPageChange={(page) => {
                  setCurrentPage(page);
                  fetchRoomsAndLatestContracts(page, pageSize);
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Drawer cho Sidebar */}
      {isMobile && (
        <Drawer
          title="Menu"
          placement="left"
          onClose={() => setSidebarDrawerOpen(false)}
          open={sidebarDrawerOpen}
          width={280}
          bodyStyle={{ padding: 0 }}
        >
          {user?.role?.roleName?.toUpperCase?.() === "ADMIN" || user?.role?.roleName?.toUpperCase?.() === "SUBADMIN" ? (
            <AdminSidebar isDrawer={true} onMenuClick={() => setSidebarDrawerOpen(false)} />
          ) : (
            <LandlordSidebar isDrawer={true} onMenuClick={() => setSidebarDrawerOpen(false)} />
          )}
        </Drawer>
      )}

      {/* Renew Contract Modal */}
      <Modal 
        open={renewModalOpen} 
        onCancel={() => setRenewModalOpen(false)} 
        onOk={doRenewContract} 
        okText="Gia hạn hợp đồng" 
        confirmLoading={updating} 
        title="Gia hạn hợp đồng"
        width={500}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8, color: '#262626' }}>
            📅 Chọn ngày kết thúc mới:
          </div>
          <DatePicker 
            value={renewDate} 
            onChange={setRenewDate} 
            style={{ width: '100%' }} 
            format="DD/MM/YYYY" 
            placeholder="Chọn ngày kết thúc mới" 
            size="large"
          />
        </div>
      </Modal>

      {/* Update Contract Modal */}
      <Modal 
        open={updateModalOpen} 
        onCancel={() => setUpdateModalOpen(false)} 
        onOk={doUpdateContract} 
        okText="Gửi yêu cầu cập nhật" 
        confirmLoading={updating} 
        title={
          <div>
            <div style={{ fontSize: '16px', fontWeight: 600 }}>Cập nhật hợp đồng</div>
            {updateContract && (
              <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
                Phòng: {updateContract.room?.roomNumber} • Số hợp đồng: {updateContract.contractNumber || updateContract.id}
              </div>
            )}
          </div>
        }
      >
        <div style={{ marginBottom: 8 }}>Lý do cập nhật:</div>
        <Input.TextArea value={updateReason} onChange={e => setUpdateReason(e.target.value)} rows={2} style={{ marginBottom: 12 }} />
        <div style={{ marginBottom: 8 }}>Ngày kết thúc mới:</div>
        <DatePicker value={updateEndDate} onChange={setUpdateEndDate} style={{ width: '100%', marginBottom: 12 }} format="DD/MM/YYYY" />
        <div style={{ marginBottom: 8 }}>Tiền thuê mới:</div>
        <Input type="number" value={updateRentAmount} onChange={e => setUpdateRentAmount(e.target.value)} style={{ marginBottom: 12 }} />
        <div style={{ marginBottom: 8 }}>Tiền đặt cọc mới:</div>
        <Input type="number" value={updateDeposit} onChange={e => setUpdateDeposit(e.target.value)} style={{ marginBottom: 12 }} />
        <div style={{ marginBottom: 8 }}>Chu kỳ thanh toán:</div>
        <Select value={updatePaymentCycle} onChange={setUpdatePaymentCycle} style={{ width: '100%', marginBottom: 12 }} options={paymentCycleOptions.map(opt => ({...opt, label: opt.value === 'MONTHLY' ? 'Hàng tháng' : opt.value === 'QUARTERLY' ? 'Hàng quý' : 'Hàng năm'}))} />
        <div style={{ marginBottom: 8, fontWeight: 500 }}>Điều khoản hợp đồng:</div>
        
        {/* Điều khoản mẫu */}
        <div style={{ marginBottom: 12, padding: '8px 12px', backgroundColor: '#f6f8fa', borderRadius: 6, border: '1px solid #e1e5e9' }}>
          <div style={{ fontSize: '12px', color: '#586069', marginBottom: 8 }}>💡 Điều khoản mẫu thông dụng:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {[
              "Không được nuôi thú cưng trong phòng",
              "Cấm hút thuốc trong phòng và khu vực chung", 
              "Không được tự ý sửa chữa, cải tạo phòng",
              "Giữ yên lặng từ 22h đến 6h sáng hôm sau",
              "Phải đóng cửa phòng khi ra ngoài",
              "Không được cho người khác ở chung không đăng ký"
            ].map((template, idx) => (
              <Button
                key={idx}
                size="small"
                type="dashed"
                style={{ fontSize: '11px' }}
                onClick={() => {
                  const currentTerms = updateTerms || [];
                  if (!currentTerms.includes(template)) {
                    setUpdateTerms([...currentTerms, template]);
                  }
                }}
              >
                {template}
              </Button>
            ))}
          </div>
        </div>
        
        <Input.TextArea 
          value={updateTerms?.join('\n') || ''} 
          onChange={e => setUpdateTerms(e.target.value.split('\n').filter(t => t.trim()))} 
          rows={6} 
          placeholder="Nhập điều khoản hợp đồng..."
        />
      </Modal>

      {/* Terminate Contract Modal */}
      <Modal 
        open={terminateModalOpen} 
        onCancel={() => setTerminateModalOpen(false)} 
        onOk={doRequestTerminate} 
        okText="Gửi yêu cầu chấm dứt" 
        confirmLoading={updating} 
        title="Chấm dứt hợp đồng"
        width={500}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8, color: '#262626' }}>
            📝 Lý do chấm dứt hợp đồng:
          </div>
          <Input.TextArea 
            value={terminateReason} 
            onChange={e => setTerminateReason(e.target.value)} 
            rows={4} 
            placeholder="Nhập lý do chấm dứt hợp đồng..."
          />
        </div>
      </Modal>

      {/* Reject Amendment Modal */}
      <Modal 
        open={rejectModalOpen} 
        onCancel={() => setRejectModalOpen(false)} 
        onOk={doRejectAmendment} 
        okText="Từ chối yêu cầu" 
        confirmLoading={rejectLoading} 
        title="Từ chối yêu cầu cập nhật"
        width={500}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8, color: '#262626' }}>
            📝 Lý do từ chối:
          </div>
          <Input.TextArea 
            value={rejectReason} 
            onChange={e => setRejectReason(e.target.value)} 
            rows={4} 
            placeholder="Nhập lý do từ chối yêu cầu..."
          />
        </div>
      </Modal>

      {/* Amendments Modal */}
      <Modal 
        open={amendmentsModalOpen} 
        onCancel={() => setAmendmentsModalOpen(false)} 
        footer={null}
        title={
          <div>
            <div style={{ fontSize: '16px', fontWeight: 600 }}>Lịch sử cập nhật hợp đồng</div>
            {updateContract && (
              <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
                Phòng: {updateContract.room?.roomNumber} • Số hợp đồng: {updateContract.contractNumber || updateContract.id}
              </div>
            )}
          </div>
        }
        width={800}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <Button 
              type={showAllAmendments ? "default" : "primary"}
              onClick={() => setShowAllAmendments(false)}
              size="small"
            >
              Yêu cầu chờ xử lý
            </Button>
            <Button 
              type={showAllAmendments ? "primary" : "default"}
              onClick={() => setShowAllAmendments(true)}
              size="small"
            >
              Tất cả yêu cầu
            </Button>
          </div>
          
          <List
            dataSource={showAllAmendments ? allAmendments : amendments}
            loading={loading}
            pagination={showAllAmendments ? {
              current: amendmentsPage,
              pageSize: amendmentsPageSize,
              total: allAmendments.length,
              onChange: (page) => setAmendmentsPage(page),
              showSizeChanger: false,
              showQuickJumper: false,
              showTotal: (total, range) => `${range[0]}-${range[1]} / ${total} yêu cầu`
            } : false}
            renderItem={(amendment) => (
              <List.Item
                style={{ 
                  border: '1px solid #f0f0f0', 
                  borderRadius: 8, 
                  marginBottom: 8,
                  padding: 16,
                  backgroundColor: amendment.status === 'PENDING' ? '#fff7e6' : 
                                 amendment.status === 'APPROVED' ? '#f6ffed' : 
                                 amendment.status === 'REJECTED' ? '#fff2f0' : '#fafafa'
                }}
              >
                <div style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <Tag color={
                        amendment.status === 'PENDING' ? 'orange' : 
                        amendment.status === 'APPROVED' ? 'green' : 
                        amendment.status === 'REJECTED' ? 'red' : 'default'
                      }>
                        {getAmendmentStatusText(amendment.status)}
                      </Tag>
                      <span style={{ fontSize: '12px', color: '#666', marginLeft: 8 }}>
                        {dayjs(amendment.createdAt).format('DD/MM/YYYY HH:mm')}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {amendment.requestedBy === currentUserId ? 'Bạn yêu cầu' : 'Người thuê yêu cầu'}
                    </div>
                  </div>
                  
                  {amendment.reason && (
                    <div style={{ marginBottom: 8 }}>
                      <strong>Lý do:</strong> {amendment.reason}
                    </div>
                  )}
                  
                  <div style={{ marginBottom: 8 }}>
                    <strong>Thay đổi:</strong>
                    <div style={{ marginLeft: 16, marginTop: 4 }}>
                      {amendment.type === 'END_DATE' && (
                        <div>Ngày kết thúc: {dayjs(amendment.oldValue).format('DD/MM/YYYY')} → {dayjs(amendment.newValue).format('DD/MM/YYYY')}</div>
                      )}
                      {amendment.type === 'RENT_AMOUNT' && (
                        <div>Tiền thuê: {formatAmendmentValue(amendment.oldValue)} → {formatAmendmentValue(amendment.newValue)}</div>
                      )}
                      {amendment.type === 'DEPOSIT' && (
                        <div>Tiền đặt cọc: {formatAmendmentValue(amendment.oldValue)} → {formatAmendmentValue(amendment.newValue)}</div>
                      )}
                      {amendment.type === 'PAYMENT_CYCLE' && (
                        <div>Chu kỳ thanh toán: {amendment.oldValue} → {amendment.newValue}</div>
                      )}
                      {amendment.type === 'TERMS' && (
                        <div>
                          <div>Điều khoản hợp đồng:</div>
                          <div style={{ marginLeft: 16, fontSize: '12px', color: '#666' }}>
                            <div><strong>Cũ:</strong></div>
                            <div style={{ whiteSpace: 'pre-line' }}>{amendment.oldValue}</div>
                            <div><strong>Mới:</strong></div>
                            <div style={{ whiteSpace: 'pre-line' }}>{amendment.newValue}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {amendment.status === 'PENDING' && amendment.requestedBy !== currentUserId && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <Button 
                        type="primary" 
                        size="small"
                        onClick={() => handleApproveAmendment(amendment.id, true)}
                        loading={updating}
                      >
                        Chấp nhận
                      </Button>
                      <Button 
                        type="default" 
                        size="small"
                        onClick={() => handleRejectAmendment(amendment.id)}
                      >
                        Từ chối
                      </Button>
                    </div>
                  )}
                  
                  {amendment.status === 'REJECTED' && amendment.rejectReason && (
                    <div style={{ marginTop: 8, padding: 8, backgroundColor: '#fff2f0', borderRadius: 4, border: '1px solid #ffccc7' }}>
                      <strong>Lý do từ chối:</strong> {amendment.rejectReason}
                    </div>
                  )}
                </div>
              </List.Item>
            )}
          />
        </div>
      </Modal>

      {/* Contract Detail Modal */}
      <Modal 
        open={detailModalOpen} 
        onCancel={() => setDetailModalOpen(false)} 
        footer={null}
        title="Chi tiết hợp đồng"
        width={800}
      >
        {detailContract && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <strong>Phòng:</strong> {detailContract.room?.roomNumber}
            </div>
            <div style={{ marginBottom: 16 }}>
              <strong>Số hợp đồng:</strong> {detailContract.contractNumber || detailContract.id}
            </div>
            <div style={{ marginBottom: 16 }}>
              <strong>Người thuê:</strong> {detailContract.roomUsers?.map(u => u.fullName || u.username).join(', ')}
            </div>
            <div style={{ marginBottom: 16 }}>
              <strong>Ngày bắt đầu:</strong> {dayjs(detailContract.startDate).format('DD/MM/YYYY')}
            </div>
            <div style={{ marginBottom: 16 }}>
              <strong>Ngày kết thúc:</strong> {dayjs(detailContract.endDate).format('DD/MM/YYYY')}
            </div>
            <div style={{ marginBottom: 16 }}>
              <strong>Tiền thuê:</strong> {formatAmendmentValue(detailContract.rentAmount)}
            </div>
            <div style={{ marginBottom: 16 }}>
              <strong>Tiền đặt cọc:</strong> {formatAmendmentValue(detailContract.deposit)}
            </div>
            <div style={{ marginBottom: 16 }}>
              <strong>Chu kỳ thanh toán:</strong> {detailContract.paymentCycle}
            </div>
            {detailContract.terms && (
              <div style={{ marginBottom: 16 }}>
                <strong>Điều khoản hợp đồng:</strong>
                <div style={{ marginTop: 8, padding: 8, backgroundColor: '#f6f8fa', borderRadius: 4, whiteSpace: 'pre-line' }}>
                  {detailContract.terms}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
