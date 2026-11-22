package com.vitacare.vitacare.Repository;

import com.vitacare.vitacare.Model.DiagnosticCase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DiagnosticCaseRepository extends JpaRepository<DiagnosticCase, Long> {
    List<DiagnosticCase> findByUserEmailOrderByCreatedAtDesc(String email);
    Optional<DiagnosticCase> findByIdAndUserEmail(Long id, String email);
}
