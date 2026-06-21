package com.uisolution.platform.contacts.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "contact")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Contact {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "owner_id", length = 100, nullable = false)
    private String ownerId;

    @Column(name = "last_name",  length = 100) private String lastName;
    @Column(name = "first_name", length = 100) private String firstName;
    @Column(name = "nickname",   length = 100) private String nickname;
    @Column(name = "company",    length = 200) private String company;
    @Column(name = "department", length = 200) private String department;
    @Column(name = "position",   length = 100) private String position;

    /** JSON: [{type, email, isDefault}] */
    @Column(name = "emails", columnDefinition = "TEXT") private String emails;
    /** JSON: [{type, countryCode, phone, isDefault}] */
    @Column(name = "phones", columnDefinition = "TEXT") private String phones;
    /** JSON: ["그룹명", ...] */
    @Column(name = "cgroups", columnDefinition = "TEXT") private String cgroups;

    @Column(name = "is_favorite", nullable = false) @Builder.Default
    private boolean favorite = false;

    @Column(name = "created_at") private LocalDateTime createdAt;
    @Column(name = "updated_at") private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() { createdAt = updatedAt = LocalDateTime.now(); }

    @PreUpdate
    void preUpdate() { updatedAt = LocalDateTime.now(); }

    public void update(String lastName, String firstName, String nickname,
                       String company, String department, String position,
                       String emails, String phones, String cgroups, boolean favorite) {
        this.lastName   = lastName;
        this.firstName  = firstName;
        this.nickname   = nickname;
        this.company    = company;
        this.department = department;
        this.position   = position;
        this.emails     = emails;
        this.phones     = phones;
        this.cgroups    = cgroups;
        this.favorite   = favorite;
    }

    public void toggleFavorite() { this.favorite = !this.favorite; }
}
