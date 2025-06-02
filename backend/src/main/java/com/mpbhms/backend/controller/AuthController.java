package com.mpbhms.backend.controller;

import com.mpbhms.backend.dto.LoginDTO;
import com.mpbhms.backend.dto.LoginDTORes;
import com.mpbhms.backend.entity.UserEntity;
import com.mpbhms.backend.service.UserService;
import com.mpbhms.backend.util.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/mpbhms/auth")
@RequiredArgsConstructor
public class AuthController {
    private final UserService userService;
    private final AuthenticationManagerBuilder authenticationManagerBuilder;
    private final SecurityUtil securityUtil;
    @PostMapping("/login")
    public ResponseEntity<LoginDTORes> login(@RequestBody LoginDTO login) {
        //Nap input gom email/password vao security
        UsernamePasswordAuthenticationToken authenticationToken =
                new UsernamePasswordAuthenticationToken(login.username, login.password);
        //Xac thuc ng dung = loadUserByUserName
        Authentication authentication = authenticationManagerBuilder.getObject().authenticate(authenticationToken);
        //Create a token
        String accessToken = this.securityUtil.createToken(authentication);
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
        loginDTORes.setAccessToken(accessToken);
        return ResponseEntity.ok().body(loginDTORes);
    }
}
