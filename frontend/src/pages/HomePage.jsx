import React, { useEffect, useState } from "react";
import Footer from "../components/layout/Footer";
import Header from "../components/layout/Header";
import HeroSection from "../components/home/HeroSection";
import FeaturesSection from "../components/home/FeaturesSection";
import RoomSection from "../components/home/RoomSection";
import RoomFilter from "../components/home/RoomFilter";

export default function HomePage() {
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [visible, setVisible] = useState(true);
  const [filters, setFilters] = useState({
    service: ["full"],
    asset: ["full"],
    area: [20, 30],
    price: [0, 3000000],
    building: ["A", "B"],
    status: ["available", "pending", "full"],
  });

  useEffect(() => {
    const shouldShow = localStorage.getItem("showWelcome");
    const user = JSON.parse(localStorage.getItem("user"));

    if (shouldShow === "true" && user?.name) {
      setWelcomeMessage(`Chào mừng, ${user.name}!`);
      localStorage.removeItem("showWelcome");

      setTimeout(() => {
        setVisible(false);
      }, 1500);

      setTimeout(() => {
        setWelcomeMessage("");
      }, 3000);
    }
  }, []);

  return (
    <>
      <Header />
      {welcomeMessage && (
        <div
          style={{
            backgroundColor: "#DFF6E0",
            color: "#1B5E20",
            textAlign: "center",
            padding: "16px 32px",
            fontWeight: "600",
            fontSize: "100px",
            borderRadius: "12px",
            margin: "24px auto",
            width: "fit-content",
            opacity: visible ? 1 : 0,
            transition: "opacity 0.5s ease-in-out",
          }}
        >
          {welcomeMessage}
        </div>
      )}
      <HeroSection />
      {/* <FeaturesSection /> */}
      <div
        style={{
          display: "flex",
          gap: 32,
          padding: "40px",
        }}
      >
        <RoomFilter
          filters={filters}
          onChange={setFilters}
          style={{ marginTop: 200 }}
        />
        <RoomSection filters={filters} />
      </div>
      <Footer />
    </>
  );
}
