package com.uisolution.platform.admin.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "site_role_screen")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class SiteRoleScreen {

    @EmbeddedId
    private SiteRoleScreenId id;

    @Column(name = "can_read",   length = 1) private String canRead   = "Y";
    @Column(name = "can_create", length = 1) private String canCreate = "N";
    @Column(name = "can_update", length = 1) private String canUpdate = "N";
    @Column(name = "can_delete", length = 1) private String canDelete = "N";
    @Column(name = "can_excel",  length = 1) private String canExcel  = "N";

    public void update(String canRead, String canCreate, String canUpdate,
                       String canDelete, String canExcel) {
        this.canRead   = canRead;
        this.canCreate = canCreate;
        this.canUpdate = canUpdate;
        this.canDelete = canDelete;
        this.canExcel  = canExcel;
    }
}
