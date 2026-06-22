package com.uisolution.platform.admin.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "page_def")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class PageDef {

    @Id
    @Column(name = "page_id", length = 50)
    private String pageId;

    @Column(name = "page_nm", nullable = false, length = 200)
    private String pageNm;

    @Column(name = "description", length = 1000)
    private String description;

    @Column(name = "layout_json", columnDefinition = "TEXT")
    private String layoutJson;

    @Column(name = "project_id", length = 50)
    @Builder.Default
    private String projectId = "DEFAULT";

    @Column(name = "use_yn", length = 1)
    @Builder.Default
    private String useYn = "Y";

    @Column(name = "created_by", length = 50)
    private String createdBy;

    @Column(name = "created_at", updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    public void update(String pageNm, String description, String layoutJson, String projectId) {
        this.pageNm      = pageNm;
        this.description = description;
        this.layoutJson  = layoutJson;
        if (projectId != null && !projectId.isBlank()) this.projectId = projectId;
        this.updatedAt   = LocalDateTime.now();
    }
}
