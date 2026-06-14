package com.uisolution.platform.schema.entity;

import com.uisolution.platform.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

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

    @OneToMany(mappedBy = "screenDef", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    @Builder.Default
    private List<FieldDef> fields = new ArrayList<>();

    public void update(String screenNm, String screenType, String description,
                       String apiResource, String layoutConfig, String buttonConfig) {
        this.screenNm = screenNm;
        this.screenType = screenType;
        this.description = description;
        this.apiResource = apiResource;
        this.layoutConfig = layoutConfig;
        this.buttonConfig = buttonConfig;
        this.version++;
    }
}
