import React, { useState, useEffect } from "react";
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Upload,
  message,
  Card,
  Row,
  Col,
  Button,
  Space,
} from "antd";
import {
  UploadOutlined,
  SaveOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { getRoomById, updateRoom } from "../../services/roomService";
import axiosClient from "../../services/axiosClient";

const { Option } = Select;

export default function EditRoomModal({ visible, onCancel, roomId, onSuccess }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [hasActiveUser, setHasActiveUser] = useState(false);
  const [roomData, setRoomData] = useState(null);
  const [existingImages, setExistingImages] = useState([]);

  useEffect(() => {
    if (visible && roomId) {
      // Reset form trước khi load dữ liệu mới
      form.resetFields();
      setRoomData(null);
      setHasActiveUser(false);
      setExistingImages([]);
      
      // Delay một chút để đảm bảo form đã reset
      setTimeout(() => {
        fetchRoom();
      }, 100);
    }
  }, [visible, roomId]);

  const fetchRoom = async () => {
    setLoading(true);
    try {
      console.log('Fetching room with ID:', roomId);
      const res = await getRoomById(roomId);
      console.log('Room data received:', res);
      
      const room = res.result || res.data || res;
      
      if (room) {
        setRoomData(room);
        console.log('Setting form values:', {
          building: room.building,
          roomNumberSuffix: room.roomNumber ? parseInt(room.roomNumber.replace(/[A-Z]/g, '')) : null,
          area: room.area,
          price: room.pricePerMonth,
          roomStatus: room.roomStatus,
          maxOccupants: room.maxOccupants,
          description: room.description,
        });
        console.log('Room description:', room.description);
        console.log('Room images count:', room.images ? room.images.length : 0);
        
                 const formValues = {
           building: room.building,
           roomNumberSuffix: room.roomNumber ? parseInt(room.roomNumber.replace(/[A-Z]/g, '')) : null,
           area: room.area,
           price: room.pricePerMonth,
           roomStatus: room.roomStatus,
           maxOccupants: room.maxOccupants,
           numberOfBedrooms: room.numberOfBedrooms || 1,
           numberOfBathrooms: room.numberOfBathrooms || 1,
           description: room.description || '',
         };
        
        form.setFieldsValue(formValues);
        
        // Force update form để đảm bảo dữ liệu được hiển thị
        setTimeout(() => {
          form.setFieldsValue(formValues);
        }, 50);
        
        // Kiểm tra xem phòng có người thuê đang hoạt động không
        setHasActiveUser(room.roomUsers && room.roomUsers.some(ru => ru.status === 'ACTIVE'));
        
        // Xử lý ảnh hiện tại
        if (room.images && room.images.length > 0) {
          console.log('Room images:', room.images);
          const imageFiles = room.images.map((img, index) => {
            const imageUrl = img.imageUrl || img.imageURL || img.url;
            const fullUrl = imageUrl && !imageUrl.startsWith('http') ? `http://localhost:8080${imageUrl}` : imageUrl;
            return {
              uid: `existing-${img.id || index}`,
              name: `image-${index}.jpg`,
              status: 'done',
              url: fullUrl,
              thumbUrl: fullUrl,
            };
          });
          setExistingImages(imageFiles);
        } else {
          setExistingImages([]);
        }
      } else {
        message.error("Không tìm thấy thông tin phòng");
      }
    } catch (err) {
      console.error('Error fetching room:', err);
      message.error("Không thể tải thông tin phòng: " + (err.response?.data?.message || err.message));
    }
    setLoading(false);
  };

  const handleUploadChange = ({ fileList: newFileList }) => {
    setExistingImages(newFileList);
  };



  const handleFinish = async (values) => {
    try {
      setLoading(true);
      
      // Chuẩn bị dữ liệu phòng theo AddRoomDTO
      const roomData = {
        roomNumber: `${values.building}${values.roomNumberSuffix}`,
        area: values.area,
        pricePerMonth: values.price,
        roomStatus: values.roomStatus,
        numberOfBedrooms: values.numberOfBedrooms,
        numberOfBathrooms: values.numberOfBathrooms,
        description: values.description,
        maxOccupants: values.maxOccupants,
        isActive: true,
        building: values.building,
      };
      
      // Chuẩn bị FormData cho multipart upload
      const formData = new FormData();
      formData.append('room', JSON.stringify(roomData));
      
      // Thêm ảnh mới nếu có
      const newImages = existingImages.filter(img => img.originFileObj);
      newImages.forEach((image, index) => {
        formData.append('images', image.originFileObj);
      });
      
      // Thêm danh sách ảnh cũ cần giữ lại
      const existingImageIds = existingImages
        .filter(img => !img.originFileObj && img.uid.startsWith('existing-'))
        .map(img => parseInt(img.uid.replace('existing-', '')));
      
      if (existingImageIds.length > 0) {
        formData.append('keepImageIds', JSON.stringify(existingImageIds));
      }
      
      console.log('Submitting room data with images:', {
        roomData,
        newImagesCount: newImages.length,
        keepImageIds: existingImageIds
      });
      
      // Gọi API update room với multipart
      const response = await axiosClient.post(`/rooms/${roomId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      message.success("Cập nhật phòng thành công!");
      onSuccess?.();
      onCancel();
    } catch (err) {
      console.error('Error updating room:', err);
      message.error(err.response?.data?.message || "Cập nhật phòng thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setRoomData(null);
    setHasActiveUser(false);
    onCancel();
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>Chỉnh sửa phòng</span>
          {roomData && (
            <span style={{ fontSize: 14, color: '#666', fontWeight: 'normal' }}>
              - {roomData.roomNumber}
            </span>
          )}
        </div>
      }
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={1000}
      style={{ top: 20 }}
      destroyOnClose
    >
      <div style={{ display: "flex", gap: 24, flexWrap: 'wrap', alignItems: 'stretch' }}>
        <Card 
          title="Thông tin phòng" 
          style={{ 
            flex: 1, 
            minWidth: '400px', 
            textAlign: 'left', 
            minHeight: '450px',
            opacity: hasActiveUser ? 0.7 : 1
          }}
        >
          <div style={{ padding: '8px 0' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div>Đang tải thông tin phòng...</div>
              </div>
            ) : (
              <Form layout="vertical" form={form} onFinish={handleFinish} disabled={hasActiveUser}>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="building"
                    label="Tòa"
                    rules={[{ required: true, message: "Vui lòng nhập tên tòa" }]}
                  >
                    <Select placeholder="Chọn tòa">
                      <Option value="A">A</Option>
                      <Option value="B">B</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="roomNumberSuffix"
                    label="Số phòng"
                    rules={[{ required: true, message: "Vui lòng nhập số phòng (chỉ gồm số)" }]}
                  >
                    <InputNumber placeholder="Ví dụ: 101" style={{ width: '100%' }} min={1} step={1} stringMode={false} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="area"
                    label="Diện tích (m²)"
                    rules={[{ required: true, message: "Vui lòng nhập diện tích" }]}
                  >
                    <InputNumber min={1} max={1000} style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="price"
                    label="Giá (VND/tháng)"
                    rules={[{ required: true, message: "Vui lòng nhập giá" }]}
                  >
                    <InputNumber min={0} style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="roomStatus"
                    label="Trạng thái phòng"
                    rules={[{ required: true, message: "Vui lòng chọn trạng thái" }]}
                  >
                    <Select>
                      <Option value="AVAILABLE">Còn trống</Option>
                      <Option value="OCCUPIED">Đã thuê</Option>
                      <Option value="MAINTENANCE">Bảo trì</Option>
                    </Select>
                  </Form.Item>
                </Col>
                                 <Col span={12}>
                   <Form.Item
                     name="maxOccupants"
                     label="Số người tối đa"
                     rules={[{ required: true, message: "Vui lòng nhập số người tối đa" }]}
                   >
                     <InputNumber min={1} max={10} style={{ width: "100%" }} />
                   </Form.Item>
                 </Col>
                 <Col span={12}>
                   <Form.Item
                     name="numberOfBedrooms"
                     label="Số phòng ngủ"
                     rules={[{ required: true, message: "Vui lòng nhập số phòng ngủ" }]}
                   >
                     <InputNumber min={1} max={5} style={{ width: "100%" }} />
                   </Form.Item>
                 </Col>
                 <Col span={12}>
                   <Form.Item
                     name="numberOfBathrooms"
                     label="Số phòng tắm"
                     rules={[{ required: true, message: "Vui lòng nhập số phòng tắm" }]}
                   >
                     <InputNumber min={1} max={3} style={{ width: "100%" }} />
                   </Form.Item>
                 </Col>
                <Col span={24}>
                  <Form.Item
                    name="description"
                    label="Mô tả"
                  >
                    <Input.TextArea rows={4} />
                  </Form.Item>
                </Col>
              </Row>
              
              <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                <Space>
                  <Button onClick={handleCancel} icon={<CloseOutlined />}>
                    Hủy
                  </Button>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    loading={loading} 
                    disabled={hasActiveUser}
                    icon={<SaveOutlined />}
                  >
                    Cập nhật phòng
                  </Button>
                </Space>
                             </Form.Item>
             </Form>
            )}
           </div>
        </Card>
        
        <Card 
          title="Hình ảnh phòng" 
          style={{ 
            flex: 1, 
            minWidth: '400px', 
            textAlign: 'left',
            minHeight: '450px'
          }}
        >
                     <Upload
             listType="picture-card"
             fileList={existingImages}
             onChange={handleUploadChange}
             disabled={hasActiveUser}
             accept="image/*"
             beforeUpload={(file) => {
               const isImage = file.type.startsWith('image/');
               if (!isImage) {
                 message.error('Chỉ có thể tải lên file ảnh!');
                 return false;
               }
               const isLt2M = file.size / 1024 / 1024 < 2;
               if (!isLt2M) {
                 message.error('Ảnh phải nhỏ hơn 2MB!');
                 return false;
               }
               return false; // Prevent auto upload
             }}
           >
            <div>
              <UploadOutlined />
              <div style={{ marginTop: 8 }}>Tải lên</div>
            </div>
          </Upload>
        </Card>
      </div>
      
      {hasActiveUser && (
        <div style={{ 
          marginTop: 16, 
          padding: 12, 
          backgroundColor: '#fff2e8', 
          border: '1px solid #ffbb96',
          borderRadius: 6,
          color: '#d46b08'
        }}>
          ⚠️ Không thể chỉnh sửa phòng khi vẫn còn người thuê đang hoạt động
        </div>
      )}
    </Modal>
  );
}
