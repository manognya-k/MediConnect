package com.cts.mfrp.repository;

import com.cts.mfrp.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Integer> {
    Optional<User> findByEmail(String email);
    Optional<User> findByUniqueId(String uniqueId);
    boolean existsByUniqueId(String uniqueId);
    List<User> findByRoleIgnoreCase(String role);
}
