package com.mpbhms.backend.config;

import com.mpbhms.backend.entity.Permission;
import com.mpbhms.backend.entity.Role;
import com.mpbhms.backend.entity.User;
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
@Transactional
public class PermissionInterceptor implements HandlerInterceptor {
    @Autowired
    UserService userService;

    @Override
    public boolean preHandle(
            HttpServletRequest request,
            HttpServletResponse response, Object handler)
            throws Exception {
        String path = (String) request.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE);
        String requestURI = request.getRequestURI();
        String httpMethod = request.getMethod();

        String email = SecurityUtil.getCurrentUserLogin().isPresent()
                ? SecurityUtil.getCurrentUserLogin().get()
                : "";
        if(!email.isEmpty()){
            User user = this.userService.handleGetUserByUsername(email);
            if(user != null){
                Role role = user.getRole();
                if(role != null){
                    String roleName = role.getRoleName();
                    String pathToCheck = path;
                    String methodToCheck = httpMethod;
                    // Nếu là API book lịch thì chỉ chặn ADMIN, SUBADMIN, LANDLORD
                    if ("/mpbhms/schedules".equals(pathToCheck) && "POST".equals(methodToCheck)) {
                        if ("ADMIN".equals(roleName) || "SUBADMIN".equals(roleName) || "LANDLORD".equals(roleName)) {
                            throw new IdInvalidException("You do not have permission to access this endpoint!!!");
                        }
                        // Các role khác đều được phép book lịch
                        return true;
                    }
                    // Các API khác kiểm tra permission như cũ
                    List<Permission> permissions = role.getPermissionEntities();
                    boolean isAllow = permissions.stream().anyMatch(
                            permission -> permission.getApiPath().equals(path)
                                    &&
                                    permission.getMethod().equals(httpMethod)
                    );
                    if(!isAllow){
                        throw new IdInvalidException("You do not have permission to access this endpoint!!!");
                    }
                }else{
                    // Người dùng không có role (role == null)
                    // Nếu là API đặt lịch, chỉ cho phép người dùng thường (không phải ADMIN/SUBADMIN/LANDLORD)
                    if ("/mpbhms/schedules".equals(path) && "POST".equals(httpMethod)) {
                        return true;
                    }
                    // Nếu là API xem lịch hẹn của mình, cũng cho phép
                    if ("/mpbhms/schedules/my".equals(path) && "GET".equals(httpMethod)) {
                        return true;
                    }
                    // Nếu là API xem notification, cũng cho phép
                    if ("/mpbhms/notifications".equals(path) && "GET".equals(httpMethod)) {
                        return true;
                    }
                    // Với các API khác, từ chối truy cập
                    throw new IdInvalidException("You do not have permission to access this endpoint!!!");
                }
            }
        }

        return true;
    }
}