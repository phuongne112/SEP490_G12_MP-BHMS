import React, { useEffect, useState } from "react";
import { Layout, message, Button, Popover, Select, Modal, Input, DatePicker, List, Pagination } from "antd";
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
  processExpiredContracts,
  approveAmendment,
  requestTerminateContract,
  rejectAmendment
} from "../../services/roomUserApi";
import { getAllRooms } from "../../services/roomService";
import { FilterOutlined } from "@ant-design/icons";

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
  const amendmentsPageSize = 5;
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectLoading, setRejectLoading] = useState(false);

  const user = useSelector((state) => state.account.user);

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
        message.error("Failed to load contracts, but rooms loaded successfully");
        allContracts = [];
      }
      
      const data = roomsData.map(room => {
        const contractsOfRoom = allContracts.filter(c => {
          const contractRoomId = c.roomId || (c.room && c.room.id);
          return String(contractRoomId) === String(room.id);
        });
        // Ưu tiên hợp đồng ACTIVE, nếu không có thì lấy hợp đồng có ngày cập nhật mới nhất
        let latestContract = contractsOfRoom.find(c => c.contractStatus === 'ACTIVE');
        if (!latestContract) {
          latestContract = contractsOfRoom
            .sort((a, b) => {
              const dateA = new Date(a.updatedDate || a.createdDate || 0);
              const dateB = new Date(b.updatedDate || b.createdDate || 0);
              return dateB - dateA;
            })[0] || null;
        }
        return {
          ...room,
          latestContract: latestContract ? { ...latestContract, roomId: room.id, roomNumber: room.roomNumber } : null
        };
      })
      .filter(room => room.latestContract);
      setRoomContracts(data);
      setTotal(roomRes.meta?.total || data.length);
    } catch (err) {
      console.error("Error in fetchRoomsAndLatestContracts:", err);
      message.error("Failed to load rooms/contracts");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRoomsAndLatestContracts(currentPage, pageSize);
    // eslint-disable-next-line
  }, [filter, currentPage, pageSize, selectedRoomId]);

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
      const isoDate = dayjs(renewDate).endOf('day').toISOString(); // ví dụ: "2025-12-31T16:59:59.000Z"
      await renewContract(selectedContract.id, isoDate);
  
      message.success("Gia hạn thành công");
      setRenewModalOpen(false);
      fetchRoomsAndLatestContracts();
    } catch (e) {
      console.error("Lỗi khi gia hạn hợp đồng:", e);
      message.error("Gia hạn thất bại");
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
      fetchRoomsAndLatestContracts();
    } catch {
      message.error("Gửi yêu cầu thất bại!");
    } finally {
      setUpdating(false);
    }
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
    if (!updateReason) return message.error("Nhập lý do cập nhật!");
    setUpdating(true);
    try {
      await updateRoomUserContract({
        contractId: updateContract.id,
        newRentAmount: updateRentAmount,
        newDepositAmount: updateDeposit,
        newEndDate: updateEndDate ? dayjs(updateEndDate).endOf('day').toISOString() : null,
        newTerms: updateTerms,
        reasonForUpdate: updateReason,
        requiresTenantApproval: true,
        renterIds: updateRenters
      });
      message.success("Đã gửi yêu cầu cập nhật");
      setUpdateModalOpen(false);
      fetchRoomsAndLatestContracts();
    } catch (e) {
      message.error("Cập nhật thất bại");
    } finally { setUpdating(false); }
  };

  const handleViewAmendments = async (contractId) => {
    setAmendments([]);
    setAmendmentsModalOpen(true);
    setAmendmentsPage(1); // Reset page when opening amendments modal
    try {
      const res = await getContractAmendments(contractId);
      setAmendments(res.data);
    } catch {
      setAmendments([]);
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
      message.success('Phê duyệt thành công!');
      handleViewAmendments(updateContract.id);
    } catch (e) {
      message.error('Phê duyệt thất bại!');
    }
  };

  const handleRejectAmendment = (amendmentId) => {
    setRejectingId(amendmentId);
    setRejectReason("");
    setRejectModalOpen(true);
  };

  const doRejectAmendment = async () => {
    if (!rejectReason) {
      message.error("Vui lòng nhập lý do từ chối!");
      return;
    }
    setRejectLoading(true);
    try {
      await rejectAmendment(rejectingId, rejectReason);
      message.success("Đã từ chối yêu cầu thay đổi!");
      setRejectModalOpen(false);
      setRejectingId(null);
      setRejectReason("");
      // Cập nhật lại danh sách amendment
      if (updateContract) {
        handleViewAmendments(updateContract.id);
      } else if (selectedContract) {
        handleViewAmendments(selectedContract.id);
      } else {
        // fallback: reload modal
        setAmendments(prev => prev.map(item => item.id === rejectingId ? { ...item, status: 'REJECTED' } : item));
      }
    } catch {
      message.error("Từ chối thất bại!");
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
      case 'OTHER': return 'Khác';
      case 'TERMINATION': return 'Chấm dứt';
      case 'DURATION_EXTENSION': return 'Gia hạn';
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
        <Content style={{ padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <PageHeader title="Danh sách hợp đồng" />
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Popover
                content={
                  <ContractFilterPopover
                    rooms={roomContracts}
                    tenants={allRenters}
                    onApply={handleFilterApply}
                  />
                }
                trigger="click"
                open={filterVisible}
                onOpenChange={setFilterVisible}
                placement="bottomRight"
              >
                <Button icon={<FilterOutlined />}>Bộ lọc</Button>
              </Popover>
              <Button onClick={() => { setFilter({}); setFilterVisible(false); setCurrentPage(1); }}>Xóa lọc</Button>
            </div>
          </div>
          <div style={{ height: 16 }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div>
              Hiển thị
              <Select
                style={{ width: 120, margin: "0 8px" }}
                value={pageSize}
                onChange={value => {
                  setPageSize(value);
                  setCurrentPage(1);
                  fetchRoomsAndLatestContracts(1, value);
                }}
                options={pageSizeOptions.map((v) => ({ value: v, label: `${v} / trang` }))}
              />
              mục
            </div>
            <div style={{ fontWeight: 400, color: "#888" }}>
              Tổng: {total} hợp đồng
            </div>
          </div>
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
          <Modal open={renewModalOpen} onCancel={() => setRenewModalOpen(false)} onOk={doRenewContract} okText="Gia hạn hợp đồng" confirmLoading={updating} title="Gia hạn hợp đồng">
            <div>Chọn ngày kết thúc mới:</div>
            <DatePicker value={renewDate} onChange={setRenewDate} style={{ width: '100%', marginTop: 8 }} format="DD/MM/YYYY" placeholder="Chọn ngày" />
          </Modal>
          <Modal open={updateModalOpen} onCancel={() => setUpdateModalOpen(false)} onOk={doUpdateContract} okText="Cập nhật hợp đồng" confirmLoading={updating} title="Cập nhật hợp đồng">
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
            <ul style={{ margin: '8px 0 8px 16px', padding: 0 }}>
              {updateTerms.length === 0 && <li>Chưa có điều khoản</li>}
              {updateTerms.map((term, idx) => (
                <li key={idx} style={{ marginBottom: 4, display: 'flex', alignItems: 'center' }}>
                  <Input.TextArea
                    value={term}
                    onChange={e => {
                      const newTerms = [...updateTerms];
                      newTerms[idx] = e.target.value;
                      setUpdateTerms(newTerms);
                    }}
                    autoSize
                    style={{ flex: 1, marginRight: 8 }}
                  />
                  <Button
                    type="link"
                    danger
                    size="small"
                    onClick={() => setUpdateTerms(prev => prev.filter((_, i) => i !== idx))}
                  >
                    Xóa
                  </Button>
                </li>
              ))}
            </ul>
            <Button
              type="dashed"
              style={{ width: '100%', marginBottom: 12 }}
              onClick={() => setUpdateTerms(prev => [...prev, ""])}
            >
              + Thêm điều khoản
            </Button>
            <div style={{ marginBottom: 8 }}>
              Người thuê trong hợp đồng mới ({updateRenters.length}/{maxCount}):
            </div>
            <ul style={{ margin: '8px 0 8px 16px', padding: 0 }}>
              {updateRenters.length === 0 && <li>Chưa có người thuê</li>}
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
            <div style={{ color: '#888', fontSize: 12, marginTop: 8 }}>
              * Nếu bạn xóa người thuê hiện tại, họ sẽ bị loại khỏi hợp đồng mới.<br/>
              * Nếu bạn thêm người thuê mới, họ sẽ được thêm vào hợp đồng mới.<br/>
              * Số lượng người thuê tối đa: {maxCount}
            </div>
          </Modal>
          <Modal open={amendmentsModalOpen} onCancel={() => { setAmendmentsModalOpen(false); setAmendmentsPage(1); }} footer={null} title="Yêu cầu thay đổi hợp đồng">
            <div style={{ fontWeight: 600, color: '#d46b08', marginBottom: 4 }}>
              Lý do thay đổi:
            </div>
            <List
              dataSource={amendments.slice((amendmentsPage-1)*amendmentsPageSize, amendmentsPage*amendmentsPageSize)}
              renderItem={item => (
                <List.Item
                  style={{ flexDirection: 'column', alignItems: 'flex-start', padding: 16, borderBottom: '1px solid #f0f0f0' }}
                  actions={[]}
                >
                  <div style={{ width: '100%' }}>
                    {/* Giao diện gộp gọn, dễ nhìn */}
                    <div style={{ marginBottom: 8 }}>
                      <b>Lý do thay đổi:</b> {item.reason || <span style={{ color: '#888' }}>Không có lý do</span>}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 8 }}>
                      <div><b>Loại:</b> {getAmendmentTypeText(item.amendmentType)}</div>
                      <div><b>Trạng thái:</b> {getAmendmentStatusText(item.status)}</div>
                      <div><b>Ngày tạo:</b> {item.createdDate ? new Date(item.createdDate).toLocaleDateString("vi-VN") : 'Không có'}</div>
                    </div>
                    {item.status === 'REJECTED' && (
                      <div style={{ color: '#d4380d', marginBottom: 8 }}>
                        <b>Yêu cầu đã bị từ chối.</b>
                        {item.reason && (
                          <div>Lý do từ chối: <i>{item.reason}</i></div>
                        )}
                      </div>
                    )}
                    <div style={{ marginBottom: 8 }}>
                      <b>Trạng thái phê duyệt:</b>
                      <span style={{ marginLeft: 8 }}>
                        <b>Chủ nhà:</b>
                        {item.approvedByLandlord
                          ? <span style={{ color: '#389e0d', marginLeft: 4 }}>✔️ Đã đồng ý</span>
                          : (item.status === "REJECTED" && !item.approvedByLandlord
                              ? <span style={{ color: '#d4380d', marginLeft: 4 }}>❌ Đã từ chối</span>
                              : <span style={{ color: '#faad14', marginLeft: 4 }}>⏳ Chưa phản hồi</span>
                            )
                        }
                      </span>
                      {item.pendingApprovals && [...item.pendingApprovals].sort((a, b) => a - b).map(uid => {
                        const isApproved = item.approvedBy && item.approvedBy.includes(uid);
                        return (
                          <span key={uid} style={{ marginLeft: 16 }}>
                            <b>{userIdToName[uid] || `Người thuê ${uid}`}:</b>
                            {isApproved
                              ? <span style={{ color: '#389e0d', marginLeft: 4 }}>✔️ Đã đồng ý</span>
                              : (item.status === "REJECTED" && !isApproved
                                  ? <span style={{ color: '#d4380d', marginLeft: 4 }}>❌ Đã từ chối</span>
                                  : <span style={{ color: '#faad14', marginLeft: 4 }}>⏳ Chưa phản hồi</span>
                                )
                            }
                          </span>
                        );
                      })}
                    </div>
                    {/* Thay đổi điều kiện hiển thị nút Duyệt/Từ chối */}
                    {item.status === 'PENDING' && !item.approvedByLandlord && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <Button
                          type="primary"
                          onClick={() => handleApproveAmendment(item.id, true)}
                        >
                          Duyệt
                        </Button>
                        <Button
                          danger
                          onClick={() => handleRejectAmendment(item.id)}
                        >
                          Từ chối
                        </Button>
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
          </Modal>
          <Modal open={detailModalOpen} onCancel={() => setDetailModalOpen(false)} footer={null} title="Chi tiết hợp đồng">
            {detailContract ? (
              <>
                <div><b>Mã hợp đồng:</b> {detailContract.contractNumber || detailContract.id}</div>
                <div><b>Phòng:</b> {detailContract.roomNumber}</div>
                <div><b>Ngày bắt đầu:</b> {detailContract.contractStartDate ? new Date(detailContract.contractStartDate).toLocaleDateString("vi-VN") : ''}</div>
                <div><b>Ngày kết thúc:</b> {detailContract.contractEndDate ? new Date(detailContract.contractEndDate).toLocaleDateString("vi-VN") : ''}</div>
                <div style={{ margin: '16px 0 8px 0', fontWeight: 500 }}>Danh sách điều khoản:</div>
                <ul style={{ marginLeft: 16 }}>
                  {detailContract.terms && detailContract.terms.length > 0 ? detailContract.terms.map((term, idx) => (
                    <li key={idx}>{term}</li>
                  )) : <li>Không có điều khoản cụ thể.</li>}
                </ul>
              </>
            ) : null}
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
            title="Lý do từ chối thay đổi hợp đồng"
            confirmLoading={rejectLoading}
          >
            <div>Vui lòng nhập lý do từ chối:</div>
            <Input.TextArea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              style={{ width: '100%', marginTop: 8 }}
            />
          </Modal>
        </Content>
      </Layout>
    </Layout>
  );
}
