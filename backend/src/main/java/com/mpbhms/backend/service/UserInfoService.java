package com.mpbhms.backend.service;

import com.mpbhms.backend.dto.UserInfoDTO;
import com.mpbhms.backend.dto.UserWithRoleDTO;
import com.mpbhms.backend.entity.UserEntity;
import com.mpbhms.backend.entity.UserInfoEntity;

public interface UserInfoService {
    UserInfoEntity saveOrUpdateUserInfo(UserInfoDTO request);
    UserInfoEntity getUserInfoByUserId(Long userId);
    UserInfoDTO convertToUserWithRoleDTO(UserInfoEntity entity);
}
