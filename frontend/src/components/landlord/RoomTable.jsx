import React, { useState } from "react";
import { Card, Row, Col, Button, Badge, Skeleton, Tag, Dropdown, Menu, message, Modal, Select, Input, Upload } from "antd";
import { updateRoomStatus, toggleRoomActiveStatus, deleteRoom, addServiceToRoom } from "../../services/roomService";
import { getAllServicesList } from "../../services/serviceApi";
import { detectElectricOcr } from "../../services/electricOcrApi";
import { useNavigate } from "react-router-dom";

const { Meta } = Card;
const { Option } = Select;

const getStatusProps = (status) => {
    switch (status) {
        case 'Available':
            return { status: 'success', text: 'Available' };
        case 'Occupied':
            return { status: 'error', text: 'Occupied' };
        case 'Maintenance':
            return { status: 'warning', text: 'Maintenance' };
        case 'Inactive':
            return { status: 'default', text: 'Inactive' };
        default:
            return { status: 'default', text: 'Unknown' };
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

    const handleStatusChange = async (roomId, newStatus) => {
        setUpdatingId(roomId);
        try {
            await updateRoomStatus(roomId, newStatus);
            message.success('Room status updated successfully');
            if (onRoomsUpdate) {
                onRoomsUpdate();
            }
        } catch (error) {
            message.error('Failed to update room status');
        } finally {
            setUpdatingId(null);
        }
    };

    const handleToggleActive = async (roomId) => {
        setTogglingId(roomId);
        try {
            await toggleRoomActiveStatus(roomId);
            message.success('Active status updated successfully');
            if (onRoomsUpdate) {
                onRoomsUpdate();
            }
        } catch (error) {
            message.error('Failed to update active status');
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
            
            message.success("Added services to room!");
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

    const statusMenu = (room) => (
        <Menu
            onClick={({ key }) => {
                if (room.roomStatus !== key) {
                    handleStatusChange(room.id, key);
                }
            }}
            selectedKeys={[room.roomStatus]}
        >
            <Menu.Item key="Available">Available</Menu.Item>
            <Menu.Item key="Occupied">Occupied</Menu.Item>
            <Menu.Item key="Maintenance">Maintenance</Menu.Item>
            <Menu.Item key="Inactive">Inactive</Menu.Item>
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
                    const imageUrl = room.images && room.images.length > 0
                        ? room.images[0].imageUrl
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
                                actions={[
                                    <Button
                                        type="primary"
                                        onClick={() => navigate(`/landlord/rooms/${room.id}/edit`)}
                                        style={{ marginLeft: 8 }}
                                    >
                                        Edit
                                    </Button>,
                                    <Button
                                        type="default"
                                        onClick={() => navigate(`/landlord/rooms/${room.id}/assign`)}
                                        style={{ marginLeft: 8 }}
                                    >
                                        Assign Renter
                                    </Button>,
                                    <Button
                                        type="primary"
                                        danger
                                        style={{ marginLeft: 8 }}
                                        onClick={async () => {
                                            if (window.confirm('Are you sure you want to delete this room?')) {
                                                try {
                                                    await deleteRoom(room.id);
                                                    message.success('Room deleted successfully');
                                                    if (onRoomsUpdate) onRoomsUpdate();
                                                } catch (e) {
                                                    const backendMsg = e?.response?.data?.message || e?.response?.data?.error || 'Failed to delete room';
                                                    message.error(backendMsg);
                                                }
                                            }
                                        }}
                                    >
                                        Delete
                                    </Button>,
                                    <Dropdown overlay={statusMenu(room)} trigger={['click']} disabled={updatingId === room.id}>
                                        <a onClick={e => e.preventDefault()} style={{
                                            opacity: updatingId === room.id ? 0.5 : 1,
                                            cursor: updatingId === room.id ? 'wait' : 'pointer'
                                        }}>
                                            <Badge
                                                status={currentStatusProps.status}
                                                text={currentStatusProps.text}
                                            />
                                        </a>
                                    </Dropdown>,
                                    <Button type="dashed" onClick={() => openServiceModal(room)}>
                                        Thêm dịch vụ
                                    </Button>,
                                ]}
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
                                                {room.isActive ? "Active" : "Inactive"}
                                            </Tag>
                                        </div>
                                    }
                                    description={
                                        <div>
                                            {room.building && (
                                                <div>Building: {room.building}</div>
                                            )}
                                            <div>Price: {room.pricePerMonth?.toLocaleString("en-US")} VND/month</div>
                                            {room.area && (
                                                <div>Area: {room.area} m²</div>
                                            )}
                                        </div>
                                    }
                                />
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
                okText="Add Service"
                confirmLoading={addingService}
                okButtonProps={{ disabled: services.length === 0 }}
                title={`Add service(s) to room ${selectedRoom?.roomNumber}`}
            >
                {services.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                        <p>Phòng này đã có tất cả các dịch vụ!</p>
                        <p>Không còn dịch vụ nào để thêm.</p>
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
                            placeholder="Select services"
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
                okText="Ghi nhận & Thêm dịch vụ"
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
