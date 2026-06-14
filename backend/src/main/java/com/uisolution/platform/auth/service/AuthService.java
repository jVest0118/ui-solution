package com.uisolution.platform.auth.service;

import com.uisolution.platform.admin.entity.MenuDef;
import com.uisolution.platform.admin.entity.UserInfo;
import com.uisolution.platform.admin.repository.MenuRepository;
import com.uisolution.platform.admin.repository.ProjectRepository;
import com.uisolution.platform.admin.repository.UserRepository;
import com.uisolution.platform.auth.dto.LoginRequest;
import com.uisolution.platform.auth.dto.LoginResponse;
import com.uisolution.platform.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;
    private final MenuRepository menuRepository;
    private final ProjectRepository projectRepository;

    @Transactional
    public LoginResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUserId(), request.getPassword())
        );

        UserInfo user = userRepository.findActiveUserWithRoles(request.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));
        user.updateLastLogin();

        String accessToken = jwtTokenProvider.generateToken(authentication);
        String refreshToken = jwtTokenProvider.generateRefreshToken(user.getUserId());

        List<String> roleIds = user.getRoles().stream()
                .map(r -> r.getRoleId())
                .collect(Collectors.toList());

        List<MenuDef> menus = menuRepository.findMenusByRoleIds(roleIds);
        List<LoginResponse.MenuDto> menuTree = buildMenuTree(menus);

        List<LoginResponse.ProjectDto> projects = projectRepository.findProjectsByRoleIds(roleIds)
                .stream()
                .map(p -> LoginResponse.ProjectDto.builder()
                        .projectId(p.getProjectId())
                        .projectNm(p.getProjectNm())
                        .description(p.getDescription())
                        .build())
                .collect(Collectors.toList());

        return LoginResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .userId(user.getUserId())
                .userNm(user.getUserNm())
                .roles(roleIds)
                .menus(menuTree)
                .projects(projects)
                .build();
    }

    private List<LoginResponse.MenuDto> buildMenuTree(List<MenuDef> menus) {
        Map<String, LoginResponse.MenuDto> dtoMap = menus.stream()
                .collect(Collectors.toMap(
                        MenuDef::getMenuId,
                        m -> LoginResponse.MenuDto.builder()
                                .menuId(m.getMenuId())
                                .parentId(m.getParentId())
                                .menuNm(m.getMenuNm())
                                .menuUrl(m.getMenuUrl())
                                .menuIcon(m.getMenuIcon())
                                .sortOrder(m.getSortOrder())
                                .children(new ArrayList<>())
                                .build()
                ));

        List<LoginResponse.MenuDto> roots = new ArrayList<>();
        dtoMap.values().forEach(dto -> {
            if (dto.getParentId() == null) {
                roots.add(dto);
            } else {
                LoginResponse.MenuDto parent = dtoMap.get(dto.getParentId());
                if (parent != null) parent.getChildren().add(dto);
            }
        });
        roots.sort((a, b) -> a.getSortOrder() - b.getSortOrder());
        return roots;
    }
}
