package com.uisolution.platform.schema.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "screen_data_source")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class ScreenDataSource {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "screen_id", nullable = false, length = 50)
    private String screenId;

    /** 화면 내 식별명 (필드 바인딩 시 참조 키) */
    @Column(name = "source_nm", nullable = false, length = 100)
    private String sourceNm;

    /** SQL | PROCEDURE (현재는 SQL만 지원) */
    @Column(name = "source_type", nullable = false, length = 20)
    @Builder.Default
    private String sourceType = "SQL";

    /** 사용할 DB 연결 ID — null 이면 시스템 DB */
    @Column(name = "conn_id", length = 50)
    private String connId;

    /** :paramName 방식의 named parameter SQL */
    @Column(name = "sql_text", columnDefinition = "TEXT")
    private String sqlText;

    /**
     * 파라미터 정의 JSON 배열.
     * [{name, source(session|input|static), sourceKey, defaultValue, label}, ...]
     */
    @Column(name = "params_def", columnDefinition = "TEXT")
    private String paramsDef;

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "sort_order")
    @Builder.Default
    private int sortOrder = 0;

    @Column(name = "created_at", updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    public void update(String sourceNm, String sourceType, String connId,
                       String sqlText, String paramsDef, String description, int sortOrder) {
        this.sourceNm    = sourceNm;
        this.sourceType  = sourceType != null ? sourceType : "SQL";
        this.connId      = connId;
        this.sqlText     = sqlText;
        this.paramsDef   = paramsDef;
        this.description = description;
        this.sortOrder   = sortOrder;
        this.updatedAt   = LocalDateTime.now();
    }
}
