package com.mpbhms.backend.enums;

public enum NotificationStatus {
    SENT("Chưa đọc"),
    DELIVERED("Đã gửi"),
    READ("Đã đọc");

    private final String displayName;

    NotificationStatus(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}