package com.vitacare.vitacare.Repository;

import com.vitacare.vitacare.Model.CaseResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CaseResultRepository extends JpaRepository<CaseResult, Long> {
    List<CaseResult> findByDiagnosticCaseId(Long caseId);
    Optional<CaseResult> findByIdAndDiagnosticCaseId(Long id, Long caseId);
    @Modifying
    @Query("update CaseResult result set result.sourceDocument = null where result.sourceDocument.id = :documentId")
    void detachDocument(@Param("documentId") Long documentId);
}
