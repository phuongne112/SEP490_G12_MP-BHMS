import React, { useEffect, useState } from "react";
import { Layout, message, Button, Popover, Select, Modal, Input, DatePicker, List } from "antd";
import PageHeader from "../../components/common/PageHeader";
import { getAllContracts, deleteContract, exportContractPdf } from "../../services/contractApi";
import { useSelector } from "react-redux";
import AdminSidebar from "../../components/layout/AdminSidebar";
import LandlordSidebar from "../../components/layout/LandlordSidebar";
import ContractTable from "../../components/landlord/ContractTable";
import ContractFilterPopover from "../../components/landlord/ContractFilterPopover";
import dayjs from "dayjs";
import { getAllRenters, getRentersForAssign } from "../../services/renterApi";
import {
  renewContract,
  terminateContract,
  updateContract as updateRoomUserContract,
  getContractAmendments,
  processExpiredContracts,
  approveAmendment
} from "../../services/roomUserApi";

const { Sider, Content } = Layout;

const paymentCycleOptions = [
  { value: "MONTHLY", label: "Hàng tháng" },
  { value: "QUARTERLY", label: "Hàng quý" },
  { value: "YEARLY", label: "Hàng năm" },
];

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
  const [updateSpecialTerms, setUpdateSpecialTerms] = useState("");
  const [updateRenters, setUpdateRenters] = useState([]);
  const [allRenters, setAllRenters] = useState([]);

  const user = useSelector((state) => state.account.user);

  const fetchContracts = async (page = currentPage, size = pageSize) => {
    setLoading(true);
    try {
      const params = { ...filter, page: page - 1, size };
      const res = await getAllContracts(params);
      setContracts(res.result || []);
      setTotal(res.meta?.total || 0);
    } catch (err) {
      message.error("Failed to load contracts");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchContracts(currentPage, pageSize);
    // eslint-disable-next-line
  }, [filter, currentPage, pageSize]);

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
      fetchContracts();
    } catch {
      message.error("Delete failed");
    }
  };

  const handleFilterApply = (values) => {
    const params = {};
    if (values.status && values.status !== "ALL") params.contractStatus = values.status;
    if (values.dateRange && values.dateRange.length === 2) {
      params.contractStartDateFrom = values.dateRange[0]?.startOf("day").toISOString();
      params.contractStartDateTo = values.dateRange[1]?.endOf("day").toISOString();
    }
    setFilter(params);
    setFilterVisible(false);
  };

  const handlePageSizeChange = (value) => {
    setPageSize(value);
    setCurrentPage(1);
    fetchContracts(1, value);
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
      fetchContracts();
    } catch (e) {
      console.error("Lỗi khi gia hạn hợp đồng:", e);
      message.error("Gia hạn thất bại");
    } finally {
      setUpdating(false);
    }
  };
  

  const handleTerminateContract = async (contractId) => {
    setUpdating(true);
    try {
      await terminateContract(contractId);
      message.success("Đã kết thúc hợp đồng");
      fetchContracts();
    } catch (e) {
      message.error("Kết thúc hợp đồng thất bại");
    } finally { setUpdating(false); }
  };

  const handleUpdateContract = (contract) => {
    setUpdateContract(contract);
    setUpdateReason("");
    setUpdateRentAmount(contract.rentAmount);
    setUpdateDeposit(contract.depositAmount);
    setUpdateEndDate(contract.contractEndDate ? dayjs(contract.contractEndDate) : null);
    setUpdatePaymentCycle(contract.paymentCycle);
    setUpdateSpecialTerms(contract.contractImage || "");
    setUpdateRenters(
      contract.roomUsers?.filter(u => u.isActive !== false).map(u => u.userId || u.id) || []
    );
    setUpdateModalOpen(true);
    getRentersForAssign().then(res => {
      console.log('API getRentersForAssign trả về:', res);
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
        reasonForUpdate: updateReason,
        rentAmount: updateRentAmount,
        depositAmount: updateDeposit,
        contractEndDate: updateEndDate ? dayjs(updateEndDate).endOf('day').toISOString() : null,
        paymentCycle: updatePaymentCycle,
        specialTerms: updateSpecialTerms,
        renterIds: updateRenters
      });
      message.success("Đã gửi yêu cầu cập nhật");
      setUpdateModalOpen(false);
      fetchContracts();
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
      fetchContracts();
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

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider width={240}>
        {user?.role?.roleName?.toUpperCase?.() === "ADMIN" || user?.role?.roleName?.toUpperCase?.() === "SUBADMIN" ? (
          <AdminSidebar />
        ) : (
          <LandlordSidebar />
        )}
      </Sider>
      <Layout>
        <Content style={{ padding: "24px" }}>
          <PageHeader
            title="Contract List"
            extra={[
              <Button danger key="expired" onClick={handleProcessExpiredContracts}>
                Xử lý hợp đồng hết hạn
              </Button>,
              <Popover
                key="filter"
                content={<ContractFilterPopover onApply={handleFilterApply} />}
                title={null}
                trigger="click"
                open={filterVisible}
                onOpenChange={setFilterVisible}
              >
                <Button>Filter</Button>
              </Popover>
            ]}
          />
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
                style={{ width: 80, margin: "0 8px", marginLeft: 8, marginRight: 8 }}
                value={pageSize}
                onChange={handlePageSizeChange}
                options={pageSizeOptions.map((v) => ({ value: v, label: v }))}
              />
              entries
            </div>
            <div style={{ fontWeight: 400, color: "#888" }}>
              Total: {total} contracts
            </div>
          </div>
          <ContractTable
            contracts={contracts}
            onExport={handleExport}
            onDelete={handleDelete}
            onUpdate={handleUpdateContract}
            onRenew={handleRenewContract}
            onViewAmendments={handleViewAmendments}
            onTerminate={handleTerminateContract}
            loading={loading || updating}
          />
          <Modal open={renewModalOpen} onCancel={() => setRenewModalOpen(false)} onOk={doRenewContract} okText="Gia hạn" confirmLoading={updating} title="Gia hạn hợp đồng">
            <div>Chọn ngày kết thúc mới:</div>
            <DatePicker value={renewDate} onChange={setRenewDate} style={{ width: '100%', marginTop: 8 }} format="DD/MM/YYYY" />
          </Modal>
          <Modal open={updateModalOpen} onCancel={() => setUpdateModalOpen(false)} onOk={doUpdateContract} okText="Gửi yêu cầu" confirmLoading={updating} title="Cập nhật hợp đồng">
            <div style={{ marginBottom: 8 }}>Lý do cập nhật:</div>
            <Input.TextArea value={updateReason} onChange={e => setUpdateReason(e.target.value)} rows={2} style={{ marginBottom: 12 }} />
            <div style={{ marginBottom: 8 }}>Ngày kết thúc mới:</div>
            <DatePicker value={updateEndDate} onChange={setUpdateEndDate} style={{ width: '100%', marginBottom: 12 }} format="DD/MM/YYYY" />
            <div style={{ marginBottom: 8 }}>Giá thuê mới:</div>
            <Input type="number" value={updateRentAmount} onChange={e => setUpdateRentAmount(e.target.value)} style={{ marginBottom: 12 }} />
            <div style={{ marginBottom: 8 }}>Tiền đặt cọc mới:</div>
            <Input type="number" value={updateDeposit} onChange={e => setUpdateDeposit(e.target.value)} style={{ marginBottom: 12 }} />
            <div style={{ marginBottom: 8 }}>Chu kỳ thanh toán:</div>
            <Select value={updatePaymentCycle} onChange={setUpdatePaymentCycle} style={{ width: '100%', marginBottom: 12 }} options={paymentCycleOptions} />
            <div style={{ marginBottom: 8 }}>Điều khoản đặc biệt (ghi chú):</div>
            <Input.TextArea value={updateSpecialTerms} onChange={e => setUpdateSpecialTerms(e.target.value)} rows={2} style={{ marginBottom: 12 }} />
            <div style={{ marginBottom: 8 }}>
              Chọn người thuê ({currentCount}/{maxCount}):
            </div>
            <Select
              mode="multiple"
              value={updateRenters}
              onChange={setUpdateRenters}
              style={{ width: '100%' }}
              options={selectOptions}
              placeholder={`Chọn người thuê mới cho hợp đồng (${updateRenters.length}/${updateContract?.maxOccupants || 0})`}
            />
            {/* Danh sách người đang thuê hiện tại */}
            {updateContract && Array.isArray(updateContract.roomUsers) && (
              <div style={{ marginTop: 16 }}>
                <b>Người đang thuê hiện tại:</b>
                <ul style={{ margin: '8px 0 0 16px', padding: 0 }}>
                  {updateContract.roomUsers
                    .filter(u => u.isActive !== false && updateRenters.includes(u.userId || u.id))
                    .map(u => (
                      <li key={u.userId || u.id} style={{ marginBottom: 4, display: 'flex', alignItems: 'center' }}>
                        <span>
                          {u.fullName || 'Không rõ tên'}
                          {u.phoneNumber ? ` (${u.phoneNumber})` : ''}
                          {u.joinedAt ? ` - từ ${dayjs(u.joinedAt).format('DD/MM/YYYY')}` : ''}
                        </span>
                        <Button
                          type="link"
                          danger
                          size="small"
                          style={{ marginLeft: 8 }}
                          onClick={() => {
                            setUpdateRenters(prev => prev.filter(id => id !== (u.userId || u.id)));
                          }}
                        >
                          X
                        </Button>
                      </li>
                    ))}
                  {updateContract.roomUsers.filter(u => u.isActive !== false && updateRenters.includes(u.userId || u.id)).length === 0 && (
                    <li>Không có người thuê nào đang ở</li>
                  )}
                </ul>
              </div>
            )}
          </Modal>
          <Modal open={amendmentsModalOpen} onCancel={() => setAmendmentsModalOpen(false)} footer={null} title="Lịch sử thay đổi hợp đồng">
            <List
              dataSource={amendments}
              renderItem={item => (
                <List.Item
                  actions={[
                    item.status === 'PENDING' && !item.approvedByLandlord && (
                      <Button
                        type="primary"
                        onClick={() => handleApproveAmendment(item.id, true)}
                      >
                        Landlord duyệt
                      </Button>
                    )
                  ]}
                >
                  <div>
                    <b>{item.amendmentType}</b> | {item.oldValue} → {item.newValue} | {item.status}
                    <div style={{ color: '#888', fontSize: 12 }}>{item.reason}</div>
                  </div>
                </List.Item>
              )}
              locale={{ emptyText: "Không có thay đổi nào" }}
            />
          </Modal>
        </Content>
      </Layout>
    </Layout>
  );
}
