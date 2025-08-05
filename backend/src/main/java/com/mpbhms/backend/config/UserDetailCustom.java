package com.mpbhms.backend.config;

import com.mpbhms.backend.entity.User;
import com.mpbhms.backend.service.UserService;
import lombok.AllArgsConstructor;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Component;

import java.util.Collections;

@AllArgsConstructor
@Component("userDetailsService")
public class UserDetailCustom implements UserDetailsService {

    private final UserService userService;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = this.userService.getUserWithEmail(username);
        if (user == null) {
            throw new UsernameNotFoundException("User not found with email: " + username);
        }
        System.out.println("Finded user: " + user.getEmail());
        System.out.println("Password hash: " + user.getPassword());
        // Bổ sung kiểm tra trạng thái tài khoản
        if (!user.getIsActive()) {
            //throw new DisabledException("User has been de-activated");
            throw new DisabledException("Tài khoản đã bị vô hiệu hóa");
        }

        String role = user.getRole() != null ? user.getRole().getRoleName() : "ROLE_GUEST";

        return new org.springframework.security.core.userdetails.User(
                user.getEmail(),
                user.getPassword(),
                Collections.singletonList(new SimpleGrantedAuthority(role))
        );
    }

}
