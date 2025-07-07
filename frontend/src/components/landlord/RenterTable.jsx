import React, { useEffect, useState } from "react";
import { Table, Spin, Popconfirm, message, Tag } from "antd";
import { getAllRenters, updateRenterStatus } from "../../services/renterApi";
import dayjs from "dayjs";

export default function RenterTable({ search = "", filter = {} }) {
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 5 });
  const [loading, setLoading] = useState(false);

  // ✅ Xử lý filter để gửi về BE đúng format
  const buildFilterParams = () => {
    const params = {};

    if (search?.trim()) params.search = search.trim();

    if (filter.checkInDateRange?.[0]) {
      params.checkInDateFrom = dayjs(filter.checkInDateRange[0]).format(
        "YYYY-MM-DD"
      );
    }

    if (filter.checkInDateRange?.[1]) {
      params.checkInDateTo = dayjs(filter.checkInDateRange[1]).format(
        "YYYY-MM-DD"
      );
    }

    return params;
  };

  const fetchData = async (page = 1, size = 5) => {
    setLoading(true);
    try {
      const response = await getAllRenters(page - 1, size, buildFilterParams());
      const result = response.result || [];
      // ✅ FE filter theo phòng (room)
      let filtered = result;
      if (filter.room) {
        filtered = filtered.filter(
          (item) => item.renterRoomInfo?.roomName === filter.room
        );
      }
      const formatted = filtered.map((item) => ({
        key: item.id,
        id: item.id,
        name: item.userInfo?.fullName || item.username,
        room: item.renterRoomInfo?.roomName || "N/A",
        checkInDate: item.renterRoomInfo?.checkInDate
          ? new Date(item.renterRoomInfo.checkInDate).toLocaleDateString()
          : "N/A",
        status: item.isActive ? "Đang thuê" : "Ngừng thuê",
        isActive: item.isActive,
      }));
      setData(formatted);
      // ✅ Nếu có filter FE → dùng phân trang FE, current là page hiện tại
      if (filter.room || filter.checkInDateRange?.[0]) {
        setPagination({
          current: page,
          pageSize: size,
          total: filtered.length,
        });
      } else {
        setPagination({
          current: response.meta?.page + 1 || 1,
          pageSize: response.meta?.pageSize || 5,
          total: response.meta?.total || 0,
        });
      }
    } catch (err) {
      console.error("❌ Lỗi khi tải người thuê:", err);
      message.error("Không thể tải danh sách người thuê.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPagination((p) => ({ ...p, current: 1 }));
    fetchData(1, pagination.pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        `Người thuê đã được ${
          !record.isActive ? "kích hoạt" : "vô hiệu hóa"
        } thành công.`
      );
      fetchData(pagination.current, pagination.pageSize);
    } catch (err) {
      console.error(err);
      message.error("Cập nhật trạng thái thất bại.");
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
      width: 160,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      align: "center",
      width: 140,
      render: (_, record) => (
        <Popconfirm
          title={`Bạn có chắc muốn ${
            record.isActive ? "vô hiệu hóa" : "kích hoạt"
          } người thuê này?`}
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
