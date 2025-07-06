import React, { useEffect, useState } from "react";
import { Table, Spin, Popconfirm, Button, message, Tag } from "antd";
import { getAllRenters } from "../../services/renterApi";
import { updateRenterStatus } from "../../services/renterApi";

export default function RenterTable({ search = "", filter = {} }) {
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 5 });
  const [loading, setLoading] = useState(false);

  const buildFilterParams = () => {
    const params = {};
    if (search?.trim()) params.search = search.trim();
    // Có thể giữ lại filter nâng cao cho phòng/ngày nếu muốn filter thủ công ở backend sau này
    return params;
  };

  const fetchData = async (page = 1, size = 5) => {
    setLoading(true);
    try {
      const response = await getAllRenters(page - 1, size, buildFilterParams());

      const result = response.result || [];

      let filtered = result;
      // Filter thủ công ở FE nếu có filter phòng hoặc ngày
      if (filter.room) {
        filtered = filtered.filter(
          (item) => item.renterRoomInfo?.roomName === filter.room
        );
      }
      if (filter.checkInDateRange?.[0] && filter.checkInDateRange?.[1]) {
        const start = filter.checkInDateRange[0].startOf("day");
        const end = filter.checkInDateRange[1].endOf("day");
        filtered = filtered.filter((item) => {
          if (item.checkInDate === "N/A") return false;
          const checkIn = new Date(item.checkInDate);
          return checkIn >= start.toDate() && checkIn <= end.toDate();
        });
      }
      const formatted = filtered.map((item, index) => ({
        key: item.id,
        id: item.id,
        name: item.userInfo?.fullName || item.username,
        room: item.renterRoomInfo?.roomName || "N/A",
        checkInDate: item.renterRoomInfo?.checkInDate
          ? new Date(item.renterRoomInfo.checkInDate).toLocaleString()
          : "N/A",
        status: item.isActive === false ? "Ngừng thuê" : "Đang thuê",
        isActive: item.isActive,
      }));

      setData(formatted);
      if (
        filter.room ||
        (filter.checkInDateRange?.[0] && filter.checkInDateRange?.[1])
      ) {
        // Có filter nâng cao: phân trang FE
        setPagination({
          current: 1,
          pageSize: response.meta.pageSize,
          total: filtered.length,
        });
      } else {
        // Không filter nâng cao: dùng phân trang backend
        setPagination({
          current: response.meta.page,
          pageSize: response.meta.pageSize,
          total: response.meta.total,
        });
      }
    } catch (err) {
      console.error("Failed to fetch renters:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Reset về trang 1 mỗi khi search thay đổi
    setPagination((p) => ({ ...p, current: 1 }));
    fetchData(1, pagination.pageSize);
    // eslint-disable-next-line
  }, [search, filter]);

  const handleTableChange = (newPagination) => {
    fetchData(newPagination.current, newPagination.pageSize);
    setPagination((prev) => ({
      ...prev,
      current: newPagination.current,
      pageSize: newPagination.pageSize,
    }));
  };

  const handleChangeStatus = async (record) => {
    try {
      await updateRenterStatus(record.id, !record.isActive);
      message.success(
        `Renter has been ${
          !record.isActive ? "activated" : "deactivated"
        } successfully!`
      );
      // Fetch lại data từ server để đồng bộ trạng thái
      fetchData(pagination.current, pagination.pageSize);
    } catch (err) {
      message.error("Failed to update status!");
    }
  };

  const columns = [
    {
      title: "STT",
      dataIndex: "no",
      align: "center",
      width: 60,
      render: (_, __, index) =>
        pagination && pagination.current
          ? (pagination.current - 1) * (pagination.pageSize || 10) + index + 1
          : index + 1,
    },
    {
      title: "Họ và tên",
      dataIndex: "name",
      align: "center",
      width: 180,
    },
    {
      title: "Phòng",
      dataIndex: "room",
      align: "center",
      width: 120,
    },
    {
      title: "Ngày nhận phòng",
      dataIndex: "checkInDate",
      align: "center",
      width: 200,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      align: "center",
      width: 120,
      render: (_, record) => (
        <Popconfirm
          title={`Bạn có chắc muốn ${
            record.isActive ? "deactivate" : "activate"
          } this renter?`}
          onConfirm={() => handleChangeStatus(record)}
          okText="Có"
          cancelText="Không"
          placement="top"
        >
          <Tag
            color={record.isActive ? "green" : "red"}
            style={{ cursor: "pointer" }}
          >
            {record.isActive ? "Đang thuê" : "Ngừng thuê"}
          </Tag>
        </Popconfirm>
      ),
    },
  ];

  return (
    <Spin spinning={loading}>
      <Table
        columns={columns}
        dataSource={data}
        pagination={pagination}
        onChange={handleTableChange}
        locale={{ emptyText: "Không có dữ liệu" }}
      />
    </Spin>
  );
}
