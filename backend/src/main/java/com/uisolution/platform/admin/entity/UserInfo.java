package com.uisolution.platform.admin.entity;

import com.uisolution.platform.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "usr_info")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class UserInfo extends BaseEntity {

    @Id
    @Column(name = "user_id", length = 50)
    private String userId;

    @Column(name = "user_nm", nullable = false, length = 100)
    private String userNm;

    @Column(name = "password", nullable = false, length = 255)
    private String password;

    @Column(name = "email", length = 200)
    private String email;

    @Column(name = "dept_nm", length = 100)
    private String deptNm;

    @Column(name = "profile_img_url", length = 500)
    private String profileImgUrl;

    @Column(name = "use_yn", length = 1)
    private String useYn = "Y";

    @Column(name = "pwd_chg_dt")
    private LocalDate pwdChgDt;

    @Column(name = "last_login_dt")
    private LocalDateTime lastLoginDt;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "usr_role",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "role_id")
    )
    @Builder.Default
    private Set<RoleDef> roles = new HashSet<>();

    public void updateLastLogin() {
        this.lastLoginDt = LocalDateTime.now();
    }

    public void changePassword(String encodedPassword) {
        this.password = encodedPassword;
        this.pwdChgDt = LocalDate.now();
    }
}
