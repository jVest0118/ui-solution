package com.uisolution.platform.config;

import com.uisolution.platform.admin.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        userRepository.findById("admin").ifPresent(admin -> {
            String encoded = passwordEncoder.encode("Admin1234!");
            // reflection 없이 JPQL로 직접 업데이트
            userRepository.updatePassword("admin", encoded);
            log.info("Admin password initialized.");
        });
    }
}
