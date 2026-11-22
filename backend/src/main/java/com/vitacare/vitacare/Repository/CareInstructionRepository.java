package com.vitacare.vitacare.Repository;

import com.vitacare.vitacare.Model.CareInstruction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CareInstructionRepository extends JpaRepository<CareInstruction, Long> {
    List<CareInstruction> findByConnectionIdInOrderByIdDesc(List<Long> connectionIds);
    Optional<CareInstruction> findByIdAndConnectionId(Long id, Long connectionId);
}
