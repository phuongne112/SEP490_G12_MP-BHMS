import React, { useEffect, useState } from "react";
import { Layout, message, Button, Popover, Select, Modal, Input, DatePicker, List } from "antd";
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
  requestTerminateContract
} from "../../services/roomUserApi";
import { getAllRooms } from "../../services/roomService";

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
      message.error("Export PDF failed");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteContract(id);
      message.success("Contract deleted");
      fetchRoomsAndLatestContracts();
    } catch {
      message.error("Delete failed");
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

  const handleUpdateContract = (contract) => {
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

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider width={220}>
        <LandlordSidebar />
      </Sider>
      <Layout>
        <Content style={{ padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <PageHeader title="Contract List" />
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
                <Button type="primary">Filter</Button>
              </Popover>
              <Button onClick={() => { setFilter({}); setFilterVisible(false); setCurrentPage(1); }}>Clear</Button>
            </div>
          </div>
          <div
            style={{
              height: 16
            }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <div>
              Show
              <Select
                style={{ width: 120, margin: "0 8px" }}
                value={pageSize}
                onChange={value => {
                  setPageSize(value);
                  setCurrentPage(1);
                  fetchRoomsAndLatestContracts(1, value);
                }}
                options={pageSizeOptions.map((v) => ({ value: v, label: `${v} / page` }))}
              />
              entries
            </div>
            <div style={{ fontWeight: 400, color: "#888" }}>
              Total: {total} contracts
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
          <Modal open={renewModalOpen} onCancel={() => setRenewModalOpen(false)} onOk={doRenewContract} okText="Renew" confirmLoading={updating} title="Renew Contract">
            <div>Select new end date:</div>
            <DatePicker value={renewDate} onChange={setRenewDate} style={{ width: '100%', marginTop: 8 }} format="DD/MM/YYYY" />
          </Modal>
          <Modal open={updateModalOpen} onCancel={() => setUpdateModalOpen(false)} onOk={doUpdateContract} okText="Submit Request" confirmLoading={updating} title="Update Contract">
            <div style={{ marginBottom: 8 }}>Reason for update:</div>
            <Input.TextArea value={updateReason} onChange={e => setUpdateReason(e.target.value)} rows={2} style={{ marginBottom: 12 }} />
            <div style={{ marginBottom: 8 }}>New end date:</div>
            <DatePicker value={updateEndDate} onChange={setUpdateEndDate} style={{ width: '100%', marginBottom: 12 }} format="DD/MM/YYYY" />
            <div style={{ marginBottom: 8 }}>New rent amount:</div>
            <Input type="number" value={updateRentAmount} onChange={e => setUpdateRentAmount(e.target.value)} style={{ marginBottom: 12 }} />
            <div style={{ marginBottom: 8 }}>New deposit amount:</div>
            <Input type="number" value={updateDeposit} onChange={e => setUpdateDeposit(e.target.value)} style={{ marginBottom: 12 }} />
            <div style={{ marginBottom: 8 }}>Payment cycle:</div>
            <Select value={updatePaymentCycle} onChange={setUpdatePaymentCycle} style={{ width: '100%', marginBottom: 12 }} options={paymentCycleOptions.map(opt => ({...opt, label: opt.value === 'MONTHLY' ? 'Monthly' : opt.value === 'QUARTERLY' ? 'Quarterly' : 'Yearly'}))} />
            <div style={{ marginBottom: 8, fontWeight: 500 }}>Contract terms:</div>
            <ul style={{ margin: '8px 0 8px 16px', padding: 0 }}>
              {updateTerms.length === 0 && <li>No terms yet</li>}
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
                    Delete
                  </Button>
                </li>
              ))}
            </ul>
            <Button
              type="dashed"
              style={{ width: '100%', marginBottom: 12 }}
              onClick={() => setUpdateTerms(prev => [...prev, ""])}
            >
              + Add term
            </Button>
            <div style={{ marginBottom: 8 }}>
              Tenants in new contract ({updateRenters.length}/{maxCount}):
            </div>
            <ul style={{ margin: '8px 0 8px 16px', padding: 0 }}>
              {updateRenters.length === 0 && <li>No tenants yet</li>}
              {updateRenters.map(id => {
                const user = allRenters.find(r => r.id === id);
                return (
                  <li key={id} style={{ marginBottom: 4, display: 'flex', alignItems: 'center' }}>
                    <span>
                      {user?.fullName || 'Unknown name'}
                      {user?.phoneNumber ? ` (${user.phoneNumber})` : ''}
                      {updateContract?.roomUsers?.some(u => (u.userId || u.id) === id && u.isActive !== false) ? ' (Current)' : ' (New)'}
                    </span>
                    <Button
                      type="link"
                      danger
                      size="small"
                      style={{ marginLeft: 8 }}
                      onClick={() => setUpdateRenters(prev => prev.filter(uid => uid !== id))}
                    >
                      X
                    </Button>
                  </li>
                );
              })}
            </ul>
            {updateRenters.length < maxCount && (
              <Select
                style={{ width: '100%', marginBottom: 8 }}
                showSearch
                placeholder="Add tenant to contract"
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
                    label: `${r.fullName || 'Unknown name'}${r.phoneNumber ? ` (${r.phoneNumber})` : ''}`
                  }))}
              />
            )}
            <div style={{ color: '#888', fontSize: 12, marginTop: 8 }}>
              * If you remove a current tenant, they will be removed from the new contract.<br/>
              * If you add a new tenant, they will be added to the new contract.<br/>
              * Maximum number of tenants: {maxCount}
            </div>
          </Modal>
          <Modal open={amendmentsModalOpen} onCancel={() => setAmendmentsModalOpen(false)} footer={null} title="Contract Change Requests">
            <List
              dataSource={amendments}
              renderItem={item => (
                <List.Item
                  style={{ flexDirection: 'column', alignItems: 'flex-start', padding: 16, borderBottom: '1px solid #f0f0f0' }}
                  actions={[]}
                >
                  <div style={{ width: '100%' }}>
                    <div style={{ fontWeight: 600, color: '#d46b08', marginBottom: 4 }}>
                      Reason for change:
                    </div>
                    <div style={{ marginBottom: 8, color: '#222' }}>{item.reason || <span style={{ color: '#888' }}>No reason provided</span>}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 8 }}>
                      <div><b>Type:</b> {item.amendmentType}</div>
                      <div><b>Status:</b> {item.status}</div>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <b>Change:</b> <span style={{ color: '#1677ff' }}>{item.oldValue}</span> &rarr; <span style={{ color: '#52c41a' }}>{item.newValue}</span>
                    </div>
                    {item.status === 'PENDING' && !item.approvedByLandlord && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <Button
                          type="primary"
                          onClick={() => handleApproveAmendment(item.id, true)}
                        >
                          Approve
                        </Button>
                        <Button
                          danger
                          onClick={() => message.info('Reject action not yet implemented')}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </List.Item>
              )}
              locale={{ emptyText: "No change requests" }}
            />
          </Modal>
          <Modal open={detailModalOpen} onCancel={() => setDetailModalOpen(false)} footer={null} title="Chi tiết hợp đồng">
            {detailContract ? (
              <>
                <div><b>Mã hợp đồng:</b> {detailContract.contractNumber || detailContract.id}</div>
                <div><b>Phòng:</b> {detailContract.roomNumber}</div>
                <div><b>Ngày bắt đầu:</b> {detailContract.contractStartDate ? new Date(detailContract.contractStartDate).toLocaleDateString() : ''}</div>
                <div><b>Ngày kết thúc:</b> {detailContract.contractEndDate ? new Date(detailContract.contractEndDate).toLocaleDateString() : ''}</div>
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
            title="Yêu cầu kết thúc hợp đồng"
          >
            <div>Lý do kết thúc hợp đồng:</div>
            <Input.TextArea
              value={terminateReason}
              onChange={e => setTerminateReason(e.target.value)}
              rows={3}
            />
          </Modal>
        </Content>
      </Layout>
    </Layout>
  );
}
