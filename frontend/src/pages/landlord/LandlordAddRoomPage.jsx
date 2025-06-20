import React, { useState } from "react";
import {
  Layout,
  Form,
  Input,
  InputNumber,
  Button,
  Select,
  Upload,
  message,
  Row,
  Col,
} from "antd";
import { UploadOutlined, PlusOutlined } from "@ant-design/icons";
import LandlordSidebar from "../../components/layout/LandlordSidebar";
import PageHeader from "../../components/common/PageHeader";

const { Sider, Content } = Layout;
const { TextArea } = Input;
const { Option } = Select;

export default function LandlordAddRoomPage() {
  const [form] = Form.useForm();
  const [assetList, setAssetList] = useState(["Bed", "Broom"]);

  const handleAddAsset = () => {
    setAssetList([...assetList, ""]);
  };

  const handleFinish = (values) => {
    console.log("Room added:", values);
    message.success("Room added successfully!");
    // TODO: Call API here
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider width={220}>
        <LandlordSidebar />
      </Sider>
      <Layout style={{ marginTop: 20, marginLeft: 15 }}>
        <PageHeader title="Add Room" />
        <Content style={{ padding: "24px" }}>
          <Form
            layout="vertical"
            form={form}
            onFinish={handleFinish}
            initialValues={{
              building: "A",
              maxPeople: 1,
              area: 20,
              price: 1000000,
            }}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="roomNumber"
                  label="Room Number"
                  rules={[{ required: true }]}
                >
                  <Input placeholder="e.g. 203" />
                </Form.Item>
              </Col>

              <Col span={12}>
                <Form.Item
                  name="building"
                  label="Building"
                  rules={[{ required: true }]}
                >
                  <Input placeholder="e.g. A" />
                </Form.Item>
              </Col>

              <Col span={12}>
                <Form.Item
                  name="price"
                  label="Cost (VND/Month)"
                  rules={[{ required: true }]}
                >
                  <InputNumber
                    min={0}
                    style={{ width: "100%" }}
                    formatter={(val) =>
                      `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
                    }
                    parser={(val) => val.replace(/\./g, "")}
                  />
                </Form.Item>
              </Col>

              <Col span={12}>
                <Form.Item
                  name="price"
                  label="Cost (VND/Month)"
                  rules={[{ required: true }]}
                >
                  <InputNumber
                    min={0}
                    style={{ width: "100%" }}
                    formatter={(val) =>
                      `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
                    }
                    parser={(val) => val.replace(/\./g, "")}
                  />
                </Form.Item>
              </Col>

              <Col span={12}>
                <Form.Item
                  name="area"
                  label="Area (m²)"
                  rules={[{ required: true }]}
                >
                  <InputNumber min={1} max={100} style={{ width: "100%" }} />
                </Form.Item>
              </Col>

              <Col span={12}>
                <Form.Item
                  name="maxPeople"
                  label="Maximum number of people"
                  rules={[{ required: true }]}
                >
                  <InputNumber min={1} max={5} style={{ width: "100%" }} />
                </Form.Item>
              </Col>

              <Col span={12}>
                <Form.Item name="image" label="Image">
                  <Upload name="image" listType="picture" maxCount={5}>
                    <Button icon={<UploadOutlined />}>Upload</Button>
                  </Upload>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item label="Assets">
              <Row gutter={[8, 8]}>
                {assetList.map((asset, index) => (
                  <Col key={index}>
                    <Button icon={<UploadOutlined />}>
                      {asset || "Asset"}
                    </Button>
                  </Col>
                ))}
                <Col>
                  <Button icon={<PlusOutlined />} onClick={handleAddAsset} />
                </Col>
              </Row>
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit">
                Add Room
              </Button>
            </Form.Item>
          </Form>
        </Content>
      </Layout>
    </Layout>
  );
}
