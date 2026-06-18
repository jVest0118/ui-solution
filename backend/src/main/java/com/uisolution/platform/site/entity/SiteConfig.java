package com.uisolution.platform.site.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "site_config")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class SiteConfig {

    @Id
    @Column(name = "project_id", length = 50)
    private String projectId;

    @Column(name = "site_nm", length = 100)
    private String siteNm;

    // top-dropdown: 1단계 상단, 2단계 드롭다운
    // top-side: 1단계 상단, 2단계 좌측 사이드바
    @Column(name = "nav_style", length = 20)
    private String navStyle = "top-side";

    public void update(String siteNm, String navStyle) {
        this.siteNm = siteNm;
        this.navStyle = navStyle;
    }
}
