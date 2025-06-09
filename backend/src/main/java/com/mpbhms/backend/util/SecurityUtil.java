package com.mpbhms.backend.util;

import com.mpbhms.backend.response.LoginDTOResponse;
import com.nimbusds.jose.util.Base64;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;


@Service
@RequiredArgsConstructor
public class SecurityUtil {
    private final JwtEncoder jwtEncoder;
    private final JwtDecoder jwtDecoder;

    public static final MacAlgorithm JWT_MAC_ALGORITHM = MacAlgorithm.HS512;
    @Value("${mpbhms.jwt.base64-secret}")
    private String jwtKey;

    @Value("${mpbhms.jwt.access-token-validity-in-seconds}")
    private long accessTokenExpiration;

    @Value("${mpbhms.jwt.refresh-token-validity-in-seconds}")
    private long refreshTokenExpiration;

    private SecretKey getSecretKey() {
        byte[] keyBytes = Base64.from(jwtKey).decode();
        return new SecretKeySpec(keyBytes,0,keyBytes.length,JWT_MAC_ALGORITHM.getName());
    }

    public String createAccessToken(String email, LoginDTOResponse loginDTOResponse) {
        LoginDTOResponse.UserInsideToken userInsideToken = new LoginDTOResponse.UserInsideToken();
        userInsideToken.setId(loginDTOResponse.getUser().getId());
        userInsideToken.setEmail(loginDTOResponse.getUser().getEmail());
        userInsideToken.setName(loginDTOResponse.getUser().getName());

        Instant now = Instant.now();
        Instant validity =now.plus(this.accessTokenExpiration, ChronoUnit.SECONDS);
        //Data
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuedAt(now)
                .expiresAt(validity)
                .subject(email)
                .claim("user", userInsideToken)
                .build();
        JwsHeader jwsHeader = JwsHeader.with(JWT_MAC_ALGORITHM).build();
        return this.jwtEncoder.encode(JwtEncoderParameters.from(jwsHeader,claims)).getTokenValue();

    }
    public String createRefreshToken(String email, LoginDTOResponse loginDTOResponse) {
        LoginDTOResponse.UserInsideToken userInsideToken = new LoginDTOResponse.UserInsideToken();
        userInsideToken.setId(loginDTOResponse.getUser().getId());
        userInsideToken.setEmail(loginDTOResponse.getUser().getEmail());
        userInsideToken.setName(loginDTOResponse.getUser().getName());


        Instant now = Instant.now();
        Instant validity =now.plus(this.refreshTokenExpiration, ChronoUnit.SECONDS);
        //Data
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuedAt(now)
                .expiresAt(validity)
                .subject(email)
                .claim("user", userInsideToken)
                .build();
        JwsHeader jwsHeader = JwsHeader.with(JWT_MAC_ALGORITHM).build();
        return this.jwtEncoder.encode(JwtEncoderParameters.from(jwsHeader,claims)).getTokenValue();

    }


    public Jwt checkValidRefreshToken(String token) {
        NimbusJwtDecoder jwtEncoder = NimbusJwtDecoder.withSecretKey(getSecretKey()).macAlgorithm
                (SecurityUtil.JWT_MAC_ALGORITHM).build();
        try{
            return jwtEncoder.decode(token);
        }catch(Exception e){
            System.out.println("Refresh Token Error: " + e.getMessage());
            throw e;
        }
    }
    /**
     * Get the login of the current user.
     *
     * @return the login of the current user.
     */
    public static Optional<String> getCurrentUserLogin() {
        SecurityContext securityContext = SecurityContextHolder.getContext();
        return Optional.ofNullable(extractPrincipal(securityContext.getAuthentication()));
    }

    private static String extractPrincipal(Authentication authentication) {
        if (authentication == null) {
            return null;
        } else if (authentication.getPrincipal() instanceof UserDetails springSecurityUser) {
            return springSecurityUser.getUsername();
        } else if (authentication.getPrincipal() instanceof Jwt jwt) {
            return jwt.getSubject();
        } else if (authentication.getPrincipal() instanceof String s) {
            return s;
        }
        return null;
    }

    /**
     * Get the JWT of the current user.
     *
     * @return the JWT of the current user.
     */
    public static Optional<String> getCurrentUserJWT() {
        SecurityContext securityContext = SecurityContextHolder.getContext();
        return Optional.ofNullable(securityContext.getAuthentication())
                .filter(authentication -> authentication.getCredentials() instanceof String)
                .map(authentication -> (String) authentication.getCredentials());
    }

    public String generateResetToken(String email) {
        Instant now = Instant.now();
        Instant expiry = now.plus(Duration.ofMinutes(15));

        JwtClaimsSet claims = JwtClaimsSet.builder()
                .subject(email)
                .issuedAt(now)
                .expiresAt(expiry)
                .claim("type", "RESET")
                .build();

        return jwtEncoder.encode(JwtEncoderParameters.from(claims)).getTokenValue();
    }

    public String extractEmailFromResetToken(String token) {
        Jwt decoded = jwtDecoder.decode(token);
        String type = decoded.getClaimAsString("type");
        if (!"RESET".equals(type)) {
            throw new IllegalArgumentException("Invalid token type");
        }
        return decoded.getSubject();
    }

}
