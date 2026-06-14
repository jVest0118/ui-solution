package com.uisolution.platform.admin.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "project")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Project {

    @Id
    @Column(name = "project_id", length = 50)
    private String projectId;

    @Column(name = "project_nm", nullable = false, length = 100)
    private String projectNm;

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "use_yn", length = 1)
    private String useYn = "Y";

    @Column(name = "sort_order")
    private int sortOrder = 0;

    @Column(name = "created_by", length = 50)
    private String createdBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public void update(String projectNm, String description, String useYn, int sortOrder) {
        this.projectNm = projectNm;
        this.description = description;
        this.useYn = useYn;
        this.sortOrder = sortOrder;
    }
}
