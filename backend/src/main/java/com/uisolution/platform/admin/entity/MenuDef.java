package com.uisolution.platform.admin.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "menu_def")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class MenuDef {

    @Id
    @Column(name = "menu_id", length = 50)
    private String menuId;

    @Column(name = "parent_id", length = 50)
    private String parentId;

    @Column(name = "menu_nm", nullable = false, length = 100)
    private String menuNm;

    @Column(name = "menu_url", length = 500)
    private String menuUrl;

    @Column(name = "menu_icon", length = 100)
    private String menuIcon;

    @Column(name = "sort_order")
    private int sortOrder;

    @Column(name = "use_yn", length = 1)
    private String useYn = "Y";

    @Column(name = "project_id", length = 50)
    private String projectId;
}
