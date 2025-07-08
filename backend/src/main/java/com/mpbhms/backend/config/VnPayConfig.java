package com.mpbhms.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
public class VnPayConfig {
    public static final String vnp_TmnCode = "DAB55LWU";
    public static final String vnp_HashSecret = "KLFHVWBIC673CTKYSBIMW39L1DP3T9NR";
    public static final String vnp_PayUrl = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
    public static String vnp_ReturnUrl;
    public static String vnp_IpnUrl;
    public static final String vnp_Version = "2.1.0";
    public static final String vnp_Command = "pay";

    @Value("${vnpay.return-url}")
    public void setReturnUrl(String url) {
        vnp_ReturnUrl = url;
    }
    @Value("${vnpay.ipn-url}")
    public void setIpnUrl(String url) {
        vnp_IpnUrl = url;
    }
} 