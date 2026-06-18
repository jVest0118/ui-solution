package com.uisolution.platform.admin.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "site_role")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class SiteRole {

    @EmbeddedId
    private SiteRoleId id;

    @Column(name = "role_nm", nullable = false, length = 100)
    private String roleNm;

    @Column(name = "role_desc", length = 500)
    private String roleDesc;

    @Column(name = "sort_order")
    private int sortOrder = 0;

    @Column(name = "use_yn", length = 1)
    private String useYn = "Y";

    @Column(name = "created_by", length = 50)
    private String createdBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public void update(String roleNm, String roleDesc, int sortOrder, String useYn) {
        this.roleNm = roleNm;
        this.roleDesc = roleDesc;
        this.sortOrder = sortOrder;
        this.useYn = useYn;
    }
}
