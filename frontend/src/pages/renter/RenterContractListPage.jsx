import React, { useEffect, useState } from "react";
import { Layout, Button, Modal, List, message, Table } from "antd";
import PageHeader from "../../components/common/PageHeader";
import RenterSidebar from "../../components/layout/RenterSidebar";
import dayjs from "dayjs";
import { getRenterContracts } from "../../services/contractApi";
import { getContractAmendments, approveAmendment } from "../../services/roomUserApi";
import { useSelector } from "react-redux";

const { Sider, Content } = Layout;

export default function RenterContractListPage() {
  const [contracts, setContracts] = useState([]);
  const [amendmentsModalOpen, setAmendmentsModalOpen] = useState(false);
  const [amendments, setAmendments] = useState([]);
  const [selectedContract, setSelectedContract] = useState(null);
  const user = useSelector((state) => state.account.user);

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      const res = await getRenterContracts();
      setContracts(res.data || []);
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
      // Optimistic update - immediately update local state
      setAmendments(prev => prev.map(item =>
        item.id === amendmentId ? { ...item, status: 'APPROVED' } : item
      ));
    } catch (e) {
      message.error('Phê duyệt thất bại!');
    }
  };

  const columns = [
    { title: "Contract ID", dataIndex: "id", key: "id" },
    { title: "Room", dataIndex: "roomNumber", key: "roomNumber" },
    { title: "Start Date", dataIndex: "contractStartDate", key: "contractStartDate", render: d => dayjs(d).format("DD/MM/YYYY") },
    { title: "End Date", dataIndex: "contractEndDate", key: "contractEndDate", render: d => dayjs(d).format("DD/MM/YYYY") },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Button onClick={() => handleViewAmendments(record)}>Lịch sử thay đổi</Button>
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
                const isMyTurn = user && item.status === 'PENDING' && item.pendingApprovals?.includes(user.id) && !item.approvedBy?.includes(user.id);
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
                    </div>
                  </List.Item>
                );
              }}
              locale={{ emptyText: "Không có thay đổi nào" }}
            />
          </Modal>
        </Content>
      </Layout>
    </Layout>
  );
} 