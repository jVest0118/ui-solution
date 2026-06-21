package com.uisolution.platform.schema.dto;

import com.fasterxml.jackson.annotation.JsonRawValue;
import com.uisolution.platform.schema.entity.FieldDef;
import com.uisolution.platform.schema.entity.ScreenDef;
import com.uisolution.platform.schema.entity.ValidationRule;
import lombok.Builder;
import lombok.Getter;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Getter
@Builder
public class ScreenSchemaDto {

    private String screenId;
    private String screenNm;
    private String screenType;
    private String description;
    private String apiResource;
    private Object layoutConfig;
    private Object buttonConfig;
    private int version;
    private String openType;
    private String datasourceType;
    private String tableNm;
    private String pkColumn;
    private String dbConnId;
    private List<FieldDto> fields;

    // 권한 정보 (로그인 사용자 롤 기반) - 빌더 후 grantAllPermissions()로 변경 가능
    @lombok.Setter private boolean canRead;
    @lombok.Setter private boolean canCreate;
    @lombok.Setter private boolean canUpdate;
    @lombok.Setter private boolean canDelete;
    @lombok.Setter private boolean canExcel;
    @lombok.Setter private boolean canPrint;

    @Getter
    @Builder
    public static class FieldDto {
        private Long fieldId;
        private String fieldNm;
        private String fieldLabel;
        private String fieldType;
        private String inputType;
        private String placeholder;
        private String defaultValue;
        private int colSpan;
        private int rowSpan;
        private int sortOrder;
        private int rowPos;
        private int colPos;
        private boolean readonly;
        private boolean hidden;
        private String codeGroup;
        private String popupScreenId;
        private String columnNm;
        @JsonRawValue
        private String extraConfig;
        private List<ValidationRuleDto> validationRules;
    }

    @Getter
    @Builder
    public static class ValidationRuleDto {
        private Long ruleId;
        private String ruleType;
        private String ruleValue;
        private String errorMsg;
        private Object conditionJson;
    }

    public void grantAllPermissions() {
        setCanRead(true);
        setCanCreate(true);
        setCanUpdate(true);
        setCanDelete(true);
        setCanExcel(true);
        setCanPrint(true);
    }

    public static ScreenSchemaDto from(ScreenDef screen) {
        List<FieldDto> fieldDtos = screen.getFields().stream()
                .filter(f -> f.getUseYn() == null || "Y".equals(f.getUseYn()))
                .sorted(Comparator.comparingInt(FieldDef::getRowPos)
                        .thenComparingInt(FieldDef::getColPos))
                .map(ScreenSchemaDto::toFieldDto)
                .collect(Collectors.toList());

        return ScreenSchemaDto.builder()
                .screenId(screen.getScreenId())
                .screenNm(screen.getScreenNm())
                .screenType(screen.getScreenType())
                .description(screen.getDescription())
                .apiResource(screen.getApiResource())
                .layoutConfig(screen.getLayoutConfig())
                .buttonConfig(screen.getButtonConfig())
                .version(screen.getVersion())
                .openType(screen.getOpenType() != null ? screen.getOpenType() : "page")
                .datasourceType(screen.getDatasourceType() != null ? screen.getDatasourceType() : "biz_data")
                .tableNm(screen.getTableNm())
                .pkColumn(screen.getPkColumn() != null ? screen.getPkColumn() : "id")
                .dbConnId(screen.getDbConnId())
                .fields(fieldDtos)
                .canRead(true)
                .canCreate(false)
                .canUpdate(false)
                .canDelete(false)
                .canExcel(false)
                .canPrint(false)
                .build();
    }

    private static FieldDto toFieldDto(FieldDef field) {
        List<ValidationRuleDto> ruleDtos = field.getValidationRules().stream()
                .map(r -> ValidationRuleDto.builder()
                        .ruleId(r.getRuleId())
                        .ruleType(r.getRuleType())
                        .ruleValue(r.getRuleValue())
                        .errorMsg(r.getErrorMsg())
                        .conditionJson(r.getConditionJson())
                        .build())
                .collect(Collectors.toList());

        return FieldDto.builder()
                .fieldId(field.getFieldId())
                .fieldNm(field.getFieldNm())
                .fieldLabel(field.getFieldLabel())
                .fieldType(field.getFieldType())
                .inputType(field.getInputType())
                .placeholder(field.getPlaceholder())
                .defaultValue(field.getDefaultValue())
                .colSpan(field.getColSpan())
                .rowSpan(field.getRowSpan())
                .sortOrder(field.getSortOrder())
                .rowPos(field.getRowPos())
                .colPos(field.getColPos())
                .readonly("Y".equals(field.getReadonlyYn()))
                .hidden("Y".equals(field.getHiddenYn()))
                .codeGroup(field.getCodeGroup())
                .popupScreenId(field.getPopupScreenId())
                .columnNm(field.getColumnNm())
                .extraConfig(field.getExtraConfig())
                .validationRules(ruleDtos)
                .build();
    }
}
