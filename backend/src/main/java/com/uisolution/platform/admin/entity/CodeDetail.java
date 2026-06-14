package com.uisolution.platform.admin.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "code_detail")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@IdClass(CodeDetailId.class)
public class CodeDetail {

    @Id
    @Column(name = "group_cd", length = 50)
    private String groupCd;

    @Id
    @Column(name = "code_val", length = 100)
    private String codeVal;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_cd", insertable = false, updatable = false)
    private CodeGroup codeGroup;

    @Column(name = "code_nm", nullable = false, length = 200)
    private String codeNm;

    @Column(name = "sort_order")
    private int sortOrder = 0;

    @Column(name = "extra1", length = 200)
    private String extra1;

    @Column(name = "extra2", length = 200)
    private String extra2;

    @Column(name = "use_yn", length = 1)
    private String useYn = "Y";

    public void update(String codeNm, int sortOrder, String useYn) {
        this.codeNm = codeNm;
        this.sortOrder = sortOrder;
        this.useYn = useYn;
    }
}
