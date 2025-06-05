package com.mpbhms.backend.controller;

import com.mpbhms.backend.dto.UserInfoDTO;
import com.mpbhms.backend.entity.UserInfoEntity;
import com.mpbhms.backend.service.UserInfoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/mpbhms/user-info")
@RequiredArgsConstructor
public class UserInfoController {

    private final UserInfoService userInfoService;

    @PostMapping
    public ResponseEntity<UserInfoDTO> createOrUpdateUserInfo(@RequestBody UserInfoDTO request) {
        UserInfoEntity userInfo = userInfoService.saveOrUpdateUserInfo(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(userInfoService.convertToUserWithRoleDTO(userInfo));
    }

    @GetMapping("/{userId}")
    public ResponseEntity<UserInfoDTO> getUserInfo(@PathVariable Long userId) {
       UserInfoEntity userInfo =  userInfoService.getUserInfoByUserId(userId);
        return ResponseEntity.status(HttpStatus.OK).body(userInfoService.convertToUserWithRoleDTO(userInfo));
    }
}