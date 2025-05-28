package com.mpbhms.backend.config;

import com.mpbhms.backend.util.SecurityUtil;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import com.nimbusds.jose.util.Base64;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

@Configuration
public class JwtConfiguration {

    @Value("${mpbhms.jwt.base64-secret}")
    private String jwtKey;

    @Value("${mpbhms.jwt.token-validity-in-seconds}")
    private String jwtExpiration;

    private SecretKey getSecretKey() {
        byte[] keyBytes = Base64.from(jwtKey).decode();
        return new SecretKeySpec(keyBytes,0,keyBytes.length, SecurityUtil.JWT_MAC_ALGORITHM.getName());
    }
    @Bean
    public JwtEncoder jwtEncoder() {
    return new NimbusJwtEncoder(new ImmutableSecret<>(getSecretKey()));
    }
    @Bean
    public JwtDecoder jwtDecoder() {
        NimbusJwtDecoder jwtEncoder = NimbusJwtDecoder.withSecretKey(getSecretKey()).macAlgorithm
                (SecurityUtil.JWT_MAC_ALGORITHM).build();
    return token -> {
             try{
                 return jwtEncoder.decode(token);
             }catch(Exception e){
                 System.out.println("Error while decoding JWT token: " + e.getMessage());
                 throw e;
             }
        };
    }
}
