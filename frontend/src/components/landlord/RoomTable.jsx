import React, { useState } from "react";
import { Card, Row, Col, Button, Badge, Skeleton, Tag, Dropdown, Menu, message, Modal, Select, Input, Upload, Tooltip } from "antd";
import { updateRoomStatus, toggleRoomActiveStatus, deleteRoom, addServiceToRoom } from "../../services/roomService";
import { getAllServicesList } from "../../services/serviceApi";
import { detectElectricOcr } from "../../services/electricOcrApi";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { UserOutlined, ClockCircleOutlined, ExclamationCircleOutlined } from "@ant-design/icons";

const { Meta } = Card;
const { Option } = Select;

const getStatusProps = (status) => {
    switch (status) {
        case 'Available':
            return { status: 'success', text: 'Còn trống' };
        case 'Occupied':
            return { status: 'error', text: 'Đã thuê' };
        case 'Maintenance':
            return { status: 'warning', text: 'Bảo trì' };
        case 'Inactive':
            return { status: 'default', text: 'Ngừng hoạt động' };
        default:
            return { status: 'default', text: 'Không xác định' };
    }
};

export default function RoomTable({ rooms, loading, onRoomsUpdate }) {
    const [updatingId, setUpdatingId] = useState(null);
    const [togglingId, setTogglingId] = useState(null);
    const navigate = useNavigate();
    const [serviceModalOpen, setServiceModalOpen] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [services, setServices] = useState([]);
    const [selectedServices, setSelectedServices] = useState([]);
    const [addingService, setAddingService] = useState(false);

    // For electric reading
    const [electricModalOpen, setElectricModalOpen] = useState(false);
    const [electricFile, setElectricFile] = useState(null);
    const [electricValue, setElectricValue] = useState("");
    const [ocrLoading, setOcrLoading] = useState(false);
    const [pendingServices, setPendingServices] = useState([]); // Lưu danh sách dịch vụ đang chờ thêm

// For contract management
const [contractModalOpen, setContractModalOpen] = useState(false);
const [selectedContract, setSelectedContract] = useState(null);
const [renewalDate, setRenewalDate] = useState("");
const [renewingContract, setRenewingContract] = useState(false);

// For contract updates
const [updateContractModalOpen, setUpdateContractModalOpen] = useState(false);
const [updateContractData, setUpdateContractData] = useState({
    newRentAmount: "",
    newDepositAmount: "",
    newTerms: "",
    reasonForUpdate: "",
    requiresTenantApproval: true
});
const [updatingContract, setUpdatingContract] = useState(false);

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8080";

const user = useSelector((state) => state.account.user);


    const handleStatusChange = async (roomId, newStatus) => {
        setUpdatingId(roomId);
        try {
            await updateRoomStatus(roomId, newStatus);
            message.success('Cập nhật trạng thái phòng thành công');
            if (onRoomsUpdate) {
                onRoomsUpdate();
            }
        } catch (error) {
            message.error('Cập nhật trạng thái phòng thất bại');
        } finally {
            setUpdatingId(null);
        }
    };

    const handleToggleActive = async (roomId) => {
        setTogglingId(roomId);
        try {
            await toggleRoomActiveStatus(roomId);
            message.success('Cập nhật trạng thái hoạt động thành công');
            if (onRoomsUpdate) {
                onRoomsUpdate();
            }
        } catch (error) {
            message.error('Cập nhật trạng thái hoạt động thất bại');
        } finally {
            setTogglingId(null);
        }
    };

    const openServiceModal = async (room) => {
        setSelectedRoom(room);
        setServiceModalOpen(true);
        setSelectedServices([]);
        // Lấy danh sách dịch vụ
        try {
            const res = await getAllServicesList();
            const allServices = res.data || [];
            
            // Lọc ra các dịch vụ chưa có trong phòng
            const existingServiceIds = room.services?.map(s => s.id) || [];
            const availableServices = allServices.filter(service => !existingServiceIds.includes(service.id));
            
            setServices(availableServices);
            
            // Nếu không còn dịch vụ nào để thêm
            if (availableServices.length === 0) {
                message.info("Phòng này đã có tất cả các dịch vụ!");
            }
        } catch {
            setServices([]);
        }
    };

    const handleAddService = async () => {
        if (!selectedServices.length) {
            message.error("Please select at least one service!");
            return;
        }

        // Kiểm tra xem có dịch vụ điện không
        const selectedServiceObjects = services.filter(s => selectedServices.includes(s.id));
        const hasElectricityService = selectedServiceObjects.some(s => s.serviceType === 'ELECTRICITY');

        if (hasElectricityService) {
            // Nếu có dịch vụ điện, lưu danh sách dịch vụ và mở modal nhập số điện
            setPendingServices(selectedServices);
            setElectricModalOpen(true);
            setServiceModalOpen(false);
        } else {
            // Nếu không có dịch vụ điện, thêm dịch vụ ngay
            await addServicesToRoom(selectedServices);
        }
    };

    // Hàm thêm dịch vụ vào phòng
    const addServicesToRoom = async (serviceIds, electricReading = null) => {
        setAddingService(true);
        try {
            const selectedServiceObjects = services.filter(s => serviceIds.includes(s.id));
            
            // Thêm từng dịch vụ
            for (const serviceId of serviceIds) {
                const service = selectedServiceObjects.find(s => s.id === serviceId);
                if (service && service.serviceType === 'ELECTRICITY' && electricReading) {
                    // Nếu là dịch vụ điện và có chỉ số, sử dụng initialReading
                    await addServiceToRoom(selectedRoom.id, serviceId, electricReading);
                } else {
                    // Các dịch vụ khác hoặc điện không có chỉ số
                    await addServiceToRoom(selectedRoom.id, serviceId);
                }
            }
            
            message.success("Thêm dịch vụ vào phòng thành công!");
            setServiceModalOpen(false);
            setSelectedServices([]);
            setPendingServices([]);
            if (onRoomsUpdate) onRoomsUpdate();
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

    // Xử lý modal nhập chỉ số điện hoặc OCR
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
            
            // Thêm dịch vụ vào phòng với chỉ số điện
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

    // Function để xử lý khi người thuê rời phòng
    const handleRenterLeave = async (roomUserId) => {
        try {
            // Gọi API để xử lý người thuê rời phòng
            const response = await fetch(`${BACKEND_URL}/mpbhms/room-users/leave/${roomUserId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            if (response.ok) {
                message.success('Người thuê đã rời phòng thành công');
                if (onRoomsUpdate) onRoomsUpdate();
            } else {
                const errorData = await response.text();
                message.error(errorData);
            }
        } catch (error) {
            message.error('Có lỗi xảy ra khi xử lý người thuê rời phòng');
        }
    };

    // Function để gia hạn hợp đồng
    const handleRenewContract = async () => {
        if (!renewalDate) {
            message.error('Vui lòng chọn ngày gia hạn');
            return;
        }

        setRenewingContract(true);
        try {
            const response = await fetch(`${BACKEND_URL}/mpbhms/room-users/renew-contract/${selectedContract.id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    newEndDate: new Date(renewalDate).toISOString()
                })
            });

            if (response.ok) {
                message.success('Gia hạn hợp đồng thành công');
                setContractModalOpen(false);
                setRenewalDate("");
                setSelectedContract(null);
                if (onRoomsUpdate) onRoomsUpdate();
            } else {
                const errorData = await response.text();
                message.error(errorData);
            }
        } catch (error) {
            message.error('Có lỗi xảy ra khi gia hạn hợp đồng');
        } finally {
            setRenewingContract(false);
        }
    };

    // Function để xử lý hợp đồng hết hạn
    const handleProcessExpiredContracts = async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/mpbhms/room-users/process-expired-contracts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (response.ok) {
                message.success('Đã xử lý tất cả hợp đồng hết hạn');
                if (onRoomsUpdate) onRoomsUpdate();
            } else {
                const errorData = await response.text();
                message.error(errorData);
            }
        } catch (error) {
            message.error('Có lỗi xảy ra khi xử lý hợp đồng hết hạn');
        }
    };

    // Function để cập nhật hợp đồng
    const handleUpdateContract = async () => {
        if (!updateContractData.reasonForUpdate) {
            message.error('Vui lòng nhập lý do cập nhật');
            return;
        }

        setUpdatingContract(true);
        try {
            const requestData = {
                contractId: selectedContract.id,
                newRentAmount: updateContractData.newRentAmount ? parseFloat(updateContractData.newRentAmount) : null,
                newDepositAmount: updateContractData.newDepositAmount ? parseFloat(updateContractData.newDepositAmount) : null,
                newTerms: updateContractData.newTerms || null,
                reasonForUpdate: updateContractData.reasonForUpdate,
                requiresTenantApproval: updateContractData.requiresTenantApproval,
                tenantIds: selectedContract.roomUsers?.map(ru => ru.user.id) || []
            };

            const response = await fetch(`${BACKEND_URL}/mpbhms/room-users/update-contract`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            });

            if (response.ok) {
                message.success('Đã tạo yêu cầu cập nhật hợp đồng thành công');
                setUpdateContractModalOpen(false);
                setUpdateContractData({
                    newRentAmount: "",
                    newDepositAmount: "",
                    newTerms: "",
                    reasonForUpdate: "",
                    requiresTenantApproval: true
                });
                setSelectedContract(null);
                if (onRoomsUpdate) onRoomsUpdate();
            } else {
                const errorData = await response.text();
                message.error(errorData);
            }
        } catch (error) {
            message.error('Có lỗi xảy ra khi cập nhật hợp đồng');
        } finally {
            setUpdatingContract(false);
        }
    };

    const statusMenu = (room) => (
        <Menu
            onClick={({ key }) => {
                if (room.roomStatus !== key) {
                    handleStatusChange(room.id, key);
                }
            }}
            selectedKeys={[room.roomStatus]}
        >
            <Menu.Item key="Available">Còn trống</Menu.Item>
            <Menu.Item key="Occupied">Đã thuê</Menu.Item>
            <Menu.Item key="Maintenance">Bảo trì</Menu.Item>
            <Menu.Item key="Inactive">Ngừng hoạt động</Menu.Item>
        </Menu>
    );

    if (loading) {
        return (
            <Row gutter={[16, 16]}>
                {[...Array(6)].map((_, idx) => (
                    <Col key={idx} xs={24} sm={12} md={8}>
                        <Card><Skeleton active /></Card>
                    </Col>
                ))}
            </Row>
        );
    }
    
    return (
        <>
            <Row gutter={[16, 16]}>
                {rooms.map((room) => {
                    const getImageUrl = (url) => {
                        if (!url) return "/img/room-default.png";
                        if (url.startsWith("http")) return url;
                        return BACKEND_URL + url;
                    };
                    const imageUrl = room.images && room.images.length > 0
                        ? getImageUrl(room.images[0].imageUrl)
                        : "/img/room-default.png";
                    const currentStatusProps = getStatusProps(room.roomStatus);

                    return (
                        <Col key={room.id} xs={24} sm={12} md={8}>
                            <Card
                                cover={
                                    <img
                                        alt="room"
                                        src={imageUrl}
                                        style={{ height: 200, objectFit: "cover", width: "100%" }}
                                    />
                                }
                            >
                                <Meta
                                    title={
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span>{room.roomNumber}</span>
                                            {room.building && (
                                                <span style={{ marginLeft: 8, fontWeight: 400, color: '#888', fontSize: 13 }}>
                                                    | {room.building}
                                                </span>
                                            )}
                                            <Tag 
                                                color={room.isActive ? "green" : "red"}
                                                onClick={() => handleToggleActive(room.id)}
                                                style={{
                                                    cursor: 'pointer',
                                                    opacity: togglingId === room.id ? 0.5 : 1
                                                }}
                                            >
                                                {room.isActive ? "Đang hoạt động" : "Ngừng hoạt động"}
                                            </Tag>
                                        </div>
                                    }
                                    description={
                                        <div>
                                            {room.building && (
                                                <div>Building: {room.building}</div>
                                            )}
                                            <div>Giá: {room.pricePerMonth?.toLocaleString("vi-VN")} VND/tháng</div>
                                            {room.area && (
                                                <div>Diện tích: {room.area} m²</div>
                                            )}
                                        </div>
                                    }
                                />
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 18, alignItems: 'center' }}>
                                    <Button
                                        type="primary"
                                        style={{ borderRadius: 6, minWidth: 80, height: 38 }}
                                        onClick={() => {
                                            if (user?.role?.roleName?.toUpperCase?.() === "ADMIN" || user?.role?.roleName?.toUpperCase?.() === "SUBADMIN") {
                                                navigate(`/admin/rooms/${room.id}/edit`);
                                            } else {
                                                navigate(`/landlord/rooms/${room.id}/edit`);
                                            }
                                        }}
                                    >
                                        Sửa
                                    </Button>
                                    <Button
                                        type="default"
                                        style={{ borderRadius: 6, minWidth: 120, height: 38 }}
                                        onClick={() => {
                                            if (user?.role?.roleName?.toUpperCase?.() === "ADMIN" || user?.role?.roleName?.toUpperCase?.() === "SUBADMIN") {
                                                navigate(`/admin/rooms/${room.id}/assign`);
                                            } else {
                                                navigate(`/landlord/rooms/${room.id}/assign`);
                                            }
                                        }}
                                    >
                                        Gán người thuê
                                    </Button>
                                    <Button
                                        type="primary"
                                        danger
                                        style={{ borderRadius: 6, minWidth: 90, height: 38 }}
                                        onClick={async () => {
                                            if (window.confirm('Bạn có chắc muốn xóa phòng này không?')) {
                                                try {
                                                    await deleteRoom(room.id);
                                                    message.success('Xóa phòng thành công');
                                                    if (onRoomsUpdate) onRoomsUpdate();
                                                } catch (e) {
                                                    const backendMsg = e?.response?.data?.message || e?.response?.data?.error || 'Failed to delete room';
                                                    message.error(backendMsg);
                                                }
                                            }
                                        }}
                                    >
                                        Xóa
                                    </Button>
                                    <Dropdown overlay={statusMenu(room)} trigger={['click']} disabled={updatingId === room.id}>
                                        <a onClick={e => e.preventDefault()} style={{
                                            opacity: updatingId === room.id ? 0.5 : 1,
                                            cursor: updatingId === room.id ? 'wait' : 'pointer',
                                            display: 'inline-block',
                                            marginLeft: 2
                                        }}>
                                            <Badge
                                                status={currentStatusProps.status}
                                                text={<span style={{ fontWeight: 500, fontSize: 15 }}>{currentStatusProps.text}</span>}
                                            />
                                        </a>
                                    </Dropdown>
                                    <Button
                                        type="dashed"
                                        style={{ borderRadius: 6, minWidth: 120, height: 38, fontWeight: 500, borderColor: '#52c41a', color: '#52c41a' }}
                                        onClick={() => openServiceModal(room)}
                                    >
                                        Thêm dịch vụ
                                    </Button>
                                </div>
                            </Card>
                        </Col>
                    );
                })}
            </Row>
            {/* Modal chọn dịch vụ */}
            <Modal
                open={serviceModalOpen}
                onCancel={() => setServiceModalOpen(false)}
                onOk={handleAddService}
                okText="Thêm dịch vụ"
                confirmLoading={addingService}
                okButtonProps={{ disabled: services.length === 0 }}
                title={`Thêm dịch vụ vào phòng ${selectedRoom?.roomNumber}`}
            >
                {services.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                        <p>This room already has all services!</p>
                        <p>No more services to add.</p>
                    </div>
                ) : (
                    <>
                        <div style={{ marginBottom: 16 }}>
                            <p style={{ color: '#666', fontSize: 14 }}>
                                Chọn dịch vụ để thêm vào phòng {selectedRoom?.roomNumber}:
                            </p>
                        </div>
                        <Select
                            mode="multiple"
                            style={{ width: "100%" }}
                            placeholder="Chọn dịch vụ"
                            value={selectedServices}
                            onChange={setSelectedServices}
                        >
                            {services.map((s) => (
                                <Option key={s.id} value={s.id}>{s.serviceName} ({s.serviceType})</Option>
                            ))}
                        </Select>
                    </>
                )}
            </Modal>
            {/* Modal nhập chỉ số điện hoặc OCR */}
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
                cancelText="Không"
                confirmLoading={ocrLoading}
                title={`Nhập chỉ số điện cho phòng ${selectedRoom?.roomNumber}`}
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
                        onChange={e => setElectricValue(e.target.value)}
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
        </>
    );
}
