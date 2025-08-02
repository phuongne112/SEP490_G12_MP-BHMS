package com.mpbhms.backend.enums;

public enum NotificationType {
    RENT_REMINDER("Nhắc nhở tiền phòng"),
    MAINTENANCE("Bảo trì"),
    BOOKING_STATUS("Trạng thái đặt phòng"),
    ANNOUNCEMENT("Thông báo chung"),
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
