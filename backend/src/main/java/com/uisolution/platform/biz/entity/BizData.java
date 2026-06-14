package com.uisolution.platform.biz.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "biz_data")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class BizData {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "data_id")
    private Long dataId;

    @Column(name = "screen_id", nullable = false, length = 50)
    private String screenId;

    @Column(name = "project_id", length = 50)
    private String projectId;

    @Column(name = "data_json", nullable = false, columnDefinition = "CLOB")
    private String dataJson;

    @Column(name = "status_cd", length = 20)
    private String statusCd = "ACTIVE";

    @Column(name = "created_by", length = 50)
    private String createdBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_by", length = 50)
    private String updatedBy;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public void update(String dataJson, String updatedBy) {
        this.dataJson = dataJson;
        this.updatedBy = updatedBy;
    }

    public void delete(String deletedBy) {
        this.statusCd = "DELETED";
        this.updatedBy = deletedBy;
    }
}
