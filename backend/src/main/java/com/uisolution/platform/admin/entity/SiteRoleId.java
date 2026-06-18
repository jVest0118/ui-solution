package com.uisolution.platform.admin.entity;

import jakarta.persistence.Embeddable;
import lombok.*;

import java.io.Serializable;

@Embeddable
@Getter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class SiteRoleId implements Serializable {
    private String roleId;
    private String projectId;
}
