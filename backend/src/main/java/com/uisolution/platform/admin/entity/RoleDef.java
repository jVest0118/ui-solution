package com.uisolution.platform.admin.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "role_def")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class RoleDef {

    @Id
    @Column(name = "role_id", length = 50)
    private String roleId;

    @Column(name = "role_nm", nullable = false, length = 100)
    private String roleNm;

    @Column(name = "role_desc", length = 500)
    private String roleDesc;

    @Column(name = "role_level")
    private int roleLevel = 10;

    @Column(name = "use_yn", length = 1)
    private String useYn = "Y";

    public void update(String roleNm, String roleDesc, int roleLevel, String useYn) {
        this.roleNm = roleNm;
        this.roleDesc = roleDesc;
        this.roleLevel = roleLevel;
        this.useYn = useYn;
    }
}
