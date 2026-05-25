package com.healthcare.repository;

import com.healthcare.model.OtpToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

public interface OtpTokenRepository extends JpaRepository<OtpToken, Long> {

    Optional<OtpToken> findTopByEmailAndVerifiedFalseOrderByCreatedAtDesc(String email);

    Optional<OtpToken> findTopByEmailAndVerifiedTrueOrderByCreatedAtDesc(String email);

    @Transactional
    void deleteByEmail(String email);
}
