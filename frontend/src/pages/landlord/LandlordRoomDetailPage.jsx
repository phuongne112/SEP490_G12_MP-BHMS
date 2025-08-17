import React, { useState, useEffect } from "react";
import {
  Layout,
  Card,
  Row,
  Col,
  Typography,
  Tag,
  Space,
  Spin,
  message,
  Divider,
  Button,
  Table,
  Image,
  Badge,
  Descriptions,
  Tabs,
  Avatar,
  Tooltip,
  Modal,
  Form,
  Input,
  DatePicker,
  Select,
  Upload,
  Switch,
  InputNumber,
  Popconfirm,
  Drawer,
  ConfigProvider
} from "antd";
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  HomeOutlined,
  DollarOutlined,
  AreaChartOutlined,
  PhoneOutlined,
  MailOutlined,
  CalendarOutlined,
  FileTextOutlined,
  PlusOutlined,
  MenuOutlined,
  CheckCircleFilled
} from "@ant-design/icons";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useMediaQuery } from "react-responsive";
import dayjs from "dayjs";
import locale from "antd/es/locale/vi_VN";

import LandlordSidebar from "../../components/layout/LandlordSidebar";
import AdminSidebar from "../../components/layout/AdminSidebar";
import { getAllRooms, updateRoomStatus, toggleRoomActiveStatus, deleteRoom, getRoomById } from "../../services/roomService";
import { getContractHistoryByRoom } from "../../services/contractApi";
import { getAllAssets, getAssetsByRoom, addAssetToRoom, deleteRoomAsset, updateRoomAsset } from "../../services/assetApi";
import { addServiceToRoom, deactivateServiceForRoom, reactivateServiceForRoom } from "../../services/roomService";
import { getAllServicesList } from "../../services/serviceApi";
import { detectElectricOcr } from "../../services/electricOcrApi";

import axiosClient from "../../services/axiosClient";

const { Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

const isDev = import.meta.env.DEV;
const BACKEND_URL = isDev
  ? (import.meta.env.VITE_BACKEND_URL || "http://localhost:8080")
  : (typeof window !== "undefined" ? window.location.origin : "");

const getStatusProps = (status) => {
  switch (status) {
    case 'Available':
      return { status: 'success', text: 'Còn trống', color: '#52c41a' };
    case 'Occupied':
      return { status: 'error', text: 'Đã thuê', color: '#ff4d4f' };
    case 'Maintenance':
      return { status: 'warning', text: 'Bảo trì', color: '#faad14' };
    case 'Inactive':
      return { status: 'default', text: 'Ngừng hoạt động', color: '#d9d9d9' };
    default:
      return { status: 'default', text: 'Không xác định', color: '#d9d9d9' };
  }
};

const getImageUrl = (img) => {
  if (!img) return null;
  if (typeof img === "string") {
    if (img.startsWith("http")) return img;
    if (img.startsWith("/uploads/")) return BACKEND_URL + img;
    return BACKEND_URL + "/uploads/" + img;
  }
  if (typeof img === "object" && img.imageUrl) {
    if (img.imageUrl.startsWith("http")) return img.imageUrl;
    if (img.imageUrl.startsWith("/uploads/")) return BACKEND_URL + img.imageUrl;
    return BACKEND_URL + "/uploads/" + img.imageUrl;
  }
  return null;
};

export default function LandlordRoomDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useSelector((state) => state.account.user);
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const isTablet = useMediaQuery({ minWidth: 769, maxWidth: 1024 });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);

  // Contract states
  const [contracts, setContracts] = useState([]);
  const [contractsLoading, setContractsLoading] = useState(false);

  // Asset states
  const [roomAssets, setRoomAssets] = useState([]);
  const [roomAssetsLoading, setRoomAssetsLoading] = useState(false);
  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [assetList, setAssetList] = useState([]);
  const [assetLoading, setAssetLoading] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState(null);
  const [assetSearch, setAssetSearch] = useState("");
  const [assetPage, setAssetPage] = useState(1);
  const [assetTotal, setAssetTotal] = useState(0);
  const [assetPageSize, setAssetPageSize] = useState(5);

  // Service states
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [services, setServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [addingService, setAddingService] = useState(false);
  const [allServices, setAllServices] = useState([]);
  const [pendingServices, setPendingServices] = useState([]);
  const [electricModalOpen, setElectricModalOpen] = useState(false);
  const [electricFile, setElectricFile] = useState(null);
  const [electricValue, setElectricValue] = useState("");
  const [ocrLoading, setOcrLoading] = useState(false);

  // Center toast
  const [centerToast, setCenterToast] = useState({ visible: false, message: "" });

  useEffect(() => {
    if (id) {
      fetchRoomData();
      fetchContracts();
      fetchRoomAssets();
    }
  }, [id]);

  const fetchRoomData = async () => {
    setLoading(true);
    try {
      const roomData = await getRoomById(id);
      if (roomData) {
        setRoom(roomData);
        if (roomData.images && roomData.images.length > 0) {
          setSelectedImage(getImageUrl(roomData.images[0]));
        }
      } else {
        message.error("Không tìm thấy thông tin phòng");
        navigate(-1);
      }
    } catch (error) {
      message.error("Không thể tải thông tin phòng");
      navigate(-1);
    }
    setLoading(false);
  };

  const fetchContracts = async () => {
    setContractsLoading(true);
    try {
      const res = await getContractHistoryByRoom(id);
      const list = Array.isArray(res) ? res : (res?.data || res?.result || []);
      if (!list || list.length === 0) {
        setContracts([]);
      } else {
        // Ưu tiên hợp đồng ACTIVE mới nhất, nếu không có thì lấy mới nhất bất kỳ
        const byDate = (c) => new Date(
          c.updatedDate || c.createdDate || c.startDate || c.contractStartDate || 0
        ).getTime();
        const active = list.filter(c => (c.contractStatus || c.status) === 'ACTIVE');
        const latest = (active.length > 0 ? active : list)
          .sort((a, b) => byDate(b) - byDate(a))[0];
        setContracts(latest ? [latest] : []);
      }
    } catch (error) {
      setContracts([]);
    }
    setContractsLoading(false);
  };

  const fetchRoomAssets = async () => {
    setRoomAssetsLoading(true);
    try {
      const res = await getAssetsByRoom(id);
      setRoomAssets(res.data || []);
    } catch (error) {
      setRoomAssets([]);
    }
    setRoomAssetsLoading(false);
  };

  const handleStatusChange = async (newStatus) => {
    setUpdatingId(room.id);
    try {
      await updateRoomStatus(room.id, newStatus);
      message.success('Cập nhật trạng thái phòng thành công');
      fetchRoomData();
    } catch (error) {
      message.error('Cập nhật trạng thái phòng thất bại');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleActive = async () => {
    setTogglingId(room.id);
    try {
      await toggleRoomActiveStatus(room.id);
      message.success('Cập nhật trạng thái hoạt động thành công');
      fetchRoomData();
    } catch (error) {
      message.error('Cập nhật trạng thái hoạt động thất bại');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteRoom = async () => {
    Modal.confirm({
      title: 'Xác nhận xóa phòng',
      content: `Bạn có chắc chắn muốn xóa phòng ${room?.roomNumber}?`,
      okText: 'Xóa',
      cancelText: 'Hủy',
      okType: 'danger',
      onOk: async () => {
        try {
          await deleteRoom(room.id);
          message.success('Xóa phòng thành công');
          navigate(-1);
        } catch (error) {
          const backendMsg = error?.response?.data?.message || error?.response?.data?.error || 'Xóa phòng thất bại';
          message.error(backendMsg);
        }
      }
    });
  };

  // Service management functions
  const openServiceModal = async () => {
    setServiceModalOpen(true);
    setSelectedServices([]);
    try {
      const res = await getAllServicesList();
      const all = res.data || [];
      setAllServices(all);
      const activeServiceIds = (room.services || []).filter(s => s.isActive !== false && !s.endDate).map(s => s.id);
      const availableServices = all.filter(service => !activeServiceIds.includes(service.id));
      setServices(availableServices);
      if (availableServices.length === 0) {
        message.info("Phòng này đã có tất cả các dịch vụ đang sử dụng!");
      }
    } catch {
      setAllServices([]);
      setServices([]);
    }
  };

  const handleAddService = async () => {
    if (!selectedServices.length) {
      message.error('Vui lòng chọn ít nhất một dịch vụ!');
      return;
    }

    const selectedServiceObjects = services.filter(s => selectedServices.includes(s.id));
    const hasElectricityService = selectedServiceObjects.some(s => s.serviceType === 'ELECTRICITY');

    if (hasElectricityService) {
      setPendingServices(selectedServices);
      setElectricModalOpen(true);
      setServiceModalOpen(false);
    } else {
      try {
        await addServicesToRoom(selectedServices);
        message.success('Thêm dịch vụ thành công!');
        setServiceModalOpen(false);
        fetchRoomData();
      } catch (err) {
        message.error(err.response?.data?.message || 'Thêm dịch vụ thất bại!');
      }
    }
  };

  const addServicesToRoom = async (serviceIds, electricReading = null) => {
    setAddingService(true);
    try {
      const selectedServiceObjects = services.filter(s => serviceIds.includes(s.id));
      
      for (const serviceId of serviceIds) {
        const service = selectedServiceObjects.find(s => s.id === serviceId);
        if (service && service.serviceType === 'ELECTRICITY' && electricReading) {
          await addServiceToRoom(room.id, serviceId, electricReading);
        } else {
          await addServiceToRoom(room.id, serviceId);
        }
      }
      
      message.success("Thêm dịch vụ vào phòng thành công!");
      setServiceModalOpen(false);
      setSelectedServices([]);
      setPendingServices([]);
      fetchRoomData();
    } catch (err) {
      const errorMessage = err?.response?.data?.message || err?.response?.data?.error || "Error while adding services to room";
      if (errorMessage.includes("already exists")) {
        message.error("Dịch vụ này đã tồn tại trong phòng. Không thể thêm lại!");
      } else {
        message.error(errorMessage);
      }
    } finally {
      setAddingService(false);
    }
  };

  const handleElectricOcr = async () => {
    if (!electricFile && !electricValue) {
      message.error("Vui lòng nhập số điện hoặc upload ảnh!");
      return;
    }
    setOcrLoading(true);
    try {
      let result = electricValue;
      if (electricFile) {
        const res = await detectElectricOcr(electricFile);
        result = res.data.data;
        setElectricValue(result);
      }
      
      await addServicesToRoom(pendingServices, result);
      
      message.success(`Đã ghi nhận chỉ số điện: ${result} và thêm dịch vụ thành công!`);
      setElectricModalOpen(false);
      setElectricFile(null);
      setElectricValue("");
      setPendingServices([]);
    } catch (err) {
      message.error("Lỗi khi ghi nhận chỉ số điện");
    } finally {
      setOcrLoading(false);
    }
  };

  const handleRemoveService = async (serviceId) => {
    const service = room.services?.find(s => s.id === serviceId);
    if (!service) return;
    Modal.confirm({
      title: `Xác nhận xóa dịch vụ`,
      content: `Bạn có chắc chắn muốn xóa dịch vụ "${service.serviceName}" khỏi phòng này?`,
      okText: "Xóa",
      cancelText: "Hủy",
      okType: "danger",
      onOk: async () => {
        try {
          await axiosClient.delete(`/rooms/${room.id}/remove-service/${serviceId}`);
          setCenterToast({ visible: true, message: "Đã xóa dịch vụ khỏi phòng!" });
          setTimeout(() => setCenterToast({ visible: false, message: "" }), 2000);
          fetchRoomData();
          setServiceModalOpen(false);
        } catch (err) {
          let msg = "Không thể xóa dịch vụ khỏi phòng!";
          if (err?.response?.data) {
            if (typeof err.response.data === "string") {
              msg = err.response.data;
            } else if (err.response.data.message) {
              msg = err.response.data.message;
            } else if (err.response.data.error) {
              msg = err.response.data.error;
            }
          }
          if (msg && msg.toLowerCase().includes("hóa đơn")) {
            Modal.warning({
              title: "Không thể xóa dịch vụ đã phát sinh hóa đơn",
              content: (
                <div>
                  <div>Không thể xóa dịch vụ đã phát sinh hóa đơn. Vui lòng ngừng sử dụng từ kỳ sau hoặc thêm dịch vụ mới nếu muốn thay đổi.</div>
                  <div style={{marginTop:8, color:'#888'}}>Nếu muốn thay đổi giá/gói dịch vụ, hãy thêm dịch vụ mới và ngừng dịch vụ cũ từ kỳ tiếp theo.</div>
                </div>
              ),
              okText: "Đã hiểu"
            });
          } else {
            message.error(msg);
          }
        }
      }
    });
  };

  const handleDeactivateService = async (serviceId) => {
    const service = room.services?.find(s => s.id === serviceId);
    if (!service) return;
    
    Modal.confirm({
      title: `Xác nhận ngừng sử dụng dịch vụ`,
      content: `Bạn có chắc chắn muốn ngừng sử dụng dịch vụ "${service.serviceName}" cho phòng này?`,
      okText: "Ngừng sử dụng",
      cancelText: "Hủy",
      okType: "danger",
      onOk: async () => {
        try {
          await deactivateServiceForRoom(room.id, serviceId);
          message.success("Đã ngừng sử dụng dịch vụ cho phòng!");
          fetchRoomData();
        } catch (err) {
          const backendMsg = err.response?.data?.message || err.response?.data || err.message;
          if (backendMsg.includes("chỉ được phép ngừng dịch vụ vào ngày cuối kỳ") || backendMsg.includes("ngày 28-31")) {
            Modal.info({
              title: "Không thể ngừng sử dụng dịch vụ",
              content: (
                <div>
                  <div style={{ marginBottom: 8 }}>{backendMsg}</div>
                  <div>Nếu muốn thay đổi giá/gói dịch vụ, hãy thêm dịch vụ mới và ngừng dịch vụ cũ từ kỳ tiếp theo.</div>
                </div>
              ),
              okText: "Đã hiểu"
            });
          } else {
            message.error("Không thể ngừng sử dụng dịch vụ: " + backendMsg);
          }
        }
      }
    });
  };

  const handleReactivateService = async (serviceId) => {
    const service = room.services?.find(s => s.id === serviceId);
    if (!service) return;
    Modal.confirm({
      title: `Xác nhận sử dụng lại dịch vụ`,
      content: `Bạn có chắc chắn muốn sử dụng lại dịch vụ "${service.serviceName}" cho phòng này?`,
      okText: "Sử dụng lại",
      cancelText: "Hủy",
      okType: "primary",
      onOk: async () => {
        try {
          await reactivateServiceForRoom(room.id, serviceId);
          message.success("Đã sử dụng lại dịch vụ cho phòng!");
          fetchRoomData();
        } catch (err) {
          const backendMsg = err.response?.data?.message || err.response?.data || err.message;
          message.error("Không thể sử dụng lại dịch vụ: " + backendMsg);
        }
      }
    });
  };

  // Asset management functions
  const openAssetModal = () => {
    setAssetModalOpen(true);
    fetchAssetList(1, "");
  };

  const fetchAssetList = async (page = 1, search = "") => {
    setAssetLoading(true);
    try {
      const res = await getAllAssets(page - 1, assetPageSize, { assetName: search });
      setAssetList(res.data?.result || res.result || []);
      setAssetTotal(res.data?.meta?.total || res.meta?.total || 0);
      setAssetPage(page);
    } catch {
      setAssetList([]);
    }
    setAssetLoading(false);
  };

  const handleAssetAssign = async () => {
    if (!selectedAssetId) return;
    const asset = assetList.find(a => a.id === selectedAssetId);
    if (!asset) return;
    
    try {
      await addAssetToRoom({
        roomId: room.id,
        assetId: asset.id,
        quantity: 1,
        status: 'Tốt',
        note: ''
      });
      message.success('Đã thêm tài sản vào phòng!');
      setAssetModalOpen(false);
      setSelectedAssetId(null);
      fetchRoomAssets();
    } catch {
      message.error('Lỗi khi thêm tài sản vào phòng!');
    }
  };

  const handleDeleteRoomAsset = async (roomAssetId) => {
    try {
      await deleteRoomAsset(roomAssetId);
      fetchRoomAssets();
    } catch (err) {
      message.error("Xóa tài sản khỏi phòng thất bại!");
    }
  };

  // Contract columns (align with Contract list page)
  const contractColumns = [
    {
      title: 'Mã hợp đồng',
      key: 'contractNumber',
      render: (_, record) => `HĐ#${record.id || record.contractNumber}`
    },
    {
      title: 'Ngày bắt đầu',
      dataIndex: 'contractStartDate',
      key: 'contractStartDate',
      render: (date) => (date ? dayjs(date).format('DD/MM/YYYY') : '-')
    },
    {
      title: 'Ngày kết thúc',
      dataIndex: 'contractEndDate',
      key: 'contractEndDate',
      render: (date) => (date ? dayjs(date).format('DD/MM/YYYY') : '-')
    },
    {
      title: 'Tiền thuê',
      dataIndex: 'rentAmount',
      key: 'rentAmount',
      render: (amount) => (amount !== undefined && amount !== null ? amount.toLocaleString('vi-VN') + ' VND' : '-')
    },
    {
      title: 'Chu kỳ',
      dataIndex: 'paymentCycle',
      key: 'paymentCycle',
      render: (cycle) =>
        cycle === 'MONTHLY' ? 'Hàng tháng' : cycle === 'QUARTERLY' ? 'Hàng quý' : cycle === 'YEARLY' ? 'Hàng năm' : '-'
    },
    {
      title: 'Trạng thái',
      dataIndex: 'contractStatus',
      key: 'contractStatus',
      render: (status, record) => {
        const color = status === 'ACTIVE' ? 'green' : status === 'EXPIRED' ? 'red' : status === 'TERMINATED' ? 'orange' : 'default';
        const label = status === 'ACTIVE' ? 'Đang hiệu lực' : status === 'EXPIRED' ? 'Hết hạn' : status === 'TERMINATED' ? 'Đã chấm dứt' : (status || 'Không xác định');
        return <Tag color={color}>{label}</Tag>;
      }
    }
  ];

  // Asset columns
  const assetColumns = [
    {
      title: 'Tên tài sản',
      dataIndex: 'assetName',
      key: 'assetName'
    },
    {
      title: 'Số lượng',
      dataIndex: 'quantity',
      key: 'quantity'
    },
    {
      title: 'Tình trạng',
      dataIndex: 'status',
      key: 'status',
      render: (text) => text || '-'
    },
    {
      title: 'Ghi chú',
      dataIndex: 'note',
      key: 'note',
      render: (text) => text || '-'
    },
    {
      title: 'Hình ảnh',
      dataIndex: 'assetImage',
      key: 'assetImage',
      render: (url) =>
        url ? (
          <Image
            src={url.startsWith("http") ? url : `${BACKEND_URL}${url.startsWith("/") ? "" : "/"}${url}`}
            width={60}
            height={40}
            style={{ objectFit: "cover" }}
          />
        ) : (
          <span style={{ color: "#aaa" }}>Không có ảnh</span>
        )
    },

  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!room) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Text>Không tìm thấy thông tin phòng</Text>
      </div>
    );
  }

  const currentStatusProps = getStatusProps(room.roomStatus);

  return (
    <ConfigProvider locale={locale}>
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
          {/* Desktop Sidebar */}
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
            {/* Mobile Header */}
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
                  <Button
                    type="text"
                    icon={<MenuOutlined />}
                    onClick={() => setMobileMenuOpen(true)}
                    style={{ 
                      color: 'white',
                      fontSize: '18px'
                    }}
                  />
                  <div style={{ 
                    fontWeight: 600, 
                    fontSize: 18,
                    color: 'white'
                  }}>
                    MP-BHMS
                  </div>
                </div>
              </div>
            )}
            
            {/* Content Area */}
            <div style={{ 
              flex: 1, 
              padding: isMobile ? 16 : 24,
              backgroundColor: "#f5f5f5",
              minHeight: isMobile ? "calc(100vh - 60px)" : "100vh"
            }}>
              {/* Header */}
              <div style={{ 
                backgroundColor: "#fff", 
                borderRadius: "8px", 
                padding: isMobile ? "16px" : "24px",
                marginBottom: "24px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                  <Button
                    icon={<ArrowLeftOutlined />}
                    onClick={() => navigate(-1)}
                    style={{ marginRight: 16 }}
                  >
                    Quay lại
                  </Button>
                  <Title level={isMobile ? 4 : 3} style={{ margin: 0 }}>
                    Chi tiết phòng {room.roomNumber}
                  </Title>
                </div>


              </div>

              {/* Room Information */}
              <Row gutter={[24, 24]}>
                {/* Room Images */}
                <Col xs={24} lg={12}>
                  <Card title="Hình ảnh phòng" style={{ height: 'fit-content' }}>
                    {room.images && room.images.length > 0 ? (
                      <div>
                        <div style={{ marginBottom: 16 }}>
                          <Image
                            src={selectedImage}
                            alt="Room"
                            style={{ width: '100%', height: 300, objectFit: 'cover', borderRadius: 8 }}
                            onClick={() => setImageModalVisible(true)}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {room.images.map((img, index) => (
                            <Image
                              key={index}
                              src={getImageUrl(img)}
                              alt={`Room ${index + 1}`}
                              width={80}
                              height={60}
                              style={{ objectFit: 'cover', cursor: 'pointer', borderRadius: 4 }}
                              onClick={() => setSelectedImage(getImageUrl(img))}
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div style={{ 
                        height: 300, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        backgroundColor: '#f5f5f5',
                        borderRadius: 8
                      }}>
                        <Text type="secondary">Không có hình ảnh</Text>
                      </div>
                    )}
                  </Card>
                </Col>

                {/* Room Details */}
                <Col xs={24} lg={12}>
                  <Card title="Thông tin phòng">
                    <Descriptions column={1} size="small">
                      <Descriptions.Item label="Số phòng">
                        <Text strong>{room.roomNumber}</Text>
                      </Descriptions.Item>
                      <Descriptions.Item label="Tòa nhà">
                        <Text>{room.building || 'N/A'}</Text>
                      </Descriptions.Item>
                      <Descriptions.Item label="Diện tích">
                        <Text>{room.area} m²</Text>
                      </Descriptions.Item>
                      <Descriptions.Item label="Giá thuê">
                        <Text strong style={{ color: '#d32f2f' }}>
                          {room.pricePerMonth?.toLocaleString('vi-VN')} VND/tháng
                        </Text>
                      </Descriptions.Item>
                      <Descriptions.Item label="Số phòng ngủ">
                        <Text>{room.numberOfBedrooms}</Text>
                      </Descriptions.Item>
                      <Descriptions.Item label="Số phòng tắm">
                        <Text>{room.numberOfBathrooms}</Text>
                      </Descriptions.Item>
                      <Descriptions.Item label="Số người tối đa">
                        <Text>{room.maxOccupants}</Text>
                      </Descriptions.Item>
                      <Descriptions.Item label="Trạng thái">
                        <Tag color={currentStatusProps.color}>
                          {currentStatusProps.text}
                        </Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="Trạng thái hoạt động">
                        <Tag color={room.isActive ? 'green' : 'red'}>
                          {room.isActive ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                        </Tag>
                      </Descriptions.Item>
                      {room.description && (
                        <Descriptions.Item label="Mô tả">
                          <Text>{room.description}</Text>
                        </Descriptions.Item>
                      )}
                    </Descriptions>

                    <Divider />
                  </Card>
                </Col>
              </Row>

              {/* Current Renters Section */}
              <Card title="Người thuê hiện tại" style={{ marginTop: 24 }}>
                {room.roomUsers && room.roomUsers.length > 0 ? (
                  <Row gutter={[16, 16]}>
                    {room.roomUsers.map((roomUser, index) => (
                      <Col xs={24} sm={12} md={8} key={roomUser.userId || index}>
                        <Card size="small" style={{ border: '1px solid #f0f0f0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <Avatar 
                              size={48} 
                              icon={<UserOutlined />} 
                              style={{ backgroundColor: '#1890ff' }}
                            />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>
                                {roomUser.fullName || 'Chưa có tên'} {index === 0 ? <Tag color="blue" style={{ marginLeft: 8 }}>Chủ phòng</Tag> : null}
                              </div>
                              <div style={{ color: '#666', fontSize: 14, marginBottom: 2 }}>
                                <PhoneOutlined style={{ marginRight: 4 }} />
                                {roomUser.phoneNumber || 'Chưa có số điện thoại'}
                              </div>
                              <div style={{ color: '#666', fontSize: 14, marginBottom: 2 }}>
                                <MailOutlined style={{ marginRight: 4 }} />
                                {roomUser.email || 'Chưa có email'}
                              </div>
                              <div style={{ color: '#666', fontSize: 12 }}>
                                <CalendarOutlined style={{ marginRight: 4 }} />
                                Vào ở: {roomUser.joinedAt ? dayjs(roomUser.joinedAt).format('DD/MM/YYYY') : 'N/A'}
                              </div>
                            </div>
                          </div>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                ) : (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '40px 20px',
                    color: '#666'
                  }}>
                    <UserOutlined style={{ fontSize: 48, marginBottom: 16, color: '#d9d9d9' }} />
                    <div style={{ fontSize: 16, marginBottom: 8 }}>Chưa có người thuê</div>
                    <div style={{ fontSize: 14 }}>Phòng này hiện tại chưa có người thuê nào</div>
                  </div>
                )}
              </Card>

              {/* Tabs for Services, Contracts, Assets */}
              <Card style={{ marginTop: 24 }}>
                <Tabs defaultActiveKey="contracts">
                  <Tabs.TabPane tab="Hợp đồng" key="contracts">
                    <Table
                      dataSource={contracts}
                      columns={[
                        {
                          title: 'Mã hợp đồng',
                          dataIndex: 'contractCode',
                          key: 'contractCode',
                          render: (text) => text || `HĐ#${id}`
                        },
                        {
                          title: 'Ngày bắt đầu',
                          dataIndex: 'startDate',
                          key: 'startDate',
                          render: (date) => dayjs(date).format('DD/MM/YYYY')
                        },
                        {
                          title: 'Ngày kết thúc',
                          dataIndex: 'endDate',
                          key: 'endDate',
                          render: (date) => dayjs(date).format('DD/MM/YYYY')
                        },
                        {
                          title: 'Tiền thuê',
                          dataIndex: 'rentAmount',
                          key: 'rentAmount',
                          render: (amount) => amount?.toLocaleString('vi-VN') + ' VND'
                        },
                        {
                          title: 'Trạng thái',
                          dataIndex: 'status',
                          key: 'status',
                          render: (status, record) => {
                            const isExpired = dayjs().isAfter(dayjs(record.endDate));
                            return (
                              <Tag color={isExpired ? 'red' : 'green'}>
                                {isExpired ? 'Hết hạn' : 'Đang hiệu lực'}
                              </Tag>
                            );
                          }
                        }
                      ]}
                      loading={contractsLoading}
                      rowKey="id"
                      pagination={false}
                      scroll={{ x: 800 }}
                    />
                  </Tabs.TabPane>

                  <Tabs.TabPane tab="Dịch vụ" key="services">
                    <Table
                      dataSource={room.services || []}
                      columns={[
                        {
                          title: 'Tên dịch vụ',
                          dataIndex: 'serviceName',
                          key: 'serviceName',
                        },
                        {
                          title: 'Loại',
                          dataIndex: 'serviceType',
                          key: 'serviceType',
                          render: (type) => (
                            type === 'ELECTRICITY' ? 'Điện' : type === 'WATER' ? 'Nước' : 'Khác'
                          )
                        },
                        {
                          title: 'Đơn giá',
                          dataIndex: 'unitPrice',
                          key: 'unitPrice',
                          render: (price) => price?.toLocaleString('vi-VN') + ' VND'
                        },
                        {
                          title: 'Đơn vị',
                          dataIndex: 'unit',
                          key: 'unit',
                          render: (u) => (u === 'm3' ? 'm³' : u)
                        },
                        {
                          title: 'Trạng thái',
                          dataIndex: 'isActive',
                          key: 'isActive',
                          render: (isActive, record) => (
                            <Tag color={isActive !== false && !record.endDate ? 'green' : 'red'}>
                              {isActive !== false && !record.endDate ? 'Đang sử dụng' : 'Đã ngừng'}
                            </Tag>
                          )
                        },

                      ]}
                      rowKey="id"
                      pagination={false}
                    />
                  </Tabs.TabPane>

                  <Tabs.TabPane tab="Tài sản" key="assets">
                    <Table
                      dataSource={roomAssets}
                      columns={assetColumns}
                      loading={roomAssetsLoading}
                      rowKey="id"
                      pagination={false}
                    />
                  </Tabs.TabPane>
                </Tabs>
              </Card>
            </div>
          </div>
        </div>

        {/* Mobile Drawer */}
        {isMobile && (
          <Drawer
            title="Menu"
            placement="left"
            onClose={() => setMobileMenuOpen(false)}
            open={mobileMenuOpen}
            width={280}
            bodyStyle={{ padding: 0 }}
          >
            {user?.role?.roleName?.toUpperCase?.() === "ADMIN" || user?.role?.roleName?.toUpperCase?.() === "SUBADMIN" ? (
              <AdminSidebar isDrawer={true} onMenuClick={() => setMobileMenuOpen(false)} />
            ) : (
              <LandlordSidebar isDrawer={true} onMenuClick={() => setMobileMenuOpen(false)} />
            )}
          </Drawer>
        )}

        {/* Image Modal */}
        <Modal
          open={imageModalVisible}
          onCancel={() => setImageModalVisible(false)}
          footer={null}
          width="80%"
          centered
        >
          <Image
            src={selectedImage}
            alt="Room"
            style={{ width: '100%', height: 'auto' }}
          />
        </Modal>

        {/* Service Modal */}
        <Modal
          open={serviceModalOpen}
          onCancel={() => setServiceModalOpen(false)}
          onOk={handleAddService}
          okText="Thêm dịch vụ"
          confirmLoading={addingService}
          okButtonProps={{ disabled: services.length === 0 }}
          title={`Thêm dịch vụ vào phòng ${room?.roomNumber}`}
        >
          <div style={{ marginBottom: 16 }}>
            <p style={{ color: '#666', fontSize: 14 }}>
              Chọn dịch vụ để thêm vào phòng {room?.roomNumber}:
            </p>
          </div>
          <Select
            mode="multiple"
            style={{ width: "100%" }}
            placeholder="Chọn dịch vụ"
            value={selectedServices}
            onChange={setSelectedServices}
          >
            {allServices.map((s) => {
              const isActive = (room?.services || []).some(rs => rs.id === s.id && rs.isActive !== false && !rs.endDate);
              return (
                        <Option key={s.id} value={s.id} disabled={isActive}>
          {s.serviceName} {isActive ? " - Đã có" : ""}
        </Option>
              );
            })}
          </Select>
        </Modal>

        {/* Electric Modal */}
        <Modal
          open={electricModalOpen}
          onCancel={() => {
            setElectricModalOpen(false);
            setElectricFile(null);
            setElectricValue("");
            setPendingServices([]);
          }}
          onOk={handleElectricOcr}
          okText="Có"
                          cancelText="Hủy"
          confirmLoading={ocrLoading}
          title={`Nhập chỉ số điện cho phòng ${room?.roomNumber}`}
          width={500}
        >
          <div style={{ marginBottom: 16 }}>
            <p style={{ color: '#666', marginBottom: 8 }}>
              Phòng này sẽ được thêm dịch vụ điện. Vui lòng nhập chỉ số điện hiện tại:
            </p>
          </div>
          
          <div style={{ marginBottom: 16 }}>
            <Input
              placeholder="Nhập số điện mới (VD: 12345.6)"
              value={electricValue}
              onChange={e => {
                const val = e.target.value.replace(/[^0-9.]/g, "");
                setElectricValue(val);
              }}
              style={{ marginBottom: 12 }}
            />
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <span style={{ color: '#999' }}>hoặc</span>
            </div>
            <Upload
              beforeUpload={file => { setElectricFile(file); return false; }}
              accept="image/*"
              maxCount={1}
              showUploadList={electricFile ? [{ name: electricFile.name }] : false}
            >
              <Button block>📷 Chọn ảnh công tơ (OCR tự động)</Button>
            </Upload>
          </div>
          
          {electricValue && (
            <div style={{ 
              padding: 12, 
              backgroundColor: '#f6ffed', 
              border: '1px solid #b7eb8f',
              borderRadius: 6,
              marginBottom: 16
            }}>
              <strong>Số điện sẽ được ghi nhận:</strong> {electricValue}
            </div>
          )}
        </Modal>

        {/* Asset Modal */}
        <Modal
          open={assetModalOpen}
          title="Chọn tài sản để thêm vào phòng"
          onCancel={() => { setAssetModalOpen(false); setSelectedAssetId(null); }}
          onOk={handleAssetAssign}
          okText="Thêm vào phòng"
          okButtonProps={{ disabled: !selectedAssetId }}
          width={700}
        >
          <Input.Search
            placeholder="Tìm kiếm tài sản"
            value={assetSearch}
            onChange={e => { setAssetSearch(e.target.value); fetchAssetList(1, e.target.value); }}
            style={{ marginBottom: 16, width: 300 }}
            allowClear
          />
          <Table
            dataSource={assetList}
            loading={assetLoading}
            rowKey="id"
            pagination={{
              current: assetPage,
              pageSize: assetPageSize,
              total: assetTotal,
              onChange: (page) => fetchAssetList(page, assetSearch),
            }}
            rowSelection={{
              type: "radio",
              selectedRowKeys: selectedAssetId ? [selectedAssetId] : [],
              onChange: (selectedRowKeys) => setSelectedAssetId(selectedRowKeys[0]),
            }}
            columns={[
              { title: "Tên tài sản", dataIndex: "assetName", key: "assetName" },
              { title: "Số lượng", dataIndex: "quantity", key: "quantity" },
              { title: "Ghi chú", dataIndex: "conditionNote", key: "conditionNote" },
            ]}
            scroll={{ x: 600 }}
          />
        </Modal>

        {/* Center Toast */}
        {centerToast.visible && (
          <div style={{
            position: "fixed",
            top: 32,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#fff",
            borderRadius: 12,
            boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
            padding: "14px 32px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            zIndex: 9999,
            fontWeight: 500,
            fontSize: 16
          }}>
            <CheckCircleFilled style={{ color: "#52c41a", fontSize: 22 }} />
            {centerToast.message}
          </div>
        )}
      </div>
    </ConfigProvider>
  );
}
