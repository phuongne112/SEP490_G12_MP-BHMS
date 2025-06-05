package com.mpbhms.backend.config;

import com.mpbhms.backend.entity.PermissionEntity;
import com.mpbhms.backend.entity.RoleEntity;
import com.mpbhms.backend.entity.UserEntity;
import com.mpbhms.backend.exception.IdInvalidException;
import com.mpbhms.backend.service.UserService;
import com.mpbhms.backend.util.SecurityUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.HandlerMapping;

import java.util.List;

public class PermissionInterceptor implements HandlerInterceptor {

    @Autowired
    private UserService userService;

    @Transactional
    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws Exception {

        // Lấy đường dẫn đã match pattern (ví dụ: /api/users/{id})
        String matchedPattern = (String) request.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE);
        String httpMethod = request.getMethod();

        // Lấy thông tin người dùng hiện tại
        String currentEmail = SecurityUtil.getCurrentUserLogin().orElse(null);
        if (currentEmail == null) {
            return true; // chưa đăng nhập thì để Spring Security xử lý riêng
        }

        UserEntity user = userService.getUserWithEmail(currentEmail);
        if (user == null || user.getRole() == null) {
            throw new IdInvalidException("Bạn không có quyền truy cập tài nguyên này!");
        }

        RoleEntity role = user.getRole();
        List<PermissionEntity> permissions = role.getPermissionEntities();

        boolean isAllowed = permissions.stream()
                .anyMatch(permission ->
                        matchedPattern.equals(permission.getApiPath())
                                && httpMethod.equalsIgnoreCase(permission.getMethod()));

        if (!isAllowed) {
            throw new IdInvalidException("Bạn không có quyền truy cập API này!");
        }

        return true;
    }
}
