package com.vitacare.vitacare.Repository;

import com.vitacare.vitacare.Model.Checklist;
import com.vitacare.vitacare.Model.ChecklistStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChecklistRepository extends JpaRepository<Checklist, String> {
    List<Checklist> findByStatus(ChecklistStatus status);
}
