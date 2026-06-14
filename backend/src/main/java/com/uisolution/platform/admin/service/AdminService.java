package com.uisolution.platform.admin.service;

import com.uisolution.platform.admin.entity.*;
import com.uisolution.platform.admin.repository.*;
import lombok.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminService {

    private final UserRepository userRepository;
    private final com.uisolution.platform.admin.repository.RoleRepository roleRepository;
    private final MenuRepository menuRepository;
    private final CodeGroupRepository codeGroupRepository;
    private final CodeDetailRepository codeDetailRepository;
    private final PasswordEncoder passwordEncoder;

    // ─── Users ───────────────────────────────────────────────
    public List<Map<String, Object>> getUsers() {
        return userRepository.findAll().stream().map(u -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("userId",   u.getUserId());
            m.put("userNm",   u.getUserNm());
            m.put("email",    u.getEmail());
            m.put("deptNm",   u.getDeptNm());
            m.put("useYn",    u.getUseYn());
            m.put("lastLoginDt", u.getLastLoginDt());
            m.put("roles", u.getRoles().stream().map(RoleDef::getRoleId).collect(Collectors.toList()));
            return m;
        }).collect(Collectors.toList());
    }

    @Transactional
    public Map<String, Object> saveUser(Map<String, Object> req, String currentUserId) {
        String userId = (String) req.get("userId");
        String rawPassword = (String) req.get("password");
        String userNm = (String) req.get("userNm");
        String email = (String) req.get("email");
        String deptNm = (String) req.get("deptNm");
        String useYn = (String) req.getOrDefault("useYn", "Y");

        if (userRepository.existsById(userId)) {
            // update
            if (rawPassword != null && !rawPassword.isBlank()) {
                userRepository.updatePassword(userId, passwordEncoder.encode(rawPassword));
            }
            // partial update via native query for other fields
            userRepository.updateInfo(userId, userNm, email, deptNm, useYn);
        } else {
            String encoded = rawPassword != null && !rawPassword.isBlank()
                    ? passwordEncoder.encode(rawPassword) : passwordEncoder.encode("Change1234!");
            UserInfo user = UserInfo.builder()
                    .userId(userId).userNm(userNm).password(encoded)
                    .email(email).deptNm(deptNm).useYn(useYn)
                    .build();
            userRepository.save(user);
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("userId", userId);
        return result;
    }

    // ─── Roles ───────────────────────────────────────────────
    public List<Map<String, Object>> getRoles() {
        return roleRepository.findAll().stream().map(r -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("roleId",    r.getRoleId());
            m.put("roleNm",    r.getRoleNm());
            m.put("roleDesc",  r.getRoleDesc());
            m.put("roleLevel", r.getRoleLevel());
            m.put("useYn",     r.getUseYn());
            return m;
        }).collect(Collectors.toList());
    }

    @Transactional
    public Map<String, Object> saveRole(Map<String, Object> req) {
        String roleId = (String) req.get("roleId");
        String roleNm = (String) req.get("roleNm");
        String roleDesc = (String) req.get("roleDesc");
        int roleLevel = req.containsKey("roleLevel") ? ((Number) req.get("roleLevel")).intValue() : 10;
        String useYn = (String) req.getOrDefault("useYn", "Y");

        RoleDef role = roleRepository.findById(roleId)
                .map(r -> { r.update(roleNm, roleDesc, roleLevel, useYn); return r; })
                .orElseGet(() -> roleRepository.save(RoleDef.builder()
                        .roleId(roleId).roleNm(roleNm).roleDesc(roleDesc)
                        .roleLevel(roleLevel).useYn(useYn).build()));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("roleId", role.getRoleId());
        return result;
    }

    // ─── Menus ───────────────────────────────────────────────
    public List<Map<String, Object>> getMenus() {
        return menuRepository.findAll().stream().map(m -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("menuId",    m.getMenuId());
            map.put("parentId",  m.getParentId());
            map.put("menuNm",    m.getMenuNm());
            map.put("menuUrl",   m.getMenuUrl());
            map.put("menuIcon",  m.getMenuIcon());
            map.put("sortOrder", m.getSortOrder());
            map.put("useYn",     m.getUseYn());
            map.put("projectId", m.getProjectId());
            return map;
        }).collect(Collectors.toList());
    }

    @Transactional
    public Map<String, Object> saveMenu(Map<String, Object> req) {
        String menuId   = (String) req.get("menuId");
        String parentId = (String) req.get("parentId");
        String menuNm   = (String) req.get("menuNm");
        String menuUrl  = (String) req.get("menuUrl");
        String menuIcon = (String) req.get("menuIcon");
        int sortOrder   = req.containsKey("sortOrder") ? ((Number) req.get("sortOrder")).intValue() : 0;
        String useYn    = (String) req.getOrDefault("useYn", "Y");
        String projectId = (String) req.get("projectId");

        if (menuRepository.existsById(menuId)) {
            menuRepository.updateMenu(menuId, parentId, menuNm, menuUrl, menuIcon, sortOrder, useYn, projectId);
        } else {
            MenuDef menu = MenuDef.builder()
                    .menuId(menuId).parentId(parentId).menuNm(menuNm)
                    .menuUrl(menuUrl).menuIcon(menuIcon).sortOrder(sortOrder)
                    .useYn(useYn).projectId(projectId).build();
            menuRepository.save(menu);
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("menuId", menuId);
        return result;
    }

    // ─── Codes ───────────────────────────────────────────────
    public List<Map<String, Object>> getCodeGroups(String projectId) {
        List<CodeGroup> groups = projectId != null
                ? codeGroupRepository.findByProjectIdIsNullOrProjectIdOrderByGroupCdAsc(projectId)
                : codeGroupRepository.findAll();
        return groups.stream().map(g -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("groupCd",     g.getGroupCd());
            m.put("groupNm",     g.getGroupNm());
            m.put("description", g.getDescription());
            m.put("useYn",       g.getUseYn());
            m.put("projectId",   g.getProjectId());
            return m;
        }).collect(Collectors.toList());
    }

    @Transactional
    public Map<String, Object> saveCodeGroup(Map<String, Object> req) {
        String groupCd = (String) req.get("groupCd");
        String groupNm = (String) req.get("groupNm");
        String description = (String) req.get("description");
        String useYn = (String) req.getOrDefault("useYn", "Y");
        String projectId = (String) req.get("projectId");

        codeGroupRepository.findById(groupCd)
                .map(g -> { g.update(groupNm, description, useYn); return g; })
                .orElseGet(() -> codeGroupRepository.save(CodeGroup.builder()
                        .groupCd(groupCd).groupNm(groupNm).description(description)
                        .useYn(useYn).projectId(projectId).build()));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("groupCd", groupCd);
        return result;
    }

    public List<Map<String, Object>> getCodeDetails(String groupCd) {
        return codeDetailRepository.findByGroupCdOrderBySortOrderAsc(groupCd).stream().map(d -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("groupCd",   d.getGroupCd());
            m.put("codeVal",   d.getCodeVal());
            m.put("codeNm",    d.getCodeNm());
            m.put("sortOrder", d.getSortOrder());
            m.put("extra1",    d.getExtra1());
            m.put("extra2",    d.getExtra2());
            m.put("useYn",     d.getUseYn());
            return m;
        }).collect(Collectors.toList());
    }

    @Transactional
    public Map<String, Object> saveCodeDetail(String groupCd, Map<String, Object> req) {
        String codeVal = (String) req.get("codeVal");
        String codeNm  = (String) req.get("codeNm");
        int sortOrder  = req.containsKey("sortOrder") ? ((Number) req.get("sortOrder")).intValue() : 0;
        String useYn   = (String) req.getOrDefault("useYn", "Y");

        CodeDetailId id = new CodeDetailId(groupCd, codeVal);
        codeDetailRepository.findById(id)
                .map(d -> { d.update(codeNm, sortOrder, useYn); return d; })
                .orElseGet(() -> codeDetailRepository.save(CodeDetail.builder()
                        .groupCd(groupCd).codeVal(codeVal).codeNm(codeNm)
                        .sortOrder(sortOrder).useYn(useYn).build()));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("groupCd", groupCd);
        result.put("codeVal", codeVal);
        return result;
    }
}
