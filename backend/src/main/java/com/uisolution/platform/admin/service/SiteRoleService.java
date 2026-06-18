package com.uisolution.platform.admin.service;

import com.uisolution.platform.admin.entity.*;
import com.uisolution.platform.admin.repository.*;
import com.uisolution.platform.schema.repository.ScreenDefRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SiteRoleService {

    private final SiteRoleRepository siteRoleRepository;
    private final SiteUserRoleRepository siteUserRoleRepository;
    private final SiteRoleScreenRepository siteRoleScreenRepository;
    private final UserRepository userRepository;
    private final ScreenDefRepository screenDefRepository;

    // ─── 역할 목록 ────────────────────────────────────────────
    public List<Map<String, Object>> getRoles(String projectId) {
        return siteRoleRepository.findByIdProjectIdOrderBySortOrderAsc(projectId).stream()
                .map(r -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("roleId",    r.getId().getRoleId());
                    m.put("projectId", r.getId().getProjectId());
                    m.put("roleNm",    r.getRoleNm());
                    m.put("roleDesc",  r.getRoleDesc());
                    m.put("sortOrder", r.getSortOrder());
                    m.put("useYn",     r.getUseYn());
                    return m;
                }).collect(Collectors.toList());
    }

    // ─── 역할 저장 (등록/수정) ────────────────────────────────
    @Transactional
    public Map<String, Object> saveRole(String projectId, Map<String, Object> req, String currentUserId) {
        String roleId    = (String) req.get("roleId");
        String roleNm    = (String) req.get("roleNm");
        String roleDesc  = (String) req.get("roleDesc");
        int sortOrder    = req.containsKey("sortOrder") ? ((Number) req.get("sortOrder")).intValue() : 0;
        String useYn     = (String) req.getOrDefault("useYn", "Y");

        SiteRoleId id = new SiteRoleId(roleId, projectId);
        siteRoleRepository.findById(id)
                .map(r -> { r.update(roleNm, roleDesc, sortOrder, useYn); return r; })
                .orElseGet(() -> siteRoleRepository.save(SiteRole.builder()
                        .id(id).roleNm(roleNm).roleDesc(roleDesc)
                        .sortOrder(sortOrder).useYn(useYn).createdBy(currentUserId).build()));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("roleId",    roleId);
        result.put("projectId", projectId);
        return result;
    }

    // ─── 역할 삭제 ────────────────────────────────────────────
    @Transactional
    public void deleteRole(String projectId, String roleId) {
        siteRoleScreenRepository.deleteByIdProjectIdAndIdRoleId(projectId, roleId);
        siteUserRoleRepository.deleteByIdProjectIdAndIdRoleId(projectId, roleId);
        siteRoleRepository.deleteById(new SiteRoleId(roleId, projectId));
    }

    // ─── 역할의 사용자 목록 ───────────────────────────────────
    public List<Map<String, Object>> getRoleUsers(String projectId, String roleId) {
        List<SiteUserRole> mappings = siteUserRoleRepository.findByIdProjectIdAndIdRoleId(projectId, roleId);
        return mappings.stream().map(sur -> {
            String userId = sur.getId().getUserId();
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("userId",    userId);
            m.put("grantedAt", sur.getGrantedAt());
            m.put("grantedBy", sur.getGrantedBy());
            userRepository.findById(userId).ifPresent(u -> {
                m.put("userNm", u.getUserNm());
                m.put("email",  u.getEmail());
            });
            return m;
        }).collect(Collectors.toList());
    }

    // ─── 역할에 사용자 부여 ───────────────────────────────────
    @Transactional
    public void grantUser(String projectId, String roleId, String userId, String currentUserId) {
        SiteUserRoleId id = new SiteUserRoleId(userId, roleId, projectId);
        if (!siteUserRoleRepository.existsById(id)) {
            siteUserRoleRepository.save(SiteUserRole.builder()
                    .id(id).grantedBy(currentUserId).build());
        }
    }

    // ─── 역할에서 사용자 제거 ─────────────────────────────────
    @Transactional
    public void revokeUser(String projectId, String roleId, String userId) {
        siteUserRoleRepository.deleteById(new SiteUserRoleId(userId, roleId, projectId));
    }

    // ─── 역할의 화면 권한 목록 ───────────────────────────────
    public List<Map<String, Object>> getRoleScreens(String projectId, String roleId) {
        return siteRoleScreenRepository.findByIdProjectIdAndIdRoleId(projectId, roleId).stream()
                .map(srs -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("screenId",  srs.getId().getScreenId());
                    m.put("canRead",   srs.getCanRead());
                    m.put("canCreate", srs.getCanCreate());
                    m.put("canUpdate", srs.getCanUpdate());
                    m.put("canDelete", srs.getCanDelete());
                    m.put("canExcel",  srs.getCanExcel());
                    screenDefRepository.findById(srs.getId().getScreenId()).ifPresent(s ->
                            m.put("screenNm", s.getScreenNm()));
                    return m;
                }).collect(Collectors.toList());
    }

    // ─── 역할 화면 권한 저장 ─────────────────────────────────
    @Transactional
    public void saveRoleScreen(String projectId, String roleId, Map<String, Object> req) {
        String screenId = (String) req.get("screenId");
        String canRead   = (String) req.getOrDefault("canRead",   "Y");
        String canCreate = (String) req.getOrDefault("canCreate", "N");
        String canUpdate = (String) req.getOrDefault("canUpdate", "N");
        String canDelete = (String) req.getOrDefault("canDelete", "N");
        String canExcel  = (String) req.getOrDefault("canExcel",  "N");

        SiteRoleScreenId id = new SiteRoleScreenId(roleId, projectId, screenId);
        siteRoleScreenRepository.findById(id)
                .map(srs -> { srs.update(canRead, canCreate, canUpdate, canDelete, canExcel); return srs; })
                .orElseGet(() -> siteRoleScreenRepository.save(SiteRoleScreen.builder()
                        .id(id).canRead(canRead).canCreate(canCreate).canUpdate(canUpdate)
                        .canDelete(canDelete).canExcel(canExcel).build()));
    }

    // ─── 역할 화면 권한 삭제 ─────────────────────────────────
    @Transactional
    public void deleteRoleScreen(String projectId, String roleId, String screenId) {
        siteRoleScreenRepository.deleteById(new SiteRoleScreenId(roleId, projectId, screenId));
    }

    // ─── 프로젝트의 모든 화면 목록 (권한 설정용) ─────────────
    public List<Map<String, Object>> getProjectScreens(String projectId) {
        return screenDefRepository.findByProjectIdOrderByScreenNmAsc(projectId).stream()
                .map(s -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("screenId",   s.getScreenId());
                    m.put("screenNm",   s.getScreenNm());
                    m.put("screenType", s.getScreenType());
                    return m;
                }).collect(Collectors.toList());
    }
}
