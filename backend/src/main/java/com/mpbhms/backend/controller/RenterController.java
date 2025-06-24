package com.mpbhms.backend.controller;

import com.mpbhms.backend.dto.*;
import com.mpbhms.backend.entity.User;
import com.mpbhms.backend.service.RenterService;
import com.mpbhms.backend.util.ApiMessage;
import com.turkraft.springfilter.boot.Filter;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/mpbhms/renters")
@RequiredArgsConstructor
public class RenterController {

    private final RenterService renterService;

    // ✅ 1. Lấy danh sách người thuê với filter + phân trang
    @GetMapping
    @ApiMessage("Get list of renters with filters and pagination")
    public ResponseEntity<ResultPaginationDTO> getAllRenters(
            @Filter Specification<User> spec,
            Pageable pageable
    ) {
        return ResponseEntity.ok(renterService.getAllRenters(spec, pageable));
    }

    // ✅ 2. Tạo người thuê mới (mặc định roleId = 2)
    @PostMapping
    @ApiMessage("Create new renter account")
    public ResponseEntity<CreateUserResponse> createRenter(@Valid @RequestBody CreateUserRequest request) {
        CreateUserResponse response = renterService.createRenter(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // ✅ 3. Cập nhật trạng thái kích hoạt / vô hiệu hoá
    @PutMapping("/{id}/status")
    @ApiMessage("Update renter account status")
    public ResponseEntity<Void> updateRenterStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserStatusRequest request
    ) {
        renterService.updateRenterStatus(id, request.isActive());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/for-assign")
    public ResponseEntity<List<UserDTO>> getRentersForAssign(@RequestParam(required = false) String keyword) {
        return ResponseEntity.ok(renterService.getRentersForAssign(keyword));
    }
}
