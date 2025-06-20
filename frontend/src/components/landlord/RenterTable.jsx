import React, { useEffect, useState } from "react";
import { Table, Spin } from "antd";
import { getAllRenters } from "../../services/renterApi";

export default function RenterTable({ search = "", filter = {} }) {
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 5 });
  const [loading, setLoading] = useState(false);

  const buildFilterParams = () => {
    const params = {
      room: filter.room,
      checkInStart: filter.checkInDateRange?.[0]?.format("YYYY-MM-DD"),
      checkInEnd: filter.checkInDateRange?.[1]?.format("YYYY-MM-DD"),
    };
    if (search?.trim()) {
      params.search = search.trim();
    }
    return params;
  };

  const fetchData = async (page = 1, size = 5) => {
    setLoading(true);
    try {
      const response = await getAllRenters(page - 1, size, buildFilterParams());

      const result = response.result || [];

      const formatted = result.map((item, index) => ({
        key: item.id,
        name: item.userInfo?.fullName || item.username,
        room: item.userInfo?.roomName || "N/A",
        checkInDate: item.userInfo?.checkInDate || "N/A",
      }));

      setData(formatted);
      setPagination({
        current: response.meta.page,
        pageSize: response.meta.pageSize,
        total: response.meta.total,
      });
    } catch (err) {
      console.error("Failed to fetch renters:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(1, pagination.pageSize);
  }, [search, filter]);

  const handleTableChange = (pagination) => {
    fetchData(pagination.current, pagination.pageSize);
  };

  const columns = [
    {
      title: "No",
      key: "index",
      render: (text, record, index) =>
        (pagination.current - 1) * pagination.pageSize + index + 1,
    },
    { title: "Name", dataIndex: "name", key: "name" },
    { title: "Room", dataIndex: "room", key: "room" },
    { title: "Check-in Date", dataIndex: "checkInDate", key: "checkInDate" },
  ];

  return (
    <Spin spinning={loading}>
      <Table
        columns={columns}
        dataSource={data}
        pagination={pagination}
        onChange={handleTableChange}
      />
    </Spin>
  );
}
