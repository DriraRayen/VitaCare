package com.vitacare.vitacare.Repository;

import com.vitacare.vitacare.Model.CareDocumentShare;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CareDocumentShareRepository extends JpaRepository<CareDocumentShare, Long> {
    List<CareDocumentShare> findByConnectionIdOrderByIdDesc(Long connectionId);
    Optional<CareDocumentShare> findByConnectionIdAndDocumentId(Long connectionId, Long documentId);
    void deleteByConnectionId(Long connectionId);
    void deleteByDocumentId(Long documentId);
}
