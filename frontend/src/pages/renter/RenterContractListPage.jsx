import React, { useEffect, useState } from "react";
import { Layout, Button, Modal, List, message, Table, DatePicker } from "antd";
import PageHeader from "../../components/common/PageHeader";
import RenterSidebar from "../../components/layout/RenterSidebar";
import dayjs from "dayjs";
import "dayjs/locale/vi";
import locale from "antd/locale/vi_VN";
import { getRenterContracts } from "../../services/contractApi";
import { getContractAmendments, approveAmendment, renewContract } from "../../services/roomUserApi";
import { useSelector } from "react-redux";

// Cấu hình dayjs để sử dụng locale tiếng Việt
dayjs.locale('vi');

const { Sider, Content } = Layout;

export default function RenterContractListPage() {
  const [contracts, setContracts] = useState([]);
  const [amendmentsModalOpen, setAmendmentsModalOpen] = useState(false);
  const [amendments, setAmendments] = useState([]);
  const [selectedContract, setSelectedContract] = useState(null);
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [renewReason, setRenewReason] = useState("");
  const [renewEndDate, setRenewEndDate] = useState(null);
  const [renewingContract, setRenewingContract] = useState(false);
  const [selectedRenewContract, setSelectedRenewContract] = useState(null);
  const user = useSelector((state) => state.account.user);

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      const res = await getRenterContracts();
      const all = res.data || [];
      // Lấy hợp đồng ACTIVE nếu có, nếu không lấy hợp đồng có contractEndDate lớn nhất
      const active = all.find(c => c.contractStatus === 'ACTIVE');
      let latest = null;
      if (!active && all.length > 0) {
        latest = all.reduce((max, curr) => new Date(curr.contractEndDate) > new Date(max.contractEndDate) ? curr : max, all[0]);
      }
      setContracts(active ? [active] : latest ? [latest] : []);
    } catch {
      setContracts([]);
    }
  };

  const handleViewAmendments = async (contract) => {
    setSelectedContract(contract);
    setAmendments([]);
    setAmendmentsModalOpen(true);
    try {
      const res = await getContractAmendments(contract.id);
      setAmendments(res.data);
    } catch {
      setAmendments([]);
    }
  };

  const handleApproveAmendment = async (amendmentId) => {
    try {
      await approveAmendment(amendmentId, false); // false = renter duyệt
      message.success('Phê duyệt thành công!');
      // Auto refresh trang
      window.location.reload();
    } catch (e) {
      message.error('Phê duyệt thất bại!');
    }
  };

  const openRenewModal = (contract) => {
    setSelectedRenewContract(contract);
    setRenewModalOpen(true);
    setRenewReason("");
    setRenewEndDate(null);
  };
  const handleSendRenewRequest = async () => {
    if (!renewEndDate) {
      message.error('Vui lòng chọn ngày kết thúc mới!');
      return;
    }
    setRenewingContract(true);
    try {
      await renewContract(selectedRenewContract.id, renewEndDate);
      message.success('Đã gửi yêu cầu gia hạn, chờ chủ nhà duyệt!');
      setRenewModalOpen(false);
      // Auto refresh trang
      window.location.reload();
    } catch (e) {
      message.error('Gửi yêu cầu gia hạn thất bại!');
    } finally {
      setRenewingContract(false);
    }
  };

  const columns = [
    { title: "Mã hợp đồng", dataIndex: "id", key: "id" },
    { title: "Phòng", dataIndex: "roomNumber", key: "roomNumber" },
    { title: "Ngày bắt đầu", dataIndex: "contractStartDate", key: "contractStartDate", render: d => dayjs(d).format("DD/MM/YYYY") },
    { title: "Ngày kết thúc", dataIndex: "contractEndDate", key: "contractEndDate", render: d => dayjs(d).format("DD/MM/YYYY") },
          {
        title: "Thao tác",
        key: "actions",
      render: (_, record) => (
        <>
          <Button onClick={() => handleViewAmendments(record)} style={{ marginRight: 8 }}>Lịch sử thay đổi</Button>
          {(record.status === 'ACTIVE' || dayjs(record.contractEndDate).diff(dayjs(), 'day') < 30) && (
            <Button type="primary" onClick={() => openRenewModal(record)}>
              Yêu cầu gia hạn
            </Button>
          )}
        </>
      )
    }
  ];

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider width={240}>
        <RenterSidebar />
      </Sider>
      <Layout>
        <Content style={{ padding: "24px" }}>
          <PageHeader title="Hợp đồng của tôi" />
          <Table
            dataSource={contracts}
            columns={columns}
            rowKey="id"
            pagination={false}
          />

          <Modal
            open={amendmentsModalOpen}
            onCancel={() => setAmendmentsModalOpen(false)}
            footer={null}
            title="Lịch sử thay đổi hợp đồng"
            width={800}
          >
            <List
              dataSource={amendments}
              renderItem={item => {
                const total = item.pendingApprovals?.length || 0;
                const approved = item.approvedBy?.length || 0;
                const isMyTurn = user && item.status === 'PENDING' && item.pendingApprovals?.includes(user.id) && !item.approvedBy?.includes(user.id) && !(item.rejectedBy || []).includes(user.id);
                return (
                  <List.Item
                    actions={[
                      item.status === 'PENDING' && isMyTurn && (
                        <Button
                          type="primary"
                          onClick={() => handleApproveAmendment(item.id)}
                        >
                          Renter duyệt
                        </Button>
                      )
                    ]}
                  >
                    <div>
                      <b>{item.amendmentType}</b> | {item.oldValue} → {item.newValue} | {item.status}
                      <div style={{ color: '#888', fontSize: 12 }}>{item.reason}</div>
                      <div style={{ color: '#666', fontSize: 11 }}>
                        Ngày tạo: {dayjs(item.createdDate).format('DD/MM/YYYY HH:mm')}
                      </div>
                      <div style={{ color: '#0a0', fontSize: 13, fontWeight: 500 }}>
                        Đã duyệt: {approved} / {total}
                      </div>
                      
                      {/* Hiển thị lý do từ chối khi có */}
                      {item.status === 'REJECTED' && item.reason && (
                        <div style={{ marginTop: 8, padding: 8, backgroundColor: '#fff2f0', border: '1px solid #ffccc7', borderRadius: 4 }}>
                          <div style={{ fontWeight: 600, color: '#cf1322', marginBottom: 4, fontSize: 12 }}>
                            🚫 Lý do từ chối:
                          </div>
                          <div style={{ color: '#8c8c8c', fontStyle: 'italic', fontSize: 11 }}>
                            "{item.reason}"
                          </div>
                        </div>
                      )}
                    </div>
                  </List.Item>
                );
              }}
              locale={{ emptyText: "Không có thay đổi nào" }}
            />
          </Modal>

                     {/* Modal yêu cầu gia hạn */}
           <Modal
             open={renewModalOpen}
             onCancel={() => setRenewModalOpen(false)}
             onOk={handleSendRenewRequest}
             okText="Gửi yêu cầu"
             confirmLoading={renewingContract}
             title="Yêu cầu gia hạn hợp đồng"
             locale={locale}
           >
             <div style={{ marginBottom: 12 }}>
               <b>Ngày kết thúc mới:</b>
               <DatePicker
                 value={renewEndDate ? dayjs(renewEndDate) : null}
                 onChange={(date) => setRenewEndDate(date ? date.format('YYYY-MM-DD') : null)}
                 style={{ marginLeft: 8, width: 200 }}
                 placeholder="Chọn ngày kết thúc mới"
                 format="DD/MM/YYYY"
                 locale={locale}
               />
             </div>
             <div>
               <b>Lý do gia hạn:</b>
               <textarea
                 value={renewReason}
                 onChange={e => setRenewReason(e.target.value)}
                 rows={3}
                 style={{ width: '100%', marginTop: 4 }}
                 placeholder="Nhập lý do hoặc mong muốn gia hạn (không bắt buộc)"
               />
             </div>
           </Modal>
        </Content>
      </Layout>
    </Layout>
  );
} 