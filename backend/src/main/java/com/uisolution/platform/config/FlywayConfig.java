package com.uisolution.platform.config;

import org.flywaydb.core.Flyway;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class FlywayConfig {

    /**
     * FAILED 상태의 마이그레이션을 repair로 초기화한 뒤 migrate 실행.
     * MERGE INTO 문법 실패로 V7이 FAILED 마킹된 경우를 자동 복구.
     */
    @Bean
    public FlywayMigrationStrategy repairAndMigrate() {
        return flyway -> {
            flyway.repair();   // FAILED 마킹 정리 + 체크섬 재정렬
            flyway.migrate();  // V7(수정본) 포함 펜딩 마이그레이션 적용
        };
    }
}
