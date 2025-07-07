package com.mpbhms.backend.config;

public class VnPayConfig {
    public static final String vnp_TmnCode = "DAB55LWU";
    public static final String vnp_HashSecret = "KLFHVWBIC673CTKYSBIMW39L1DP3T9NR";
    public static final String vnp_PayUrl = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
    public static final String vnp_ReturnUrl = "http://20.78.57.200:8080/payment-success"; // <-- Sửa dòng này
    public static final String vnp_IpnUrl = "http://20.78.57.200:8080/mpbhms/payment/vnpay-ipn";
    public static final String vnp_Version = "2.1.0";
    public static final String vnp_Command = "pay";
} 