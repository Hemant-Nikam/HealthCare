package com.healthcare.repository;

import com.healthcare.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    List<User> findByRole(User.Role role);
    List<User> findByRoleAndIsActive(User.Role role, Boolean isActive);

    @Query("SELECT COUNT(u) FROM User u WHERE u.role = :role")
    long countByRole(User.Role role);
}
