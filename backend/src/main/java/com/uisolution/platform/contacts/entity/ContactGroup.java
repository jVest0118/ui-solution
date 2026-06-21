package com.uisolution.platform.contacts.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "contact_group")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class ContactGroup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "owner_id",   length = 100, nullable = false) private String ownerId;
    @Column(name = "group_name", length = 100, nullable = false) private String groupName;
}
