package com.uisolution.platform.schema.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "validation_rule")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class ValidationRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "rule_id")
    private Long ruleId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "field_id", nullable = false)
    private FieldDef fieldDef;

    @Column(name = "rule_type", nullable = false, length = 30)
    private String ruleType;

    @Column(name = "rule_value", length = 500)
    private String ruleValue;

    @Column(name = "error_msg", nullable = false, length = 500)
    private String errorMsg;

    @Column(name = "condition_json", columnDefinition = "TEXT")
    private String conditionJson;

    @Column(name = "sort_order")
    private int sortOrder = 0;
}
