package com.uisolution.platform.site.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "site_menu")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class SiteMenu {

    @Id
    @Column(name = "menu_id", length = 50)
    private String menuId;

    @Column(name = "project_id", length = 50)
    private String projectId;

    @Column(name = "parent_id", length = 50)
    private String parentId;

    @Column(name = "menu_nm", nullable = false, length = 100)
    private String menuNm;

    @Column(name = "screen_id", length = 50)
    private String screenId;

    @Column(name = "menu_url", length = 500)
    private String menuUrl;

    @Column(name = "icon", length = 50)
    private String icon;

    @Column(name = "sort_order")
    private int sortOrder;

    @Column(name = "use_yn", length = 1)
    private String useYn = "Y";

    public void update(String menuNm, String parentId, String screenId,
                       String menuUrl, String icon, int sortOrder) {
        this.menuNm = menuNm;
        this.parentId = parentId;
        this.screenId = screenId;
        this.menuUrl = menuUrl;
        this.icon = icon;
        this.sortOrder = sortOrder;
    }
}
