import React, { useState, useEffect, useCallback } from "react";
import Footer from "../components/layout/Footer";
import Header from "../components/layout/Header";
import RoomList from "../components/home/RoomList";
import {
  Slider,
  Select,
  Button,
  Typography,
  Carousel,
  Space,
  Card,
  Row,
  Col,
  Divider,
  Tag,
  Tooltip,
  Badge,
  Drawer,
  Modal
} from "antd";
import { useNavigate } from "react-router-dom";
import { 
  FilterOutlined, 
  ClearOutlined,
  HomeOutlined,
  DollarOutlined,
  AreaChartOutlined,
  StarOutlined,
  EnvironmentOutlined,
  MenuOutlined
} from "@ant-design/icons";
import { getAllRooms } from "../services/roomService";

const { Option } = Select;
const { Title, Text } = Typography;

// Mobile detection hook
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return isMobile;
};

// Quick filter presets
const QUICK_FILTERS = [
  {
    id: 'budget',
    name: 'Tiết kiệm',
    description: '< 3 triệu',
    filters: { price: [0, 3000000], status: 'Available' },
    color: '#52c41a'
  },
  {
    id: 'popular',
    name: 'Phổ biến',
    description: '3-5 triệu',
    filters: { price: [3000000, 5000000], status: 'Available' },
    color: '#1890ff'
  },
  {
    id: 'premium',
    name: 'Cao cấp',
    description: '> 5 triệu',
    filters: { price: [5000000, 10000000], hasAsset: 'true', status: 'Available' },
    color: '#722ed1'
  }
];

const FilterSection = ({ title, children }) => (
  <div style={{ marginBottom: 20 }}>
    <div style={{ marginBottom: 12 }}>
      <Text strong style={{ fontSize: 15, color: '#333' }}>{title}</Text>
    </div>
    {children}
  </div>
);

