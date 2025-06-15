package com.mpbhms.backend.controller;

import com.mpbhms.backend.dto.*;
import com.mpbhms.backend.entity.ApiResponse;
import com.mpbhms.backend.exception.IdInvalidException;
import com.mpbhms.backend.response.ChangePasswordDTOResponse;
import com.mpbhms.backend.response.LoginDTOResponse;
import com.mpbhms.backend.entity.UserEntity;
import com.mpbhms.backend.response.SignUpDTOResponse;
import com.mpbhms.backend.service.UserService;
import com.mpbhms.backend.util.ApiMessage;
import com.mpbhms.backend.util.SecurityUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;
    @RestController
    @RequestMapping("/mpbhms/auth")
    @RequiredArgsConstructor
public class AuthController {
        private final UserService userService;
        private final AuthenticationManagerBuilder authenticationManagerBuilder;
        private final SecurityUtil securityUtil;
        private final PasswordEncoder passwordEncoder;
        @Value("${mpbhms.jwt.refresh-token-validity-in-seconds}")
        private long refreshTokenExpiration;

        @PostMapping("/login")
        @ApiMessage("Login by credential")
        public ResponseEntity<LoginDTOResponse> login(@RequestBody LoginDTO login) {
            //Nap input gom email/password vao security
            UsernamePasswordAuthenticationToken authenticationToken =
                    new UsernamePasswordAuthenticationToken(login.username, login.password);
            //Xac thuc ng dung = loadUserByUserName
            Authentication authentication = authenticationManagerBuilder.getObject().authenticate(authenticationToken);
            //Create token
            SecurityContextHolder.getContext().setAuthentication(authentication);
            LoginDTOResponse loginDTOResponse = new LoginDTOResponse();

            UserEntity currentUserDB = this.userService.getUserWithEmail(login.username);
            if (currentUserDB != null) {
                LoginDTOResponse.UserLogin userLogin = new LoginDTOResponse.UserLogin(
                        currentUserDB.getId(),
                        currentUserDB.getEmail(),
                        currentUserDB.getUsername(),
                        currentUserDB.getRole());
                loginDTOResponse.setUser(userLogin);
            }
            String access_Token = this.securityUtil.createAccessToken(authentication.getName(), loginDTOResponse);
            loginDTOResponse.setAccessToken(access_Token);
            //Create Refresh Token
            String refresh_token = this.securityUtil.createRefreshToken(login.getUsername(), loginDTOResponse);
            //Update User
            this.userService.updateUserToken(refresh_token, login.getUsername());
            //Set Cookies
            ResponseCookie responseCookie = ResponseCookie.from("refreshToken", refresh_token)
                    .httpOnly(true)
                    .secure(true)
                    .path("/")
                    .maxAge(refreshTokenExpiration)
                    .build();
            return ResponseEntity.ok().header(HttpHeaders.SET_COOKIE, responseCookie.toString())
                    .body(loginDTOResponse);
        }

        @GetMapping("/account")
        public ResponseEntity<LoginDTOResponse.UserGetAccount> getAccount() {
            String email = SecurityUtil.getCurrentUserLogin().isPresent() ?
                    SecurityUtil.getCurrentUserLogin().get() : "";

            UserEntity currentUserDB = this.userService.getUserWithEmail(email);
            LoginDTOResponse.UserLogin userLogin = new LoginDTOResponse.UserLogin();
            LoginDTOResponse.UserGetAccount userGetAccount = new LoginDTOResponse.UserGetAccount();
            if(currentUserDB != null){
                userLogin.setId(currentUserDB.getId());
                userLogin.setEmail(currentUserDB.getEmail());
                userLogin.setName(currentUserDB.getUsername());
                userLogin.setRole(currentUserDB.getRole());
                userGetAccount.setUser(userLogin);
            }
            return ResponseEntity.ok().body(userGetAccount);

        }

        @GetMapping("/refresh")
        public ResponseEntity<LoginDTOResponse> getRefreshToken(
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
            LoginDTOResponse loginDTOResponse = new LoginDTOResponse();

            // Bổ sung thông tin user
            LoginDTOResponse.UserLogin userLogin = new LoginDTOResponse.UserLogin(
                    currentUser.getId(),
                    currentUser.getEmail(),
                    currentUser.getUsername(),
                    currentUser.getRole());
            loginDTOResponse.setUser(userLogin);

            // Tạo access token mới
            String access_Token = this.securityUtil.createAccessToken(email, loginDTOResponse);
            loginDTOResponse.setAccessToken(access_Token);

            // Tạo refresh token mới
            String new_refresh_token = this.securityUtil.createRefreshToken(email, loginDTOResponse);

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
                    .body(loginDTOResponse);
        }

        @PostMapping("/logout")
        @ApiMessage("Logout with valid credential")
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

        @PostMapping("/signup")
        @ApiMessage("Register a new user account")
        public ResponseEntity<CreateUserResponse> signUp(@Valid @RequestBody CreateUserRequest request) {
            // Kiểm tra trùng email
            if (userService.isEmailExist(request.getEmail())) {
                throw new IdInvalidException("Email " + request.getEmail() + " is exist, please use another email");
            }
            // Gọi service để tạo
            UserEntity saved = userService.signUp(request);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(userService.convertToCreateUserDTO(saved));
        }

        @PutMapping("/change-password")
        @ApiMessage("Change user password")
        public ResponseEntity<ChangePasswordDTOResponse> changePassword(@Valid @RequestBody ChangePasswordDTO
                                                                                request,
                                                                        Principal principal) {
            String response = userService.changePasswordUser(principal.getName(), request.getCurrentPassword(), request.getNewPassword());
            return ResponseEntity.ok(new ChangePasswordDTOResponse(response));
        }

        @PostMapping("/request-reset")
        @ApiMessage("Request password reset link via email")
        public ResponseEntity<?> requestReset(@RequestBody ResetRequestDTO request) {
            if (!userService.isEmailExist(request.getEmail())) {
                ApiResponse<Object> response = new ApiResponse<>(
                    400,
                    "EMAIL_NOT_FOUND",
                    "Email not found in the system.",
                    null
                );
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            }
            userService.sendResetPasswordToken(request.getEmail());
            ApiResponse<Object> response = new ApiResponse<>(
                200,
                "",
                "Reset link sent if email is registered.",
                null
            );
            return ResponseEntity.ok(response);
        }

        @PostMapping("/reset-password")
        @ApiMessage("Reset password using token")
        public ResponseEntity<?> resetPassword(@RequestBody ResetPasswordDTO request) {
            userService.resetPassword(request.getToken(), request.getNewPassword());
            return ResponseEntity.ok("Password reset successful.");
        }

    }