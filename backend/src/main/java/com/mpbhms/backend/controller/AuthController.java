package com.mpbhms.backend.controller;

import com.mpbhms.backend.dto.LoginDTO;
import com.mpbhms.backend.dto.LoginDTORes;
import com.mpbhms.backend.entity.UserEntity;
import com.mpbhms.backend.service.UserService;
import com.mpbhms.backend.util.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/mpbhms/auth")
@RequiredArgsConstructor
public class AuthController {
    private final UserService userService;
    private final AuthenticationManagerBuilder authenticationManagerBuilder;
    private final SecurityUtil securityUtil;
    @Value("${mpbhms.jwt.refresh-token-validity-in-seconds}")
    private long refreshTokenExpiration;

    @PostMapping("/login")
    public ResponseEntity<LoginDTORes> login(@RequestBody LoginDTO login) {
        //Nap input gom email/password vao security
        UsernamePasswordAuthenticationToken authenticationToken =
                new UsernamePasswordAuthenticationToken(login.username, login.password);
        //Xac thuc ng dung = loadUserByUserName
        Authentication authentication = authenticationManagerBuilder.getObject().authenticate(authenticationToken);
        SecurityContextHolder.getContext().setAuthentication(authentication);
        LoginDTORes loginDTORes = new LoginDTORes();
        UserEntity currentUserDB = this.userService.getUserWithEmail(login.username);

        if(currentUserDB != null){
            LoginDTORes.UserLogin userLogin = new LoginDTORes.UserLogin(
                    currentUserDB.getId(),
                    currentUserDB.getEmail(),
                    currentUserDB.getUsername());
            loginDTORes.setUser(userLogin);
        }
        String access_Token = this.securityUtil.createAccessToken(authentication.getName(), loginDTORes.getUser());
        loginDTORes.setAccessToken(access_Token);
        //Create Refresh Token
        String refresh_token = this.securityUtil.createRefreshToken(login.getUsername(),loginDTORes);
        //Update User
        this.userService.updateUserToken(refresh_token, login.getUsername());
        //Set Cookies
        ResponseCookie responseCookie = ResponseCookie.from("refreshToken",refresh_token)
                .httpOnly(true)
                .secure(true)
                .path("/")
                .maxAge(refreshTokenExpiration)
                .build();
        return ResponseEntity.ok().header(HttpHeaders.SET_COOKIE,responseCookie.toString())
                .body(loginDTORes);
    }
    @GetMapping("/account")
    public ResponseEntity<LoginDTORes.UserGetAccount> getAccount() {
        String email = SecurityUtil.getCurrentUserLogin().isPresent() ?
                SecurityUtil.getCurrentUserLogin().get() : "";

        UserEntity currentUserDB = this.userService.getUserWithEmail(email);
        LoginDTORes.UserLogin userLogin = new LoginDTORes.UserLogin();
        LoginDTORes.UserGetAccount userGetAccount = new LoginDTORes.UserGetAccount();
        if(currentUserDB != null){
                  userLogin.setId(currentUserDB.getId());
                  userLogin.setEmail(currentUserDB.getEmail());
                  userLogin.setName(currentUserDB.getUsername());
                  userGetAccount.setUser(userLogin);
        }
        return ResponseEntity.ok().body(userGetAccount);

    }
    @GetMapping("/refresh")
    public ResponseEntity<LoginDTORes> getRefreshToken(
            @CookieValue(name = "refreshToken", required = false) String refreshToken) throws JwtException {

        if (refreshToken == null || refreshToken.isBlank()) {
            throw new JwtException("Missing refresh token");
        }

        // Kiểm tra token
        Jwt decodedToken = securityUtil.checkValidRefreshToken(refreshToken);
        String email = decodedToken.getSubject();

        // Tìm user trong DB
        UserEntity currentUser = this.userService.getUserByRefreshTokenAndEmail(refreshToken, email);
        if (currentUser == null) {
            throw new JwtException("Invalid refresh token");
        }

        // Tạo đối tượng phản hồi
        LoginDTORes loginDTORes = new LoginDTORes();

        // Bổ sung thông tin user
        LoginDTORes.UserLogin userLogin = new LoginDTORes.UserLogin(
                currentUser.getId(),
                currentUser.getEmail(),
                currentUser.getUsername()
        );
        loginDTORes.setUser(userLogin);

        // Tạo access token mới
        String access_Token = this.securityUtil.createAccessToken(email, userLogin);
        loginDTORes.setAccessToken(access_Token);

        // Tạo refresh token mới
        String new_refresh_token = this.securityUtil.createRefreshToken(email, loginDTORes);

        // Cập nhật token trong DB
        this.userService.updateUserToken(new_refresh_token, email);

        // Gửi cookie mới
        ResponseCookie responseCookie = ResponseCookie.from("refreshToken", new_refresh_token)
                .httpOnly(true)
                .secure(true)
                .path("/")
                .maxAge(refreshTokenExpiration)
                .build();

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, responseCookie.toString())
                .body(loginDTORes);
    }
    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        String email = securityUtil.getCurrentUserLogin().orElse("");
        if (email.isBlank()) {
            throw new JwtException("Token is empty or invalid");
        }

        // Xóa refresh token trong DB
        this.userService.updateUserToken(null, email);

        // Xóa cookie bằng cách đặt maxAge = 0
        ResponseCookie deleteCookie = ResponseCookie.from("refreshToken", "")
                .httpOnly(true)
                .secure(true)
                .path("/")
                .maxAge(0)
                .build();

        return ResponseEntity.noContent() // Trả về 204 No Content cho logout là chuẩn REST
                .header(HttpHeaders.SET_COOKIE, deleteCookie.toString())
                .build();
    }


}
