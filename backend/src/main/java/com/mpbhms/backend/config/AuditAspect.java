package com.mpbhms.backend.config;

import com.mpbhms.backend.entity.BaseEntity;
import com.mpbhms.backend.util.SecurityUtil;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.time.Instant;

import static com.mpbhms.backend.util.CurrentUserUtil.getCurrentUserLogin;

@Aspect
@Component
public class AuditAspect {
    @Before("execution(* org.springframework.data.repository.CrudRepository+.save(..)) || " +
            "execution(* org.springframework.data.jpa.repository.JpaRepository+.save(..))")
    public void beforeSave(JoinPoint joinPoint) {
        Object entity = joinPoint.getArgs()[0];

        if (entity instanceof BaseEntity base) {
            Instant now = Instant.now();
            //Goi truc tiep
            //String currentUser = SecurityContextHolder.getContext().getAuthentication().getName();
            //Gian tiep
            String currentUser = com.mpbhms.backend.util.CurrentUserUtil
                    .getCurrentUserLogin()
                    .orElse("UNKNOWN");
            if (base.getCreatedDate() == null) {
                base.setCreatedDate(now);
                base.setCreatedBy(currentUser);
            }else{

            base.setUpdatedDate(now);
            base.setUpdatedBy(currentUser);}
        }
    }
}
