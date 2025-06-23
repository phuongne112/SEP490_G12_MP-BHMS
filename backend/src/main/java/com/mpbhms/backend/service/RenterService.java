package com.mpbhms.backend.service;

import com.mpbhms.backend.dto.*;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

public interface RenterService {

    ResultPaginationDTO getAllRenters(Specification<?> spec, Pageable pageable, String search);

    CreateUserResponse createRenter(CreateUserRequest request);

    void updateRenterStatus(Long userId, boolean isActive);
}
