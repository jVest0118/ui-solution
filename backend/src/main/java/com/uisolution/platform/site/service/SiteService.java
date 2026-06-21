package com.uisolution.platform.site.service;

import com.uisolution.platform.admin.entity.RoleDef;
import com.uisolution.platform.admin.entity.SiteRoleScreen;
import com.uisolution.platform.admin.entity.SiteUserRole;
import com.uisolution.platform.admin.repository.SiteRoleScreenRepository;
import com.uisolution.platform.admin.repository.SiteUserRoleRepository;
import com.uisolution.platform.admin.repository.UserRepository;
import com.uisolution.platform.schema.repository.ScreenDefRepository;
import com.uisolution.platform.site.entity.SiteConfig;
import com.uisolution.platform.site.entity.SiteMenu;
import com.uisolution.platform.site.repository.SiteConfigRepository;
import com.uisolution.platform.site.repository.SiteMenuRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SiteService {

    private final SiteMenuRepository siteMenuRepository;
    private final SiteConfigRepository siteConfigRepository;
    private final UserRepository userRepository;
    private final SiteUserRoleRepository siteUserRoleRepository;
    private final SiteRoleScreenRepository siteRoleScreenRepository;
    private final ScreenDefRepository screenDefRepository;

    private static final List<String> PRIVILEGED_ROLES = List.of("SYSTEM_ADMIN", "SCREEN_ADMIN", "DEVELOPER");

    public List<Map<String, Object>> getMenus(String projectId) {
        return siteMenuRepository
                .findByProjectIdAndUseYnOrderBySortOrderAsc(projectId, "Y")
                .stream()
                .map(this::menuToMap)
                .toList();
    }

    public Map<String, Object> getConfig(String projectId) {
        return siteConfigRepository.findById(projectId)
                .map(this::configToMap)
                .orElse(Map.of("projectId", projectId, "siteNm", "내 사이트", "navStyle", "top-side"));
    }

    @Transactional
    public Map<String, Object> saveMenu(Map<String, Object> req) {
        String menuId = (String) req.getOrDefault("menuId", "SMNU_" + System.currentTimeMillis());
        String projectId = (String) req.get("projectId");
        String menuNm = (String) req.get("menuNm");
        String parentId = (String) req.get("parentId");
        String screenId = (String) req.get("screenId");
        String menuUrl = (String) req.get("menuUrl");
        String icon = (String) req.get("icon");
        int sortOrder = req.get("sortOrder") != null ? ((Number) req.get("sortOrder")).intValue() : 0;

        SiteMenu menu = siteMenuRepository.findById(menuId)
                .map(m -> { m.update(menuNm, parentId, screenId, menuUrl, icon, sortOrder); return m; })
                .orElseGet(() -> siteMenuRepository.save(SiteMenu.builder()
                        .menuId(menuId).projectId(projectId).parentId(parentId)
                        .menuNm(menuNm).screenId(screenId).menuUrl(menuUrl)
                        .icon(icon).sortOrder(sortOrder).useYn("Y")
                        .build()));
        return menuToMap(menu);
    }

    @Transactional
    public void deleteMenu(String menuId) {
        // 하위 메뉴도 함께 삭제
        SiteMenu menu = siteMenuRepository.findById(menuId)
                .orElseThrow(() -> new IllegalArgumentException("메뉴를 찾을 수 없습니다: " + menuId));
        List<SiteMenu> children = siteMenuRepository
                .findByProjectIdAndUseYnOrderBySortOrderAsc(menu.getProjectId(), "Y")
                .stream().filter(m -> menuId.equals(m.getParentId())).toList();
        siteMenuRepository.deleteAll(children);
        siteMenuRepository.delete(menu);
    }

    @Transactional
    public void saveMenuOrder(List<Map<String, Object>> items) {
        for (int i = 0; i < items.size(); i++) {
            String menuId = (String) items.get(i).get("menuId");
            String parentId = (String) items.get(i).get("parentId");
            int finalI = i;
            siteMenuRepository.findById(menuId).ifPresent(m -> m.update(
                    m.getMenuNm(), parentId, m.getScreenId(), m.getMenuUrl(), m.getIcon(), finalI
            ));
        }
    }

    @Transactional
    public Map<String, Object> saveConfig(Map<String, Object> req) {
        String projectId = (String) req.get("projectId");
        String siteNm = (String) req.getOrDefault("siteNm", "내 사이트");
        String navStyle = (String) req.getOrDefault("navStyle", "top-side");

        SiteConfig config = siteConfigRepository.findById(projectId)
                .map(c -> { c.update(siteNm, navStyle); return c; })
                .orElseGet(() -> siteConfigRepository.save(SiteConfig.builder()
                        .projectId(projectId).siteNm(siteNm).navStyle(navStyle)
                        .build()));
        return configToMap(config);
    }

    public Map<String, Object> getMyPermissions(String userId, String projectId) {
        Set<String> platformRoles = userRepository.findActiveUserWithRoles(userId)
                .map(u -> u.getRoles().stream().map(RoleDef::getRoleId).collect(Collectors.toSet()))
                .orElse(Set.of());

        boolean isPrivileged = platformRoles.stream().anyMatch(PRIVILEGED_ROLES::contains);

        List<Map<String, Object>> screens;
        if (isPrivileged) {
            screens = screenDefRepository.findByProjectIdOrderByScreenNmAsc(projectId).stream()
                    .map(s -> {
                        Map<String, Object> m = new LinkedHashMap<>();
                        m.put("screenId", s.getScreenId());
                        m.put("canRead",   "Y");
                        m.put("canCreate", "Y");
                        m.put("canUpdate", "Y");
                        m.put("canDelete", "Y");
                        m.put("canExcel",  "Y");
                        return m;
                    }).collect(Collectors.toList());
        } else {
            List<SiteUserRole> userSiteRoles = siteUserRoleRepository.findByProjectIdAndUserId(projectId, userId);
            Set<String> roleIds = userSiteRoles.stream()
                    .map(r -> r.getId().getRoleId()).collect(Collectors.toSet());

            // 여러 역할의 권한을 OR로 병합
            Map<String, Map<String, String>> permMap = new LinkedHashMap<>();
            for (String roleId : roleIds) {
                for (SiteRoleScreen srs : siteRoleScreenRepository.findByIdProjectIdAndIdRoleId(projectId, roleId)) {
                    String screenId = srs.getId().getScreenId();
                    permMap.compute(screenId, (k, existing) -> {
                        Map<String, String> base = existing != null ? existing
                                : Map.of("canRead","N","canCreate","N","canUpdate","N","canDelete","N","canExcel","N");
                        Map<String, String> merged = new LinkedHashMap<>(base);
                        if ("Y".equals(srs.getCanRead()))   merged.put("canRead",   "Y");
                        if ("Y".equals(srs.getCanCreate())) merged.put("canCreate", "Y");
                        if ("Y".equals(srs.getCanUpdate())) merged.put("canUpdate", "Y");
                        if ("Y".equals(srs.getCanDelete())) merged.put("canDelete", "Y");
                        if ("Y".equals(srs.getCanExcel()))  merged.put("canExcel",  "Y");
                        return merged;
                    });
                }
            }
            screens = permMap.entrySet().stream().map(e -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("screenId", e.getKey());
                m.putAll(e.getValue());
                return m;
            }).collect(Collectors.toList());
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("isPrivileged", isPrivileged);
        result.put("screens", screens);
        return result;
    }

    private Map<String, Object> menuToMap(SiteMenu m) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("menuId", m.getMenuId());
        map.put("projectId", m.getProjectId());
        map.put("parentId", m.getParentId());
        map.put("menuNm", m.getMenuNm());
        map.put("screenId", m.getScreenId());
        map.put("menuUrl", m.getMenuUrl());
        map.put("icon", m.getIcon());
        map.put("sortOrder", m.getSortOrder());
        return map;
    }

    private Map<String, Object> configToMap(SiteConfig c) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("projectId", c.getProjectId());
        map.put("siteNm", c.getSiteNm());
        map.put("navStyle", c.getNavStyle());
        return map;
    }
}
