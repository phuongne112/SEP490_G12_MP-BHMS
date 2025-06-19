import React, { useState } from "react";
import LandlordSidebar from "../../components/layout/LandlordSidebar";
import PageHeader from "../../components/common/PageHeader";
import AddRenterForm from "../../components/landlord/AddRenterForm";
import AddServiceForm from "../../components/landlord/AddServiceForm";
import AddRoommateForm from "../../components/landlord/AddRoommateForm";
import { Layout } from "antd";

const { Sider, Content } = Layout;

export default function LandlordAddRenterPage() {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    renterInfo: {},
    services: [],
    roommates: [],
  });

  const handleUpdateData = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmitAll = () => {
    console.log("Submit full data:", formData);
    // TODO: Call API here later
  };

  const renderStepForm = () => {
    switch (step) {
      case 0:
        return (
          <AddRenterForm
            data={formData.renterInfo}
            onChange={(data) => handleUpdateData("renterInfo", data)}
            onNext={() => setStep(1)}
          />
        );
      case 1:
        return (
          <AddServiceForm
            data={formData.services}
            onChange={(data) => handleUpdateData("services", data)}
            onNext={() => setStep(2)}
            onBack={() => setStep(0)}
          />
        );
      case 2:
        return (
          <AddRoommateForm
            data={formData.roommates}
            onChange={(data) => handleUpdateData("roommates", data)}
            onBack={() => setStep(1)}
            onSave={handleSubmitAll}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", flexDirection: "row" }}>
      <Sider width={220} style={{ background: "#001529" }}>
        <LandlordSidebar />
      </Sider>

      <Layout style={{ padding: 24 }}>
        <Content
          style={{
            background: "#fff",
            padding: 24,
            borderRadius: 8,
            minHeight: "100%",
          }}
        >
          <PageHeader title="Add New Renter" />

          <div style={{ marginTop: 16 }}>{renderStepForm()}</div>
        </Content>
      </Layout>
    </Layout>
  );
}
