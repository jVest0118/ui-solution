package com.uisolution.platform.schema.service;

import com.uisolution.platform.admin.entity.UserInfo;
import com.uisolution.platform.admin.repository.UserRepository;
import com.uisolution.platform.schema.dto.ScreenSchemaDto;
import com.uisolution.platform.schema.entity.ScreenDef;
import com.uisolution.platform.schema.repository.ScreenDefRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SchemaService {

    private final ScreenDefRepository screenDefRepository;
    private final UserRepository userRepository;

    public ScreenSchemaDto getSchema(String screenId) {
        ScreenDef screen = screenDefRepository.findWithFieldsAndRules(screenId)
                .orElseThrow(() -> new IllegalArgumentException("화면을 찾을 수 없습니다: " + screenId));

        ScreenSchemaDto dto = ScreenSchemaDto.from(screen);

        // 현재 로그인 사용자의 권한 적용
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        applyPermission(dto, userId, screenId);

        return dto;
    }

    public List<ScreenSchemaDto> getAllScreens() {
        return screenDefRepository.findAll().stream()
                .filter(s -> "Y".equals(s.getUseYn()))
                .map(s -> ScreenSchemaDto.builder()
                        .screenId(s.getScreenId())
                        .screenNm(s.getScreenNm())
                        .screenType(s.getScreenType())
                        .description(s.getDescription())
                        .version(s.getVersion())
                        .build())
                .collect(Collectors.toList());
    }

    private void applyPermission(ScreenSchemaDto dto, String userId, String screenId) {
        userRepository.findActiveUserWithRoles(userId).ifPresent(user -> {
            Set<String> roles = user.getRoles().stream()
                    .map(r -> r.getRoleId())
                    .collect(Collectors.toSet());

            // SYSTEM_ADMIN 은 모든 권한
            if (roles.contains("SYSTEM_ADMIN")) {
                setAllPermissions(dto);
                return;
            }
            // TODO: role_screen 테이블에서 실제 권한 조회로 교체
            if (roles.contains("SCREEN_ADMIN") || roles.contains("DEVELOPER")) {
                setAllPermissions(dto);
            }
        });
    }

    private void setAllPermissions(ScreenSchemaDto dto) {
        // reflection 대신 builder 패턴으로 재생성하지 않고 setter 없이 처리하기 위해
        // ScreenSchemaDto 에 permissionSetter 메서드 추가 (아래 참고)
        dto.grantAllPermissions();
    }
}
