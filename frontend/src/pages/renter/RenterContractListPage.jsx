import React, { useEffect, useState } from "react";
import { Layout, Button, Modal, List, message, Table, DatePicker, Pagination } from "antd";
import PageHeader from "../../components/common/PageHeader";
import RenterSidebar from "../../components/layout/RenterSidebar";
import dayjs from "dayjs";
import "dayjs/locale/vi";
import locale from "antd/locale/vi_VN";
import { getRenterContracts } from "../../services/contractApi";
import { getContractAmendments, getContractAmendmentsByStatus, approveAmendment, rejectAmendment, renewContract } from "../../services/roomUserApi";
import { useSelector } from "react-redux";

// Cấu hình dayjs để sử dụng locale tiếng Việt
dayjs.locale('vi');

const { Sider, Content } = Layout;

export default function RenterContractListPage() {
  const [contracts, setContracts] = useState([]);
  const [amendmentsModalOpen, setAmendmentsModalOpen] = useState(false);
  const [amendments, setAmendments] = useState([]);
  const [allAmendments, setAllAmendments] = useState([]);
  const [showAllAmendments, setShowAllAmendments] = useState(false);
  const [amendmentsPage, setAmendmentsPage] = useState(1);
  const amendmentsPageSize = 3;
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
    setAmendmentsPage(1);
    setShowAllAmendments(false);
    try {
      // Load tất cả amendments trước
      const allRes = await getContractAmendments(contract.id);
      const allAmendmentsData = allRes.data || [];
      setAllAmendments(allAmendmentsData);
      console.log('Loaded all amendments for renter:', allAmendmentsData);
      
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

  const handleRejectAmendment = async (amendmentId) => {
    try {
      await rejectAmendment(amendmentId, false); // false = renter từ chối
      message.success('Từ chối thành công!');
      // Auto refresh trang
      window.location.reload();
    } catch (e) {
      message.error('Từ chối thất bại!');
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

  // Hàm so sánh giá trị để xác định có thực sự thay đổi không
  const compareValues = (oldValue, newValue) => {
    if (!oldValue && !newValue) return false;
    if (!oldValue || !newValue) return true;
    
    // Tách và so sánh từng phần
    const oldParts = oldValue.split(';').filter(part => part.trim());
    const newParts = newValue.split(';').filter(part => part.trim());
    
    const oldMap = {};
    const newMap = {};
    
    oldParts.forEach(part => {
      const key = part.split(':')[0]?.trim();
      if (key) {
        const value = part.split(':')[1]?.trim() || '';
        oldMap[key] = value;
      }
    });
    
    newParts.forEach(part => {
      const key = part.split(':')[0]?.trim();
      if (key) {
        const value = part.split(':')[1]?.trim() || '';
        newMap[key] = value;
      }
    });
    
    // So sánh từng key
    const allKeys = [...new Set([...Object.keys(oldMap), ...Object.keys(newMap)])];
    
    for (const key of allKeys) {
      const oldVal = oldMap[key] || '';
      const newVal = newMap[key] || '';
      
      // Nếu là số tiền, so sánh giá trị số
      if (key.includes('Tiền') || key.includes('tiền')) {
        const oldNum = parseFloat(oldVal.replace(/[^\d.-]/g, ''));
        const newNum = parseFloat(newVal.replace(/[^\d.-]/g, ''));
        if (oldNum !== newNum) return true;
      } else {
        // So sánh chuỗi thông thường
        if (oldVal !== newVal) return true;
      }
    }
    
    return false;
  };

  const columns = [
    { title: "Mã hợp đồng", dataIndex: "id", key: "id" },
    { title: "Phòng", dataIndex: "roomNumber", key: "roomNumber" },
    { title: "Ngày bắt đầu", dataIndex: "contractStartDate", key: "contractStartDate", render: d => dayjs(d).format("DD/MM/YYYY") },
    { title: "Ngày kết thúc", dataIndex: "contractEndDate", key: "contractEndDate", render: d => dayjs(d).format("DD/MM/YYYY") },
    {
      title: "Thao tác",
      key: "actions",
      align: "center",
      width: 300,
      render: (_, record) => (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'nowrap',
          width: '100%'
        }}>
          <Button onClick={() => handleViewAmendments(record)}>Lịch sử thay đổi</Button>
          {(record.status === 'ACTIVE' || dayjs(record.contractEndDate).diff(dayjs(), 'day') < 30) && (
            <Button type="primary" onClick={() => openRenewModal(record)}>
              Yêu cầu gia hạn
            </Button>
          )}
        </div>
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
            scroll={{ x: 800 }}
          />

          <Modal
            open={amendmentsModalOpen}
            onCancel={() => setAmendmentsModalOpen(false)}
            footer={null}
            title="Lịch sử thay đổi hợp đồng"
            width={800}
          >
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
                  setAmendmentsPage(1);
                  
                  // Gọi API để lấy data theo status
                  if (newShowAll) {
                    // Gọi API để lấy tất cả trừ pending
                    try {
                      const res = await getContractAmendmentsByStatus(selectedContract.id, 'APPROVED');
                      const approvedAmendments = res.data || [];
                      const rejectedRes = await getContractAmendmentsByStatus(selectedContract.id, 'REJECTED');
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
                      const res = await getContractAmendmentsByStatus(selectedContract.id, 'PENDING');
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
              pagination={{
                current: amendmentsPage,
                pageSize: amendmentsPageSize,
                total: amendments.length,
                onChange: (page) => setAmendmentsPage(page),
                showSizeChanger: false,
                showQuickJumper: false,
                showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} yêu cầu`,
              }}
              renderItem={item => {
                const total = item.pendingApprovals?.length || 0;
                const approved = item.approvedBy?.length || 0;
                const isMyTurn = user && item.status === 'PENDING' && item.pendingApprovals?.includes(user.id) && !item.approvedBy?.includes(user.id) && !(item.rejectedBy || []).includes(user.id);
                return (
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
                        marginBottom: 20,
                        paddingBottom: 12,
                        borderBottom: '1px solid #e0e0e0'
                      }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: '#495057' }}>
                          Loại: {getAmendmentTypeText(item.amendmentType)}
                        </div>
                        <div style={{ 
                          padding: '6px 12px', 
                          borderRadius: 6, 
                          fontSize: 13,
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
                          marginBottom: 8,
                          fontSize: 13
                        }}>
                          Lý do thay đổi:
                        </div>
                        <div style={{ 
                          fontSize: 13, 
                          color: '#333',
                          padding: '8px 12px',
                          backgroundColor: '#fff',
                          borderRadius: 4,
                          border: '1px solid #d0d0d0',
                          minHeight: '20px'
                        }}>
                          {item.reason || 'x'}
                        </div>
                      </div>

                      {/* Hiển thị thay đổi */}
                      {(item.oldValue || item.newValue) && (
                        <div style={{ marginBottom: 16 }}>
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
                                      gap: 12,
                                      marginBottom: 8
                                    }}>
                                      <div style={{ 
                                        flex: 1,
                                        padding: '8px 12px', 
                                        backgroundColor: '#fff', 
                                        border: '2px solid #dc2626', 
                                        borderRadius: 4,
                                        minHeight: '32px',
                                        display: 'flex',
                                        alignItems: 'center'
                                      }}>
                                        <span style={{ 
                                          color: '#dc2626', 
                                          fontWeight: 500,
                                          fontSize: 13
                                        }}>
                                          {formatAmendmentValue(oldValue)}
                                        </span>
                                      </div>
                                      <span style={{ 
                                        color: '#333', 
                                        fontSize: 16, 
                                        fontWeight: 'bold'
                                      }}>→</span>
                                      <div style={{ 
                                        flex: 1,
                                        padding: '8px 12px', 
                                        backgroundColor: '#fff', 
                                        border: '2px solid #16a34a', 
                                        borderRadius: 4,
                                        minHeight: '32px',
                                        display: 'flex',
                                        alignItems: 'center'
                                      }}>
                                        <span style={{ 
                                          color: '#16a34a', 
                                          fontWeight: 500,
                                          fontSize: 13
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
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ 
                          fontWeight: 600, 
                          color: '#495057', 
                          marginBottom: 8,
                          fontSize: 13
                        }}>
                          Ngày tạo:
                        </div>
                        <div style={{ 
                          fontSize: 13, 
                          color: '#333',
                          padding: '8px 12px',
                          backgroundColor: '#fff',
                          borderRadius: 4,
                          border: '1px solid #d0d0d0',
                          minHeight: '20px'
                        }}>
                          {item.createdDate ? dayjs(item.createdDate).format('DD/MM/YYYY') : 'Không có'}
                        </div>
                      </div>

                      {/* Debug info - chỉ hiển thị trong development */}
                      

                      {/* Lý do từ chối cho REJECTED */}
                      {item.status === 'REJECTED' && (
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ 
                            fontWeight: 600, 
                            color: '#495057', 
                            marginBottom: 8,
                            fontSize: 13
                          }}>
                            Lý do từ chối:
                          </div>
                          <div style={{ 
                            fontSize: 13, 
                            color: '#333',
                            padding: '8px 12px',
                            backgroundColor: '#fff',
                            borderRadius: 4,
                            border: '1px solid #d0d0d0',
                            minHeight: '20px'
                          }}>
                            {item.reason || 'x'}
                          </div>
                        </div>
                      )}
                      
                      {/* Buttons cho PENDING */}
                      {item.status === 'PENDING' && isMyTurn && (
                        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                          <Button 
                            type="primary" 
                            danger
                            size="middle"
                            onClick={() => handleRejectAmendment(item.id)}
                            style={{ flex: 1, height: 40 }}
                          >
                            Từ chối
                          </Button>
                          <Button 
                            type="primary"
                            size="middle"
                            onClick={() => handleApproveAmendment(item.id)}
                            style={{ flex: 1, height: 40 }}
                          >
                            Duyệt
                          </Button>
                        </div>
                      )}
                    </div>
                  </List.Item>
                );
              }}
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