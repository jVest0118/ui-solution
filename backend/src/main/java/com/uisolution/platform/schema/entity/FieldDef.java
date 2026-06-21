package com.uisolution.platform.schema.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.BatchSize;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "field_def")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class FieldDef {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "field_id")
    private Long fieldId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "screen_id", nullable = false)
    private ScreenDef screenDef;

    @Column(name = "field_nm", nullable = false, length = 100)
    private String fieldNm;

    @Column(name = "field_label", nullable = false, length = 200)
    private String fieldLabel;

    @Column(name = "field_type", nullable = false, length = 30)
    private String fieldType;

    @Column(name = "input_type", length = 30)
    private String inputType;

    @Column(name = "placeholder", length = 200)
    private String placeholder;

    @Column(name = "default_value", length = 500)
    private String defaultValue;

    @Column(name = "col_span")
    private int colSpan = 1;

    @Column(name = "row_span")
    private int rowSpan = 1;

    @Column(name = "sort_order")
    private int sortOrder = 0;

    // 2D 그리드 위치 좌표 (행/열 0-기반 인덱스)
    @Column(name = "row_pos")
    private int rowPos = 0;

    @Column(name = "col_pos")
    private int colPos = 0;

    @Column(name = "readonly_yn", length = 1)
    private String readonlyYn = "N";

    @Column(name = "hidden_yn", length = 1)
    private String hiddenYn = "N";

    @Column(name = "use_yn", length = 1)
    private String useYn = "Y";

    @Column(name = "code_group", length = 50)
    private String codeGroup;

    @Column(name = "popup_screen_id", length = 50)
    private String popupScreenId;

    @Column(name = "extra_config", columnDefinition = "TEXT")
    private String extraConfig;

    // 실제 DB 컬럼명 (테이블 매핑 시 사용, null이면 fieldNm을 컬럼명으로 사용)
    @Column(name = "column_nm", length = 100)
    private String columnNm;

    @OneToMany(mappedBy = "fieldDef", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    @BatchSize(size = 50)
    @Builder.Default
    private List<ValidationRule> validationRules = new ArrayList<>();

    public void updateSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
    }

    public void updatePosition(int rowPos, int colPos) {
        this.rowPos = rowPos;
        this.colPos = colPos;
    }

    public void updateAll(String fieldNm, String fieldLabel, String fieldType,
                          String placeholder, String defaultValue,
                          int colSpan, int rowSpan, int sortOrder,
                          String readonlyYn, String hiddenYn, String useYn,
                          String codeGroup, String extraConfig,
                          int rowPos, int colPos, String columnNm) {
        this.fieldNm = fieldNm;
        this.fieldLabel = fieldLabel;
        this.fieldType = fieldType;
        this.placeholder = placeholder;
        this.defaultValue = defaultValue;
        this.colSpan = colSpan;
        this.rowSpan = rowSpan;
        this.sortOrder = sortOrder;
        this.readonlyYn = readonlyYn;
        this.hiddenYn = hiddenYn;
        this.useYn = useYn;
        this.codeGroup = codeGroup;
        this.extraConfig = extraConfig;
        this.rowPos = rowPos;
        this.colPos = colPos;
        this.columnNm = columnNm;
    }
}
