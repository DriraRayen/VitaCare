package com.vitacare.vitacare.Repository;

import com.vitacare.vitacare.Model.Document;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import org.springframework.stereotype.Repository;
import java.util.List;

import java.util.Optional;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Long> {
    Optional<Document> findByFilename(String filename);
    List<Document> findByUserId(Long userId);
    Optional<Document> findByFilenameAndUserId(String filename, Long userId);
    Optional<Document> findByIdAndUserId(Long id, Long userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select d from Document d where d.filename = :filename and d.user.id = :userId")
    Optional<Document> lockOwnedDocument(@Param("filename") String filename, @Param("userId") Long userId);

}