export default function HomePage() {
  // Filter states
  const [area, setArea] = useState([22, 27]);
  const [price, setPrice] = useState([0, 10000000]);
  const [status, setStatus] = useState("All");
  const [bedrooms, setBedrooms] = useState([1, 3]);
  const [bathrooms, setBathrooms] = useState([1, 2]);
  const [hasAsset, setHasAsset] = useState("All");
  const [building, setBuilding] = useState("");
  const [appliedFilter, setAppliedFilter] = useState("isActive=true");
  const [buildingOptions, setBuildingOptions] = useState([]);
  const [buildingLoading, setBuildingLoading] = useState(false);
  const [activeQuickFilter, setActiveQuickFilter] = useState(null);
  const [filterDrawerVisible, setFilterDrawerVisible] = useState(false);
  
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Fetch buildings
  useEffect(() => {
    const fetchBuildings = async () => {
      setBuildingLoading(true);
      try {
        const res = await getAllRooms(0, 1000, "", "");
        const allRooms = res.result || [];
        const uniqueBuildings = Array.from(
          new Set(allRooms.map((r) => r.building).filter(Boolean))
        );
        setBuildingOptions(uniqueBuildings);
      } catch (e) {
        setBuildingOptions([]);
      }
      setBuildingLoading(false);
    };
    fetchBuildings();
  }, []);

  const buildRoomFilter = useCallback(() => {
    const dsl = [];
    dsl.push(`isActive=true`);

    if (area?.length === 2) {
      dsl.push(`area >= ${area[0]}`);
      dsl.push(`area <= ${area[1]}`);
    }
    if (price?.length === 2) {
      dsl.push(`pricePerMonth >= ${price[0]}`);
      dsl.push(`pricePerMonth <= ${price[1]}`);
    }
    if (bedrooms?.length === 2) {
      dsl.push(`numberOfBedrooms >= ${bedrooms[0]}`);
      dsl.push(`numberOfBedrooms <= ${bedrooms[1]}`);
    }
    if (bathrooms?.length === 2) {
      dsl.push(`numberOfBathrooms >= ${bathrooms[0]}`);
      dsl.push(`numberOfBathrooms <= ${bathrooms[1]}`);
    }
    if (status !== "All") {
      dsl.push(`roomStatus = '${status}'`);
    }
    if (hasAsset === "true") {
      dsl.push("assets IS NOT EMPTY");
    } else if (hasAsset === "false") {
      dsl.push("assets IS EMPTY");
    }
    if (building && building.trim() !== "") {
      dsl.push(`building='${building.trim()}'`);
    }
    return dsl.join(" and ");
  }, [area, price, status, bedrooms, bathrooms, hasAsset, building]);

  const handleApplyFilter = useCallback(() => {
    const dsl = buildRoomFilter().trim();
    setAppliedFilter(dsl);
    document.getElementById("room-list-section")?.scrollIntoView({ behavior: "smooth" });
  }, [buildRoomFilter]);

  const handleClearFilter = () => {
    setArea([15, 40]);
    setPrice([0, 10000000]);
    setStatus("All");
    setBedrooms([0, 5]);
    setBathrooms([0, 5]);
    setHasAsset("All");
    setBuilding("");
    setActiveQuickFilter(null);
    setAppliedFilter("isActive=true");
    
    // Scroll back to filters section
    document.getElementById("room-list-section")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleQuickFilter = (quickFilter) => {
    setActiveQuickFilter(quickFilter.id);
    
    // Update all filter states
    setArea(quickFilter.filters.area || [15, 40]);
    setPrice(quickFilter.filters.price || [0, 10000000]);
    setStatus(quickFilter.filters.status || "All");
    setBedrooms(quickFilter.filters.bedrooms || [0, 5]);
    setBathrooms(quickFilter.filters.bathrooms || [0, 5]);
    setHasAsset(quickFilter.filters.hasAsset || "All");
    setBuilding(quickFilter.filters.building || "");
    
    // Build and apply filter immediately
    const dsl = [];
    dsl.push(`isActive=true`);

    if (quickFilter.filters.area?.length === 2) {
      dsl.push(`area >= ${quickFilter.filters.area[0]}`);
      dsl.push(`area <= ${quickFilter.filters.area[1]}`);
    }
    if (quickFilter.filters.price?.length === 2) {
      dsl.push(`pricePerMonth >= ${quickFilter.filters.price[0]}`);
      dsl.push(`pricePerMonth <= ${quickFilter.filters.price[1]}`);
    }
    if (quickFilter.filters.bedrooms?.length === 2) {
      dsl.push(`numberOfBedrooms >= ${quickFilter.filters.bedrooms[0]}`);
      dsl.push(`numberOfBedrooms <= ${quickFilter.filters.bedrooms[1]}`);
    }
    if (quickFilter.filters.bathrooms?.length === 2) {
      dsl.push(`numberOfBathrooms >= ${quickFilter.filters.bathrooms[0]}`);
      dsl.push(`numberOfBathrooms <= ${quickFilter.filters.bathrooms[1]}`);
    }
    if (quickFilter.filters.status && quickFilter.filters.status !== "All") {
      dsl.push(`roomStatus = '${quickFilter.filters.status}'`);
    }
    if (quickFilter.filters.hasAsset === "true") {
      dsl.push("assets IS NOT EMPTY");
    } else if (quickFilter.filters.hasAsset === "false") {
      dsl.push("assets IS EMPTY");
    }
    if (quickFilter.filters.building && quickFilter.filters.building.trim() !== "") {
      dsl.push(`building='${quickFilter.filters.building.trim()}'`);
    }

    const filterDsl = dsl.join(" and ");
    setAppliedFilter(filterDsl);
    
    // Scroll to results immediately
    document.getElementById("room-list-section")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleViewDetail = (room) => {
    navigate(`/rooms/${room.roomNumber}`, { state: { room } });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (area[0] !== 15 || area[1] !== 40) count++;
    if (price[0] !== 0 || price[1] !== 10000000) count++;
    if (status !== "All") count++;
    if (bedrooms[0] !== 0 || bedrooms[1] !== 5) count++;
    if (bathrooms[0] !== 0 || bathrooms[1] !== 5) count++;
    if (hasAsset !== "All") count++;
    if (building) count++;
    return count;
  };

  return (
    <div style={{ background: "#fff", minHeight: "100vh" }}>
      <Header />

      <Carousel
        autoplay
        dotPosition="bottom"
        style={{
          margin: isMobile ? "12px auto" : "24px auto",
          width: isMobile ? "100%" : "95%",
          maxWidth: 1400,
          borderRadius: isMobile ? 0 : 12,
          overflow: "hidden",
        }}
      >
        {[1, 2, 3, 4, 5, 6].map(num => (
          <div key={num}>
            <div style={{ height: isMobile ? 200 : 500, overflow: "hidden" }}>
              <img
                src={`/banners/banner${num}.png`}
                alt={`Banner ${num}`}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
          </div>
        ))}
      </Carousel>

      {/* Quick Filters */}
      <div style={{ width: isMobile ? "100%" : "95%", maxWidth: 1400, margin: isMobile ? "12px auto" : "24px auto" }}>
        <Card style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none' }}>
          <div style={{ textAlign: 'center' }}>
            <Title level={isMobile ? 5 : 4} style={{ color: 'white', marginBottom: 8 }}>
              Tìm phòng nhanh
            </Title>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: isMobile ? 12 : 14 }}>
              Chọn loại phòng phù hợp với ngân sách
            </Text>
          </div>
          
          <Row gutter={isMobile ? 8 : 16} style={{ marginTop: isMobile ? 12 : 20 }}>
            {QUICK_FILTERS.map(filter => (
              <Col xs={24} sm={8} key={filter.id}>
                <Card 
                  hoverable={true}
                  size="small"
                  style={{ 
                    textAlign: 'center',
                    background: activeQuickFilter === filter.id ? 'white' : 'rgba(255,255,255,0.9)',
                    border: activeQuickFilter === filter.id ? `3px solid ${filter.color}` : '1px solid rgba(255,255,255,0.5)',
                    borderRadius: 8,
                    transform: activeQuickFilter === filter.id ? 'scale(1.02)' : 'scale(1)',
                    transition: 'all 0.3s ease',
                    boxShadow: activeQuickFilter === filter.id ? `0 4px 15px ${filter.color}30` : '0 2px 8px rgba(0,0,0,0.1)',
                    opacity: 1,
                    cursor: 'pointer',
                    marginBottom: isMobile ? 8 : 0
                  }}
                  onClick={() => handleQuickFilter(filter)}
                >
                  <div style={{ 
                    color: activeQuickFilter === filter.id ? filter.color : '#666', 
                    fontWeight: activeQuickFilter === filter.id ? 700 : 600, 
                    fontSize: isMobile ? 14 : (activeQuickFilter === filter.id ? 17 : 16),
                    marginBottom: 4,
                    transition: 'all 0.3s ease'
                  }}>
                    {filter.name}
                  </div>
                  <Text 
                    type="secondary" 
                    style={{ 
                      fontSize: isMobile ? 11 : 12,
                      color: activeQuickFilter === filter.id ? filter.color : '#999',
                      fontWeight: activeQuickFilter === filter.id ? 500 : 400
                    }}
                  >
                    {filter.description}
                  </Text>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      </div>

      <div
        id="room-list-section"
        style={{
          width: isMobile ? "100%" : "95%",
          maxWidth: 1400,
          margin: isMobile ? "12px auto" : "24px auto",
          display: isMobile ? "block" : "flex",
          alignItems: "flex-start",
          gap: isMobile ? 0 : "24px",
        }}
      >
        {/* Filter Sidebar - Hidden on mobile, shown in drawer */}
        {!isMobile && (
          <div
            style={{
              flex: "0 0 300px",
              background: "#fff",
              padding: "24px",
              borderRadius: 12,
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              position: "sticky",
              top: 24,
            }}
          >
          {/* Filter Header */}
          <div style={{ marginBottom: 24, textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <Title level={4} style={{ margin: 0, color: '#1f1f1f' }}>
                Bộ lọc chi tiết
              </Title>
              {getActiveFilterCount() > 0 && (
                <Badge count={getActiveFilterCount()} style={{ backgroundColor: '#1890ff' }} />
              )}
            </div>
            <Text type="secondary">Tùy chỉnh tìm kiếm</Text>
          </div>

          {/* Price Filter */}
          <FilterSection title="Khoảng giá">
            <Slider
              range
              min={0}
              max={10000000}
              step={100000}
              value={price}
              onChange={setPrice}
              tipFormatter={(v) => `${(v/1000000).toFixed(1)}tr`}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <Tag color="blue">{(price[0]/1000000).toFixed(1)}tr</Tag>
              <Tag color="blue">{(price[1]/1000000).toFixed(1)}tr</Tag>
            </div>
          </FilterSection>

          {/* Area Filter */}
          <FilterSection title="Diện tích (m²)">
            <Slider 
              range 
              min={15} 
              max={40} 
              value={area} 
              onChange={setArea}
              marks={{ 15: '15', 25: '25', 35: '35', 40: '40' }}
            />
          </FilterSection>

          {/* Status Filter */}
          <FilterSection title="Trạng thái">
            <Select
              value={status}
              onChange={setStatus}
              style={{ width: "100%" }}
            >
              <Option value="All">Tất cả trạng thái</Option>
              <Option value="Available">
                <Badge status="success" text="Có sẵn" />
              </Option>
              <Option value="Occupied">
                <Badge status="error" text="Đã thuê" />
              </Option>
              <Option value="Maintenance">
                <Badge status="warning" text="Bảo trì" />
              </Option>
            </Select>
          </FilterSection>

          {/* Room Details */}
          <FilterSection title="Chi tiết phòng">
            <div style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 13, color: '#666' }}>Phòng ngủ: {bedrooms[0]} - {bedrooms[1]}</Text>
              <Slider
                range
                min={0}
                max={5}
                value={bedrooms}
                onChange={setBedrooms}
              />
            </div>
            <div>
              <Text style={{ fontSize: 13, color: '#666' }}>Phòng tắm: {bathrooms[0]} - {bathrooms[1]}</Text>
              <Slider
                range
                min={0}
                max={5}
                value={bathrooms}
                onChange={setBathrooms}
              />
            </div>
          </FilterSection>

          {/* Furniture */}
          <FilterSection title="Nội thất">
            <Select
              value={hasAsset}
              onChange={setHasAsset}
              style={{ width: "100%" }}
            >
              <Option value="All">Tất cả</Option>
              <Option value="true">
                <span style={{ color: '#52c41a' }}>✓ Có nội thất</span>
              </Option>
              <Option value="false">
                <span style={{ color: '#999' }}>○ Không nội thất</span>
              </Option>
            </Select>
          </FilterSection>

          {/* Building */}
          <FilterSection title="Tòa nhà">
            <Select
              value={building}
              onChange={setBuilding}
              style={{ width: "100%" }}
              allowClear
              placeholder="Chọn tòa nhà"
              showSearch
              loading={buildingLoading}
            >
              <Option value="">Tất cả tòa nhà</Option>
              {buildingOptions.map((b) => (
                <Option key={b} value={b}>
                  {b}
                </Option>
              ))}
            </Select>
          </FilterSection>

          <Divider />

          {/* Action Buttons */}
          <Space direction="vertical" style={{ width: '100%' }}>
            <Button 
              type="primary" 
              block 
              size="large"
              onClick={handleApplyFilter}
            >
              Áp dụng bộ lọc
            </Button>
            
            <Button 
              block
              onClick={handleClearFilter}
            >
              Xóa tất cả bộ lọc
            </Button>
          </Space>
        </div>
        )}

        {/* Room List */}
        <div
          style={{
            flex: isMobile ? "none" : 1,
            background: "#fff",
            borderRadius: isMobile ? 0 : 12,
            padding: isMobile ? "16px" : "24px",
            boxShadow: isMobile ? "none" : "0 4px 12px rgba(0,0,0,0.08)",
          }}
        >
          {/* Mobile Filter Button */}
          {isMobile && (
            <div style={{ marginBottom: 16 }}>
              <Button 
                type="primary" 
                icon={<FilterOutlined />}
                onClick={() => setFilterDrawerVisible(true)}
                style={{ width: '100%', height: 40 }}
              >
                Bộ lọc chi tiết {getActiveFilterCount() > 0 && `(${getActiveFilterCount()})`}
              </Button>
            </div>
          )}
          
          <RoomList 
            filter={appliedFilter} 
            onViewDetail={handleViewDetail}
            onClearAllFilters={handleClearFilter}
          />
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      {isMobile && (
        <Drawer
          title="Bộ lọc chi tiết"
          placement="right"
          onClose={() => setFilterDrawerVisible(false)}
          open={filterDrawerVisible}
          width="100%"
          bodyStyle={{ padding: 16 }}
        >
          {/* Filter Header */}
          <div style={{ marginBottom: 24, textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <Title level={4} style={{ margin: 0, color: '#1f1f1f' }}>
                Bộ lọc chi tiết
              </Title>
              {getActiveFilterCount() > 0 && (
                <Badge count={getActiveFilterCount()} style={{ backgroundColor: '#1890ff' }} />
              )}
            </div>
            <Text type="secondary">Tùy chỉnh tìm kiếm</Text>
          </div>

          {/* Price Filter */}
          <FilterSection title="Khoảng giá">
            <Slider
              range
              min={0}
              max={10000000}
              step={100000}
              value={price}
              onChange={setPrice}
              tipFormatter={(v) => `${(v/1000000).toFixed(1)}tr`}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <Tag color="blue">{(price[0]/1000000).toFixed(1)}tr</Tag>
              <Tag color="blue">{(price[1]/1000000).toFixed(1)}tr</Tag>
            </div>
          </FilterSection>

          {/* Area Filter */}
          <FilterSection title="Diện tích (m²)">
            <Slider 
              range 
              min={15} 
              max={40} 
              value={area} 
              onChange={setArea}
              marks={{ 15: '15', 25: '25', 35: '35', 40: '40' }}
            />
          </FilterSection>

          {/* Status Filter */}
          <FilterSection title="Trạng thái">
            <Select
              value={status}
              onChange={setStatus}
              style={{ width: "100%" }}
            >
              <Option value="All">Tất cả trạng thái</Option>
              <Option value="Available">
                <Badge status="success" text="Có sẵn" />
              </Option>
              <Option value="Occupied">
                <Badge status="error" text="Đã thuê" />
              </Option>
              <Option value="Maintenance">
                <Badge status="warning" text="Bảo trì" />
              </Option>
            </Select>
          </FilterSection>

          {/* Room Details */}
          <FilterSection title="Chi tiết phòng">
            <div style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 13, color: '#666' }}>Phòng ngủ: {bedrooms[0]} - {bedrooms[1]}</Text>
              <Slider
                range
                min={0}
                max={5}
                value={bedrooms}
                onChange={setBedrooms}
              />
            </div>
            <div>
              <Text style={{ fontSize: 13, color: '#666' }}>Phòng tắm: {bathrooms[0]} - {bathrooms[1]}</Text>
              <Slider
                range
                min={0}
                max={5}
                value={bathrooms}
                onChange={setBathrooms}
              />
            </div>
          </FilterSection>

          {/* Furniture */}
          <FilterSection title="Nội thất">
            <Select
              value={hasAsset}
              onChange={setHasAsset}
              style={{ width: "100%" }}
            >
              <Option value="All">Tất cả</Option>
              <Option value="true">
                <span style={{ color: '#52c41a' }}>✓ Có nội thất</span>
              </Option>
              <Option value="false">
                <span style={{ color: '#999' }}>○ Không nội thất</span>
              </Option>
            </Select>
          </FilterSection>

          {/* Building */}
          <FilterSection title="Tòa nhà">
            <Select
              value={building}
              onChange={setBuilding}
              style={{ width: "100%" }}
              allowClear
              placeholder="Chọn tòa nhà"
              showSearch
              loading={buildingLoading}
            >
              <Option value="">Tất cả tòa nhà</Option>
              {buildingOptions.map((b) => (
                <Option key={b} value={b}>
                  {b}
                </Option>
              ))}
            </Select>
          </FilterSection>

          <Divider />

          {/* Action Buttons */}
          <Space direction="vertical" style={{ width: '100%' }}>
            <Button 
              type="primary" 
              block 
              size="large"
              onClick={() => {
                handleApplyFilter();
                setFilterDrawerVisible(false);
              }}
            >
              Áp dụng bộ lọc
            </Button>
            
            <Button 
              block
              onClick={() => {
                handleClearFilter();
                setFilterDrawerVisible(false);
              }}
            >
              Xóa tất cả bộ lọc
            </Button>
          </Space>
        </Drawer>
      )}

      <Footer />
    </div>
  );
}
