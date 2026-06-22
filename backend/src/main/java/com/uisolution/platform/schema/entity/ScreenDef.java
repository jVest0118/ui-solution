package com.uisolution.platform.schema.entity;

import com.uisolution.platform.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "screen_def")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class ScreenDef extends BaseEntity {

    @Id
    @Column(name = "screen_id", length = 50)
    private String screenId;

    @Column(name = "screen_nm", nullable = false, length = 200)
    private String screenNm;

    @Column(name = "screen_type", nullable = false, length = 30)
    private String screenType;

    @Column(name = "description", length = 1000)
    private String description;

    @Column(name = "api_resource", length = 200)
    private String apiResource;

    @Column(name = "layout_config", columnDefinition = "TEXT")
    private String layoutConfig;

    @Column(name = "button_config", columnDefinition = "TEXT")
    private String buttonConfig;

    @Column(name = "version")
    private int version = 1;

    @Column(name = "use_yn", length = 1)
    private String useYn = "Y";

    @Column(name = "project_id", length = 50)
    private String projectId;

    // 화면 열기 방식: page(일반), tab(탭), popup(팝업)
    @Column(name = "open_type", length = 20)
    private String openType = "page";

    // 협업 편집 상태: COMMITTED(자유편집), DONE(커밋 대기/뷰전용), EDITING(작업중/잠금)
    @Column(name = "edit_status", length = 20)
    private String editStatus = "DONE";

    @Column(name = "last_editor", length = 100)
    private String lastEditor;

    @Column(name = "locked_by", length = 100)
    private String lockedBy;

    @Column(name = "locked_at")
    private LocalDateTime lockedAt;

    // 테이블 매핑: biz_data(기본) 또는 table(실제 테이블 직접 매핑)
    @Column(name = "datasource_type", length = 20)
    private String datasourceType = "biz_data";

    @Column(name = "table_nm", length = 200)
    private String tableNm;

    @Column(name = "pk_column", length = 100)
    private String pkColumn = "id";

    @Column(name = "db_conn_id", length = 50)
    private String dbConnId;

    @Column(name = "screen_group", length = 200)
    private String screenGroup;

    @OneToMany(mappedBy = "screenDef", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    @Builder.Default
    private List<FieldDef> fields = new ArrayList<>();

    public void update(String screenNm, String screenType, String description,
                       String apiResource, String layoutConfig, String buttonConfig, String openType,
                       String datasourceType, String tableNm, String pkColumn, String dbConnId) {
        this.screenNm = screenNm;
        this.screenType = screenType;
        this.description = description;
        this.apiResource = apiResource;
        this.layoutConfig = layoutConfig;
        this.buttonConfig = buttonConfig;
        this.openType = openType != null ? openType : "page";
        this.datasourceType = datasourceType != null ? datasourceType : "biz_data";
        this.tableNm = tableNm;
        this.pkColumn = pkColumn != null ? pkColumn : "id";
        this.dbConnId = dbConnId;
        this.version++;
    }

    public void lock(String userId) {
        this.editStatus = "EDITING";
        this.lockedBy   = userId;
        this.lockedAt   = LocalDateTime.now();
        this.lastEditor = userId;
    }

    public void unlock(String userId) {
        this.editStatus = "DONE";
        this.lastEditor = userId;
        this.lockedBy   = null;
        this.lockedAt   = null;
    }

    public void markCommitted() {
        this.editStatus = "COMMITTED";
        this.lockedBy   = null;
        this.lockedAt   = null;
    }

    public void updateGroup(String screenGroup) {
        this.screenGroup = screenGroup;
    }
}
