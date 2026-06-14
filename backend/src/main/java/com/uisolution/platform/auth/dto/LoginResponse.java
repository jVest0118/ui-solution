package com.uisolution.platform.auth.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class LoginResponse {
    private String accessToken;
    private String refreshToken;
    private String userId;
    private String userNm;
    private List<String> roles;
    private List<MenuDto> menus;
    private List<ProjectDto> projects;

    @Getter
    @Builder
    public static class MenuDto {
        private String menuId;
        private String parentId;
        private String menuNm;
        private String menuUrl;
        private String menuIcon;
        private int sortOrder;
        private List<MenuDto> children;
    }

    @Getter
    @Builder
    public static class ProjectDto {
        private String projectId;
        private String projectNm;
        private String description;
    }
}
