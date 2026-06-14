package com.uisolution.platform.admin.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "code_group")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class CodeGroup {

    @Id
    @Column(name = "group_cd", length = 50)
    private String groupCd;

    @Column(name = "group_nm", nullable = false, length = 200)
    private String groupNm;

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "use_yn", length = 1)
    private String useYn = "Y";

    @Column(name = "project_id", length = 50)
    private String projectId;

    @OneToMany(mappedBy = "codeGroup", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    @Builder.Default
    private List<CodeDetail> details = new ArrayList<>();

    public void update(String groupNm, String description, String useYn) {
        this.groupNm = groupNm;
        this.description = description;
        this.useYn = useYn;
    }
}
