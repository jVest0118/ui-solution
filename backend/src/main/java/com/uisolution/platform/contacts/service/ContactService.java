package com.uisolution.platform.contacts.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.uisolution.platform.contacts.entity.Contact;
import com.uisolution.platform.contacts.entity.ContactGroup;
import com.uisolution.platform.contacts.repository.ContactGroupRepository;
import com.uisolution.platform.contacts.repository.ContactRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ContactService {

    private final ContactRepository contactRepo;
    private final ContactGroupRepository groupRepo;
    private final ObjectMapper objectMapper;

    /* ── 연락처 목록 ────────────────────────────────────────── */

    public List<Map<String, Object>> list(String ownerId, String q, String group) {
        return contactRepo.findByOwnerIdOrderByLastNameAscFirstNameAsc(ownerId)
                .stream()
                .filter(c -> {
                    if (q == null || q.isBlank()) return true;
                    String keyword = q.toLowerCase();
                    return contains(c.getLastName(), keyword)
                            || contains(c.getFirstName(), keyword)
                            || contains(c.getNickname(), keyword)
                            || contains(c.getCompany(), keyword)
                            || contains(c.getEmails(), keyword);
                })
                .filter(c -> {
                    if (group == null || group.isBlank()) return true;
                    if (c.getCgroups() == null) return false;
                    return c.getCgroups().contains("\"" + group + "\"");
                })
                .map(this::toMap)
                .collect(Collectors.toList());
    }

    /* ── 단건 조회 ──────────────────────────────────────────── */

    public Map<String, Object> get(Long id, String ownerId) {
        Contact c = contactRepo.findById(id)
                .filter(x -> x.getOwnerId().equals(ownerId))
                .orElseThrow(() -> new IllegalArgumentException("연락처를 찾을 수 없습니다."));
        return toMap(c);
    }

    /* ── 저장 (신규 / 수정) ─────────────────────────────────── */

    @Transactional
    public Map<String, Object> save(Map<String, Object> req, String ownerId) {
        Long id          = req.get("id") != null ? ((Number) req.get("id")).longValue() : null;
        String lastName  = str(req, "lastName");
        String firstName = str(req, "firstName");
        String nickname  = str(req, "nickname");
        String company   = str(req, "company");
        String dept      = str(req, "department");
        String pos       = str(req, "position");
        boolean fav      = Boolean.TRUE.equals(req.get("favorite"));

        String emailsJson  = toJson(req.get("emails"));
        String phonesJson  = toJson(req.get("phones"));
        String cgroupsJson = toJson(req.get("cgroups"));

        // 그룹 자동 등록
        List<?> cgroupList = req.get("cgroups") instanceof List ? (List<?>) req.get("cgroups") : List.of();
        for (Object g : cgroupList) {
            String gName = g.toString();
            if (!groupRepo.existsByOwnerIdAndGroupName(ownerId, gName)) {
                groupRepo.save(ContactGroup.builder().ownerId(ownerId).groupName(gName).build());
            }
        }

        Contact contact;
        if (id != null) {
            contact = contactRepo.findById(id)
                    .filter(x -> x.getOwnerId().equals(ownerId))
                    .orElseThrow(() -> new IllegalArgumentException("연락처를 찾을 수 없습니다."));
            contact.update(lastName, firstName, nickname, company, dept, pos,
                    emailsJson, phonesJson, cgroupsJson, fav);
        } else {
            contact = contactRepo.save(Contact.builder()
                    .ownerId(ownerId)
                    .lastName(lastName).firstName(firstName).nickname(nickname)
                    .company(company).department(dept).position(pos)
                    .emails(emailsJson).phones(phonesJson).cgroups(cgroupsJson)
                    .favorite(fav)
                    .build());
        }
        return toMap(contact);
    }

    /* ── 삭제 ────────────────────────────────────────────────── */

    @Transactional
    public void delete(Long id, String ownerId) {
        contactRepo.findById(id)
                .filter(c -> c.getOwnerId().equals(ownerId))
                .ifPresent(contactRepo::delete);
    }

    @Transactional
    public void deleteBatch(List<Long> ids, String ownerId) {
        ids.forEach(id -> delete(id, ownerId));
    }

    /* ── 즐겨찾기 토글 ─────────────────────────────────────── */

    @Transactional
    public Map<String, Object> toggleFavorite(Long id, String ownerId) {
        Contact c = contactRepo.findById(id)
                .filter(x -> x.getOwnerId().equals(ownerId))
                .orElseThrow(() -> new IllegalArgumentException("연락처를 찾을 수 없습니다."));
        c.toggleFavorite();
        return Map.of("favorite", c.isFavorite());
    }

    /* ── 그룹 관리 ───────────────────────────────────────────── */

    public List<String> listGroups(String ownerId) {
        return groupRepo.findByOwnerIdOrderByGroupNameAsc(ownerId)
                .stream().map(ContactGroup::getGroupName).collect(Collectors.toList());
    }

    @Transactional
    public String addGroup(String ownerId, String groupName) {
        if (!groupRepo.existsByOwnerIdAndGroupName(ownerId, groupName)) {
            groupRepo.save(ContactGroup.builder().ownerId(ownerId).groupName(groupName).build());
        }
        return groupName;
    }

    @Transactional
    public void deleteGroup(String ownerId, String groupName) {
        groupRepo.findByOwnerIdAndGroupName(ownerId, groupName).ifPresent(groupRepo::delete);
    }

    /* ── 내부 유틸 ───────────────────────────────────────────── */

    private Map<String, Object> toMap(Contact c) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",         c.getId());
        m.put("lastName",   c.getLastName());
        m.put("firstName",  c.getFirstName());
        m.put("nickname",   c.getNickname());
        m.put("company",    c.getCompany());
        m.put("department", c.getDepartment());
        m.put("position",   c.getPosition());
        m.put("emails",     parseJson(c.getEmails()));
        m.put("phones",     parseJson(c.getPhones()));
        m.put("cgroups",    parseJson(c.getCgroups()));
        m.put("favorite",   c.isFavorite());
        m.put("createdAt",  c.getCreatedAt() != null ? c.getCreatedAt().toString() : null);
        return m;
    }

    private Object parseJson(String json) {
        if (json == null || json.isBlank()) return List.of();
        try { return objectMapper.readValue(json, Object.class); } catch (Exception e) { return List.of(); }
    }

    private String toJson(Object obj) {
        if (obj == null) return "[]";
        try { return objectMapper.writeValueAsString(obj); } catch (Exception e) { return "[]"; }
    }

    private String str(Map<String, Object> m, String key) {
        Object v = m.get(key);
        return v != null ? v.toString().trim() : null;
    }

    private boolean contains(String field, String keyword) {
        return field != null && field.toLowerCase().contains(keyword);
    }
}
