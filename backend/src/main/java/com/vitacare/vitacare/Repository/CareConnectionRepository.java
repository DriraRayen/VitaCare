package com.vitacare.vitacare.Repository;

import com.vitacare.vitacare.Model.CareConnection;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CareConnectionRepository extends JpaRepository<CareConnection, Long> {
    List<CareConnection> findByPatientIdOrDoctorIdOrderByIdDesc(Long patientId, Long doctorId);
    Optional<CareConnection> findByPatientIdAndDoctorId(Long patientId, Long doctorId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from CareConnection c where c.id = :id")
    Optional<CareConnection> lockById(@Param("id") Long id);
}
