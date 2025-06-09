import React, { useEffect, useState } from "react";
import Footer from "../components/layout/Footer";
import Header from "../components/layout/Header";
import HeroSection from "../components/home/HeroSection";
import FeaturesSection from "../components/home/FeaturesSection";

export default function HomePage() {
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [visible, setVisible] = useState(true);

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
      <FeaturesSection />
      <Footer />
    </>
  );
}
