package com.mpbhms.backend.service.impl;

import com.mpbhms.backend.dto.UserInfoDTO;
import com.mpbhms.backend.dto.UserWithRoleDTO;
import com.mpbhms.backend.entity.UserEntity;
import com.mpbhms.backend.entity.UserInfoEntity;
import com.mpbhms.backend.repository.UserInfoRepository;
import com.mpbhms.backend.repository.UserRepository;
import com.mpbhms.backend.service.UserInfoService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserInfoServiceImpl implements UserInfoService {

    private final UserInfoRepository userInfoRepository;
    private final UserRepository userRepository;

    @Override
    public UserInfoEntity saveOrUpdateUserInfo(UserInfoDTO request) {
        UserEntity user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new EntityNotFoundException("User not found"));

        UserInfoEntity info = userInfoRepository.findByUserId(request.getUserId())
                .orElse(new UserInfoEntity());

        info.setUser(user);
        info.setFullName(request.getFullName());
        info.setPhoneNumber(request.getPhoneNumber());
        info.setPhoneNumber2(request.getPhoneNumber2());
        info.setGender(request.getGender());
        info.setBirthDate(request.getBirthDate());
        info.setBirthPlace(request.getBirthPlace());
        info.setNationalID(request.getNationalID());
        info.setNationalIDIssuePlace(request.getNationalIDIssuePlace());
        info.setPermanentAddress(request.getPermanentAddress());

        return userInfoRepository.save(info);
    }

    @Override
    public UserInfoEntity getUserInfoByUserId(Long userId) {
        return userInfoRepository.findByUserId(userId)
                .orElseThrow(() -> new EntityNotFoundException("User info not found"));
    }
    @Override
    public UserInfoDTO convertToUserWithRoleDTO(UserInfoEntity entity) {
        UserInfoDTO dto = new UserInfoDTO();

        dto.setUserId(entity.getUser().getId());
        dto.setFullName(entity.getFullName());
        dto.setPhoneNumber(entity.getPhoneNumber());
        dto.setPhoneNumber2(entity.getPhoneNumber2());
        dto.setGender(entity.getGender());
        dto.setBirthDate(entity.getBirthDate());
        dto.setBirthPlace(entity.getBirthPlace());
        dto.setNationalID(entity.getNationalID());
        dto.setNationalIDIssuePlace(entity.getNationalIDIssuePlace());
        dto.setPermanentAddress(entity.getPermanentAddress());

        return dto;
    }


}