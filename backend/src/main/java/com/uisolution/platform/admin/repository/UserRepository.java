package com.uisolution.platform.admin.repository;

import com.uisolution.platform.admin.entity.UserInfo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UserRepository extends JpaRepository<UserInfo, String> {

    @Query("SELECT u FROM UserInfo u JOIN FETCH u.roles WHERE u.userId = :userId AND u.useYn = 'Y'")
    Optional<UserInfo> findActiveUserWithRoles(@Param("userId") String userId);

    boolean existsByUserId(String userId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE UserInfo u SET u.password = :password WHERE u.userId = :userId")
    void updatePassword(@Param("userId") String userId, @Param("password") String password);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE UserInfo u SET u.userNm = :userNm, u.email = :email, u.deptNm = :deptNm, u.useYn = :useYn, u.profileImgUrl = :profileImgUrl WHERE u.userId = :userId")
    void updateInfo(@Param("userId") String userId, @Param("userNm") String userNm,
                    @Param("email") String email, @Param("deptNm") String deptNm,
                    @Param("useYn") String useYn, @Param("profileImgUrl") String profileImgUrl);
}
