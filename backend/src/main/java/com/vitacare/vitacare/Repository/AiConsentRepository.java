package com.vitacare.vitacare.Repository;

import com.vitacare.vitacare.Model.AiConsent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AiConsentRepository extends JpaRepository<AiConsent, Long> {
    Optional<AiConsent> findTopByUserEmailAndRevokedFalseOrderByConsentDateDesc(String email);
}
