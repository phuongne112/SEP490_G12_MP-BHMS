package com.mpbhms.backend.enums;

public enum NotificationType {
    RENT_REMINDER("Nhắc nhở tiền phòng"),
    MAINTENANCE("Bảo trì"),
    BOOKING_STATUS("Trạng thái đặt phòng"),
    ANNOUNCEMENT("Thông báo chung"),
    PAYMENT_SUCCESS("Thanh toán thành công"),
    PAYMENT_FAILED("Thanh toán thất bại"),
    CONTRACT_EXPIRED("Hợp đồng hết hạn"),
    CONTRACT_RENEWED("Hợp đồng gia hạn"),
    SCHEDULE("Lịch trình"),
    BILL_CREATED("Hóa đơn mới"),
    BILL_PAID("Hóa đơn đã thanh toán"),
    BILL_OVERDUE("Hóa đơn quá hạn"),
    CONTRACT_AMENDMENT("Sửa đổi hợp đồng"),
    CONTRACT_TERMINATED("Hợp đồng chấm dứt"),
    ROOM_BOOKING("Đặt phòng"),
    ROOM_BOOKING_ACCEPTED("Đặt phòng được chấp nhận"),
    ROOM_BOOKING_REJECTED("Đặt phòng bị từ chối"),
    ROOM_BOOKING_CANCELLED("Đặt phòng bị hủy"),
    SERVICE_UPDATE("Cập nhật dịch vụ"),
    USER_UPDATE("Cập nhật người dùng"),
    SYSTEM_MAINTENANCE("Bảo trì hệ thống"),
    CUSTOM("Tùy chỉnh");

    private final String displayName;

    NotificationType(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
