package com.uisolution.platform.contacts.repository;

import com.uisolution.platform.contacts.entity.ContactGroup;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ContactGroupRepository extends JpaRepository<ContactGroup, Long> {
    List<ContactGroup> findByOwnerIdOrderByGroupNameAsc(String ownerId);
    Optional<ContactGroup> findByOwnerIdAndGroupName(String ownerId, String groupName);
    boolean existsByOwnerIdAndGroupName(String ownerId, String groupName);
}
