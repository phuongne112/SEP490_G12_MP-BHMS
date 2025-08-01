import React, { useEffect, useState } from "react";
import { Layout, message, Button, Popover, Select, Modal, Input, DatePicker, List, Pagination, Tag } from "antd";
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
import { FilterOutlined, ReloadOutlined } from "@ant-design/icons";

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
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [filter, setFilter] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [total, setTotal] = useState(0);
  const pageSizeOptions = [5, 10, 20, 50];
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
    <Layout style={{ minHeight: "100vh" }}>
      <Sider width={220}>
        <LandlordSidebar />
      </Sider>
      <Layout>
        <Content style={{ padding: 24, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
          {/* Header Section */}
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
                      const newTerms = [...updateTerms];
                      newTerms.push(template);
                      setUpdateTerms(newTerms);
                    }}
                  >
                    + {template}
                  </Button>
                ))}
              </div>
            </div>

            <ul style={{ margin: '8px 0 8px 16px', padding: 0 }}>
              {updateTerms.length === 0 && (
                <li style={{ color: '#8c8c8c', fontStyle: 'italic' }}>
                  {updateContract?.terms && updateContract.terms.length > 0 
                    ? 'Điều khoản hiện tại sẽ được giữ nguyên' 
                    : 'Chưa có điều khoản bổ sung'
                  }
                </li>
              )}
              {updateTerms.map((term, idx) => (
                <li key={idx} style={{ marginBottom: 8, display: 'flex', alignItems: 'flex-start', border: '1px solid #f0f0f0', borderRadius: 4, padding: 8 }}>
                  <span style={{ minWidth: '20px', fontSize: '12px', color: '#666', marginTop: 4 }}>{idx + 1}.</span>
                  <Input.TextArea
                    value={term}
                    onChange={e => {
                      const newTerms = [...updateTerms];
                      newTerms[idx] = e.target.value;
                      setUpdateTerms(newTerms);
                    }}
                    autoSize={{ minRows: 2, maxRows: 4 }}
                    style={{ flex: 1, marginRight: 8 }}
                    placeholder="Nhập nội dung điều khoản (tối thiểu 10 ký tự)"
                    showCount
                    maxLength={2000}
                    status={term && term.trim().length < 10 ? 'error' : ''}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <Button
                      type="link"
                      danger
                      size="small"
                      onClick={() => setUpdateTerms(prev => prev.filter((_, i) => i !== idx))}
                      style={{ padding: 0, minWidth: 'auto' }}
                    >
                      Xóa
                    </Button>
                    {idx > 0 && (
                      <Button
                        type="link"
                        size="small"
                        onClick={() => {
                          const newTerms = [...updateTerms];
                          [newTerms[idx], newTerms[idx - 1]] = [newTerms[idx - 1], newTerms[idx]];
                          setUpdateTerms(newTerms);
                        }}
                        style={{ padding: 0, minWidth: 'auto', fontSize: '10px' }}
                      >
                        ↑
                      </Button>
                    )}
                    {idx < updateTerms.length - 1 && (
                      <Button
                        type="link"
                        size="small"
                        onClick={() => {
                          const newTerms = [...updateTerms];
                          [newTerms[idx], newTerms[idx + 1]] = [newTerms[idx + 1], newTerms[idx]];
                          setUpdateTerms(newTerms);
                        }}
                        style={{ padding: 0, minWidth: 'auto', fontSize: '10px' }}
                      >
                        ↓
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <Button
                type="dashed"
                style={{ flex: 1 }}
                onClick={() => setUpdateTerms(prev => [...prev, ""])}
                icon={<span>+</span>}
              >
                Thêm điều khoản mới
              </Button>
              {updateTerms.length > 0 && (
                <Button
                  danger
                  onClick={() => setUpdateTerms([])}
                >
                  Xóa tất cả
                </Button>
              )}
            </div>
            
            {/* Thống kê điều khoản */}
            <div style={{ fontSize: '12px', color: '#666', marginBottom: 16, textAlign: 'center', padding: '8px', backgroundColor: '#f9f9f9', borderRadius: 4 }}>
              📋 Tổng cộng: <strong>{updateTerms.length}</strong> điều khoản • 
              Hợp lệ: <strong style={{ color: '#52c41a' }}>{updateTerms.filter(t => t && t.trim().length >= 10).length}</strong> • 
              Cần sửa: <strong style={{ color: updateTerms.filter(t => !t || t.trim().length < 10).length > 0 ? '#ff4d4f' : '#666' }}>
                {updateTerms.filter(t => !t || t.trim().length < 10).length}
              </strong>
              {updateTerms.length === 0 && updateContract?.terms && updateContract.terms.length > 0 && (
                <span style={{ color: '#1890ff' }}> • Giữ nguyên {updateContract.terms.length} điều khoản hiện tại</span>
              )}
            </div>
            <div style={{ marginBottom: 8 }}>
              Người thuê trong hợp đồng mới ({updateRenters.length}/{maxCount}):
            </div>
            <ul style={{ margin: '8px 0 8px 16px', padding: 0 }}>
              {updateRenters.length === 0 && (
                <li style={{ color: '#8c8c8c', fontStyle: 'italic' }}>
                  {updateContract?.roomUsers && updateContract.roomUsers.filter(u => u.isActive !== false).length > 0 
                    ? 'Người thuê hiện tại sẽ được giữ nguyên' 
                    : 'Chưa có người thuê'
                  }
                </li>
              )}
              {updateRenters.map(id => {
                const user = allRenters.find(r => r.id === id);
                return (
                  <li key={id} style={{ marginBottom: 4, display: 'flex', alignItems: 'center' }}>
                    <span>
                      {user?.fullName || 'Không rõ tên'}
                      {user?.phoneNumber ? ` (${user.phoneNumber})` : ''}
                      {updateContract?.roomUsers?.some(u => (u.userId || u.id) === id && u.isActive !== false) ? ' (Đang ở)' : ' (Mới)'}
                    </span>
                    <Button
                      type="link"
                      danger
                      size="small"
                      style={{ marginLeft: 8 }}
                      onClick={() => setUpdateRenters(prev => prev.filter(uid => uid !== id))}
                    >
                      Xóa
                    </Button>
                  </li>
                );
              })}
            </ul>
            {updateRenters.length < maxCount && (
              <Select
                style={{ width: '100%', marginBottom: 8 }}
                showSearch
                placeholder="Thêm người thuê vào hợp đồng"
                optionFilterProp="children"
                value={null}
                onChange={id => {
                  if (!updateRenters.includes(id)) setUpdateRenters(prev => [...prev, id]);
                }}
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                options={allRenters
                  .filter(r => !updateRenters.includes(r.id))
                  .map(r => ({
                    value: r.id,
                    label: `${r.fullName || 'Không rõ tên'}${r.phoneNumber ? ` (${r.phoneNumber})` : ''}`
                  }))}
              />
            )}
            <div style={{ color: '#888', fontSize: 12, marginTop: 8, padding: '8px', backgroundColor: '#f0f8ff', borderRadius: 4, border: '1px solid #d6e4ff' }}>
              <div style={{ fontWeight: 500, marginBottom: 4, color: '#1890ff' }}>ℹ️ Lưu ý quan trọng:</div>
              • Nếu bạn xóa người thuê hiện tại, họ sẽ bị loại khỏi hợp đồng mới.<br/>
              • Nếu bạn thêm người thuê mới, họ sẽ được thêm vào hợp đồng mới.<br/>
              • Nếu bạn xóa tất cả điều khoản, hợp đồng mới sẽ không có điều khoản nào.<br/>
              • Nếu bạn không thay đổi điều khoản, điều khoản hiện tại sẽ được giữ nguyên.<br/>
              • Số lượng người thuê tối đa: <strong>{maxCount}</strong>
            </div>
          </Modal>
          <Modal open={amendmentsModalOpen} onCancel={() => { setAmendmentsModalOpen(false); setAmendmentsPage(1); }} footer={null} title="Yêu cầu thay đổi hợp đồng">
            {/* Hiển thị amendments */}
            {(() => {
              console.log('Amendments debug:', {
                total: amendments.length,
                pending: amendments.filter(a => a.status === 'PENDING').length,
                approved: amendments.filter(a => a.status === 'APPROVED').length,
                rejected: amendments.filter(a => a.status === 'REJECTED').length,
                showAll: showAllAmendments
              });
              
              return (
                <>
                  {/* Thông báo về chế độ hiển thị */}
                  <div style={{ 
                    marginBottom: 16, 
                    padding: 8, 
                    backgroundColor: '#f8f9fa', 
                    border: '1px solid #dee2e6', 
                    borderRadius: 4,
                    fontSize: 13
                  }}>
                    <span style={{ color: '#6c757d' }}>
                      {!showAllAmendments && amendments.some(a => a.status === 'PENDING') 
                        ? 'Đang hiển thị các yêu cầu chờ duyệt'
                        : 'Đang hiển thị lịch sử đã xử lý (đã duyệt, từ chối)'
                      }
                    </span>
            </div>
                  
                  {!showAllAmendments && !amendments.some(a => a.status === 'PENDING') && amendments.length > 0 && (
                    <div style={{ 
                      marginBottom: 16, 
                      padding: 12, 
                      backgroundColor: '#f6ffed', 
                      border: '1px solid #b7eb8f', 
                      borderRadius: 6,
                      fontSize: 14
                    }}>
                      <div style={{ fontWeight: 600, color: '#52c41a', marginBottom: 4 }}>
                        Chế độ hiển thị:
                      </div>
                      <div style={{ color: '#666' }}>
                        Không có yêu cầu chờ duyệt → Hiển thị <strong>lịch sử đã xử lý</strong> (đã duyệt, từ chối)
                      </div>
                    </div>
                  )}
                  
                  {/* Nút chuyển đổi chế độ hiển thị */}
                  <div style={{ 
                    marginBottom: 16, 
                    display: 'flex', 
                    gap: 8, 
                    justifyContent: 'center' 
                  }}>
                    <Button
                      type={showAllAmendments ? "primary" : "default"}
                      onClick={async () => {
                        const newShowAll = !showAllAmendments;
                        setShowAllAmendments(newShowAll);
                        setAmendmentsPage(1); // Reset page khi chuyển đổi
                        
                        // Gọi API để lấy data theo status
                        if (newShowAll) {
                          // Gọi API để lấy tất cả trừ pending
                          try {
                            const res = await getContractAmendmentsByStatus(currentAmendmentContractId, 'APPROVED');
                            const approvedAmendments = res.data || [];
                            const rejectedRes = await getContractAmendmentsByStatus(currentAmendmentContractId, 'REJECTED');
                            const rejectedAmendments = rejectedRes.data || [];
                            const allNonPending = [...approvedAmendments, ...rejectedAmendments];
                            setAmendments(allNonPending);
                            console.log('Showing approved and rejected amendments:', allNonPending);
                          } catch (e) {
                            console.error('Failed to load non-pending amendments:', e);
                            message.error('Lỗi khi tải dữ liệu');
                          }
                        } else {
                          // Gọi API để lấy chỉ pending
                          try {
                            const res = await getContractAmendmentsByStatus(currentAmendmentContractId, 'PENDING');
                            setAmendments(res.data || []);
                            console.log('Showing pending amendments only:', res.data);
                          } catch (e) {
                            console.error('Failed to load pending amendments:', e);
                            message.error('Lỗi khi tải dữ liệu');
                          }
                        }
                      }}
                      size="small"
                    >
                      {showAllAmendments ? "Chỉ hiển thị chờ duyệt" : "Hiển thị đã duyệt/từ chối"}
                    </Button>
                    

                  </div>
                  

                  
            <List
              dataSource={amendments.slice((amendmentsPage-1)*amendmentsPageSize, amendmentsPage*amendmentsPageSize)}
              renderItem={item => (
                      <List.Item>
                        <div style={{ 
                          width: '100%',
                          padding: 16, 
                          border: '1px solid #dee2e6', 
                          borderRadius: 6, 
                          backgroundColor: '#fff',
                          marginBottom: 12
                        }}>
                          {/* Header với loại và trạng thái */}
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            marginBottom: 12,
                            paddingBottom: 8,
                            borderBottom: '1px solid #f0f0f0'
                          }}>
                            <div style={{ fontSize: 15, fontWeight: 600, color: '#495057' }}>
                              Loại: {getAmendmentTypeText(item.amendmentType)}
                    </div>
                            <div style={{ 
                              padding: '4px 8px', 
                              borderRadius: 4, 
                              fontSize: 12,
                              fontWeight: 500,
                              backgroundColor: item.status === 'APPROVED' ? '#28a745' : 
                                               item.status === 'REJECTED' ? '#dc3545' : '#ffc107',
                              color: '#fff',
                              border: item.status === 'APPROVED' ? '1px solid #28a745' : 
                                      item.status === 'REJECTED' ? '1px solid #dc3545' : '1px solid #ffc107'
                            }}>
                              {getAmendmentStatusText(item.status)}
                    </div>
                    </div>
                    
                          {/* Lý do thay đổi */}
                          <div style={{ marginBottom: 16 }}>
                            <div style={{ 
                              fontWeight: 600, 
                              color: '#495057', 
                              marginBottom: 6,
                              fontSize: 13
                            }}>
                              Lý do thay đổi:
                        </div>
                            <div style={{ 
                              fontSize: 13, 
                              color: '#333',
                              padding: '8px 12px',
                              backgroundColor: '#f8f9fa',
                              borderRadius: 6,
                              border: '1px solid #e9ecef'
                            }}>
                              {item.reason || <span style={{ color: '#888', fontStyle: 'italic' }}>Không có lý do</span>}
                            </div>
                          </div>

                          {/* Hiển thị chi tiết thay đổi */}
                          {(item.oldValue || item.newValue) && (
                            <div style={{ 
                              marginBottom: 16, 
                              padding: 12, 
                              backgroundColor: '#f8f9fa', 
                              border: '1px solid #dee2e6', 
                              borderRadius: 6
                            }}>
                              <div style={{ 
                                fontWeight: 600, 
                                color: '#495057', 
                                marginBottom: 8,
                                fontSize: 13
                              }}>
                                Thay đổi:
                              </div>
                              
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                                {(() => {
                                  const oldLines = (item.oldValue || '').split(';').filter(line => line.trim());
                                  const newLines = (item.newValue || '').split(';').filter(line => line.trim());
                                  
                                  // Tạo map để so sánh từng phần
                                  const oldMap = {};
                                  const newMap = {};
                                  
                                  // Xử lý điều khoản trước - gộp tất cả thành 1 key
                                  let oldTerms = '';
                                  let newTerms = '';
                                  
                                  oldLines.forEach(line => {
                                    const key = line.split(':')[0]?.trim();
                                    if (key && key.includes('Điều khoản')) {
                                      oldTerms = line.trim();
                                    } else if (key) {
                                      oldMap[key] = line.trim();
                                    }
                                  });
                                  
                                  newLines.forEach(line => {
                                    const key = line.split(':')[0]?.trim();
                                    if (key && key.includes('Điều khoản')) {
                                      newTerms = line.trim();
                                    } else if (key) {
                                      newMap[key] = line.trim();
                                    }
                                  });
                                  
                                  // Gộp tất cả điều khoản vào một key duy nhất
                                  if (oldTerms || newTerms) {
                                    oldMap['Điều khoản'] = oldTerms;
                                    newMap['Điều khoản'] = newTerms;
                                  }
                                  
                                  // Lấy tất cả keys
                                  const allKeys = [...new Set([...Object.keys(oldMap), ...Object.keys(newMap)])];
                                  
                                  // Chỉ hiển thị những phần có thay đổi
                                  const filteredKeys = allKeys.filter(key => {
                                    const oldValue = oldMap[key] || '';
                                    const newValue = newMap[key] || '';
                                    
                                    // Nếu là số tiền, so sánh giá trị số
                                    if (key.includes('Tiền') || key.includes('tiền')) {
                                      const oldNum = parseFloat(oldValue.replace(/[^\d.-]/g, ''));
                                      const newNum = parseFloat(newValue.replace(/[^\d.-]/g, ''));
                                      return !isNaN(oldNum) && !isNaN(newNum) && oldNum !== newNum;
                                    } else if (key.includes('Điều khoản') || key.includes('điều khoản')) {
                                      // Xử lý đặc biệt cho điều khoản
                                      const oldClean = oldValue.replace(/^Điều khoản:\s*/, '').trim();
                                      const newClean = newValue.replace(/^Điều khoản:\s*/, '').trim();
                                      
                                      // Chuẩn hóa "Không có điều khoản" và "Không có"
                                      const normalizeTerms = (str) => {
                                        if (str === 'Không có điều khoản' || str === 'Không có' || str === '') {
                                          return 'Không có điều khoản';
                                        }
                                        return str;
                                      };
                                      
                                      const normalizedOld = normalizeTerms(oldClean);
                                      const normalizedNew = normalizeTerms(newClean);
                                      
                                      // Chỉ hiển thị nếu thực sự khác nhau
                                      return normalizedOld !== normalizedNew;
                                    } else {
                                      // So sánh chuỗi thông thường
                                      return oldValue !== newValue;
                                    }
                                  });
                                  
                                  // Loại bỏ các key trùng lặp về mặt ngữ nghĩa
                                  const uniqueKeys = [];
                                  const seenNormalized = new Set();
                                  
                                  filteredKeys.forEach(key => {
                                    const oldValue = oldMap[key] || '';
                                    const newValue = newMap[key] || '';
                                    
                                    if (key.includes('Điều khoản') || key.includes('điều khoản')) {
                                      const oldClean = oldValue.replace(/^Điều khoản:\s*/, '').trim();
                                      const newClean = newValue.replace(/^Điều khoản:\s*/, '').trim();
                                      
                                      const normalizeTerms = (str) => {
                                        if (str === 'Không có điều khoản' || str === 'Không có' || str === '') {
                                          return 'Không có điều khoản';
                                        }
                                        return str;
                                      };
                                      
                                      const normalizedOld = normalizeTerms(oldClean);
                                      const normalizedNew = normalizeTerms(newClean);
                                      const normalizedPair = `${normalizedOld}->${normalizedNew}`;
                                      
                                      if (!seenNormalized.has(normalizedPair)) {
                                        seenNormalized.add(normalizedPair);
                                        uniqueKeys.push(key);
                                      }
                                    } else {
                                      uniqueKeys.push(key);
                                    }
                                  });
                                  
                                  return uniqueKeys
                                    .map((key, index) => {
                                      const oldValue = oldMap[key] || 'Không có';
                                      const newValue = newMap[key] || 'Không có';
                                      
                                      return (
                                        <div key={index} style={{ 
                                          display: 'flex', 
                                          alignItems: 'center', 
                                          gap: 8,
                                          padding: '6px 0'
                                        }}>
                                          <div style={{ 
                                            flex: 1,
                                            padding: '6px 8px', 
                                            backgroundColor: '#fff', 
                                            border: '1px solid #dc3545', 
                                            borderRadius: 4,
                                            minHeight: '32px',
                                            display: 'flex',
                                            alignItems: 'center'
                                          }}>
                                            <span style={{ 
                                              color: '#dc3545', 
                                              fontWeight: 400,
                                              fontSize: 12,
                                              lineHeight: 1.3
                                            }}>
                                              {formatAmendmentValue(oldValue)}
                                            </span>
                                          </div>
                                          <span style={{ 
                                            color: '#6c757d', 
                                            fontSize: 14, 
                                            fontWeight: 400,
                                            padding: '0 6px'
                                          }}>→</span>
                                          <div style={{ 
                                            flex: 1,
                                            padding: '6px 8px', 
                                            backgroundColor: '#fff', 
                                            border: '1px solid #28a745', 
                                            borderRadius: 4,
                                            minHeight: '32px',
                                            display: 'flex',
                                            alignItems: 'center'
                                          }}>
                                            <span style={{ 
                                              color: '#28a745', 
                                              fontWeight: 400,
                                              fontSize: 12,
                                              lineHeight: 1.3
                                            }}>
                                              {formatAmendmentValue(newValue)}
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    });
                                })()}
                        </div>
                      </div>
                    )}

                          {/* Ngày tạo */}
                          <div style={{ 
                            fontSize: 13, 
                            color: '#6c757d',
                            marginBottom: 16,
                            padding: '8px 12px',
                            backgroundColor: '#f8f9fa',
                            borderRadius: 6,
                            border: '1px solid #e9ecef'
                          }}>
                            Ngày tạo: {item.createdDate ? new Date(item.createdDate).toLocaleDateString("vi-VN") : 'Không có'}
                          </div>

                          {/* Debug info - chỉ hiển thị trong development */}
                          

                          {/* Buttons cho PENDING */}
                          {(() => {
                            // Kiểm tra xem landlord có thể duyệt không
                            const canLandlordApprove = user && 
                              item.status === 'PENDING' && 
                              !item.approvedByLandlord && 
                              !(item.rejectedBy || []).includes(user.id);
                            
                            return canLandlordApprove ? (
                              <div style={{ display: 'flex', gap: 12 }}>
                                <Button
                                  type="primary"
                                  size="middle"
                                  onClick={() => handleApproveAmendment(item.id, true)}
                                  style={{ flex: 1, height: 40 }}
                                >
                                  Duyệt
                                </Button>
                                <Button
                                  danger
                                  size="middle"
                                  onClick={() => handleRejectAmendment(item.id)}
                                  style={{ flex: 1, height: 40 }}
                                >
                                  Từ chối
                                </Button>
                              </div>
                            ) : null;
                          })()}

                          {/* Lý do từ chối cho REJECTED */}
                          {item.status === 'REJECTED' && item.reason && (
                            <div style={{ 
                              marginTop: 12,
                              padding: 8,
                              backgroundColor: '#f8f9fa',
                              border: '1px solid #dee2e6',
                              borderRadius: 4
                            }}>
                              <div style={{ 
                                fontWeight: 600, 
                                color: '#495057',
                                fontSize: 13,
                                marginBottom: 4
                              }}>
                                Lý do từ chối:
                              </div>
                              <div style={{ 
                                fontSize: 12, 
                                color: '#6c757d',
                                fontStyle: 'italic'
                              }}>
                                {item.reason}
                              </div>
                            </div>
                          )}
                  </div>
                </List.Item>
              )}
              locale={{ emptyText: "Không có yêu cầu thay đổi" }}
            />
            {amendments.length > amendmentsPageSize && (
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <Pagination
                  current={amendmentsPage}
                  pageSize={amendmentsPageSize}
                  total={amendments.length}
                  onChange={setAmendmentsPage}
                  showSizeChanger={false}
                />
              </div>
            )}
                </>
              );
            })()}
          </Modal>
          <Modal 
            open={detailModalOpen} 
            onCancel={() => setDetailModalOpen(false)} 
            footer={null} 
            title="Chi tiết hợp đồng"
            width={700}
          >
            {detailContract ? (
              <div style={{ padding: '16px 0' }}>
                {/* Thông tin cơ bản */}
                <div style={{ 
                  padding: '16px', 
                  borderRadius: '8px', 
                  marginBottom: '20px',
                  border: '1px solid #d9d9d9'
                }}>
                  <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
                    Thông tin cơ bản
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div><b>Mã hợp đồng:</b> {detailContract.contractNumber || `#${detailContract.id}`}</div>
                    <div><b>Phòng:</b> {detailContract.roomNumber || detailContract.room?.roomNumber}</div>
                    <div><b>Trạng thái:</b> 
                      {detailContract.contractStatus === "TERMINATED" ? "Đã chấm dứt" : 
                       detailContract.contractStatus === "ACTIVE" ? "Đang hiệu lực" : 
                       detailContract.contractStatus === "EXPIRED" ? "Hết hạn" : detailContract.contractStatus}
                    </div>
                    <div><b>Chu kỳ thanh toán:</b> 
                      {detailContract.paymentCycle === 'MONTHLY' ? 'Hàng tháng' : 
                       detailContract.paymentCycle === 'QUARTERLY' ? 'Hàng quý' : 
                       detailContract.paymentCycle === 'YEARLY' ? 'Hàng năm' : detailContract.paymentCycle}
                    </div>
                  </div>
                </div>

                {/* Thông tin thời gian */}
                <div style={{ 
                  padding: '16px', 
                  borderRadius: '8px', 
                  marginBottom: '20px',
                  border: '1px solid #d9d9d9'
                }}>
                  <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
                    Thông tin thời gian
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div><b>Ngày bắt đầu:</b> 
                      {detailContract.contractStartDate ? new Date(detailContract.contractStartDate).toLocaleDateString("vi-VN") : 'Chưa có'}
                    </div>
                    <div><b>Ngày kết thúc:</b> 
                      {detailContract.contractEndDate ? new Date(detailContract.contractEndDate).toLocaleDateString("vi-VN") : 'Chưa có'}
                    </div>
                    <div><b>Ngày tạo:</b> 
                      {detailContract.createdDate ? new Date(detailContract.createdDate).toLocaleDateString("vi-VN") : 'Chưa có'}
                    </div>
                    <div><b>Ngày cập nhật:</b> 
                      {detailContract.updatedDate ? new Date(detailContract.updatedDate).toLocaleDateString("vi-VN") : 'Chưa có'}
                    </div>
                  </div>
                </div>

                {/* Thông tin tài chính */}
                <div style={{ 
                  padding: '16px', 
                  borderRadius: '8px', 
                  marginBottom: '20px',
                  border: '1px solid #d9d9d9'
                }}>
                  <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
                    Thông tin tài chính
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div><b>Tiền thuê:</b> 
                      {detailContract.rentAmount ? detailContract.rentAmount.toLocaleString() + " VND" : 'Chưa có'}
                    </div>
                    <div><b>Tiền cọc:</b> 
                      {detailContract.depositAmount ? detailContract.depositAmount.toLocaleString() + " VND" : 'Chưa có'}
                    </div>
                  </div>
                </div>

                {/* Thông tin người thuê */}
                <div style={{ 
                  padding: '16px', 
                  borderRadius: '8px', 
                  marginBottom: '20px',
                  border: '1px solid #d9d9d9'
                }}>
                  <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
                    Thông tin người thuê
                  </div>
                  {detailContract.roomUsers && detailContract.roomUsers.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                              {detailContract.roomUsers.map((user, idx) => (
                        <div key={idx} style={{ 
                          padding: '8px 12px', 
                          borderRadius: '6px',
                          border: '1px solid #d9d9d9'
                        }}>
                          <div><b>Tên:</b> {user.fullName || 'Không rõ'}</div>
                          <div><b>SĐT:</b> {user.phoneNumber || 'Không có'}</div>
                          <div><b>Email:</b> {user.email || 'Không có'}</div>
                          <div><b>Trạng thái:</b> 
                            {user.isActive !== false ? 'Đang thuê' : 'Đã rời'}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontStyle: 'italic' }}>Chưa có người thuê</div>
                  )}
                </div>

                {/* Điều khoản hợp đồng */}
                <div style={{ 
                  padding: '16px', 
                  borderRadius: '8px',
                  border: '1px solid #d9d9d9'
                }}>
                  <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
                    Điều khoản hợp đồng
                  </div>
                  {detailContract.terms && detailContract.terms.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                      {detailContract.terms.map((term, idx) => (
                        <li key={idx} style={{ 
                          marginBottom: '8px', 
                          padding: '8px 12px', 
                          borderRadius: '6px',
                          border: '1px solid #d9d9d9'
                        }}>
                          {term}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div style={{ fontStyle: 'italic' }}>Không có điều khoản cụ thể.</div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                Không tìm thấy thông tin hợp đồng
              </div>
            )}
          </Modal>
          <Modal
            open={terminateModalOpen}
            onCancel={() => setTerminateModalOpen(false)}
            onOk={doRequestTerminate}
            okText="Gửi yêu cầu"
            cancelText="Hủy"
            title="Bạn có chắc"
          >
            <div>Lý do kết thúc hợp đồng:</div>
            <Input.TextArea
              value={terminateReason}
              onChange={e => setTerminateReason(e.target.value)}
              rows={3}
            />
          </Modal>
          <Modal
            open={rejectModalOpen}
            onCancel={() => { setRejectModalOpen(false); setRejectingId(null); setRejectReason(""); }}
            onOk={doRejectAmendment}
            okText="Xác nhận từ chối"
            okType="danger"
            title="Lý do từ chối thay đổi hợp đồng"
            confirmLoading={rejectLoading}
            width={600}
          >
            <div style={{ marginBottom: 16 }}>
              <div style={{ 
                padding: 12, 
                backgroundColor: '#fff7e6', 
                border: '1px solid #ffd591', 
                borderRadius: 6,
                marginBottom: 16,
                borderLeft: '4px solid #fa8c16'
              }}>
                <div style={{ fontSize: 14, color: '#d46b08', marginBottom: 4, fontWeight: 500 }}>
                  ⚠️ Lưu ý:
                </div>
                <div style={{ fontSize: 13, color: '#8c8c8c' }}>
                  Vui lòng nhập lý do cụ thể để bên kia hiểu và có thể điều chỉnh đề xuất phù hợp.
                </div>
              </div>
              
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8, color: '#262626' }}>
                📝 Lý do từ chối:
              </div>
              <Input.TextArea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                rows={4}
                placeholder="VD: Thời gian không phù hợp, mức giá chưa hợp lý, điều khoản cần điều chỉnh..."
                style={{ fontSize: 14 }}
              />
            </div>
          </Modal>
        </Content>
      </Layout>
    </Layout>
  );
}
