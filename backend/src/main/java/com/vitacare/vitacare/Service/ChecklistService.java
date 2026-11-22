package com.vitacare.vitacare.Service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vitacare.vitacare.DTO.ChecklistDTO;
import com.vitacare.vitacare.DTO.ChecklistTestDTO;
import com.vitacare.vitacare.DTO.UrgentQuestionDTO;
import com.vitacare.vitacare.Model.Checklist;
import com.vitacare.vitacare.Model.ChecklistStatus;
import com.vitacare.vitacare.Model.ChecklistTest;
import com.vitacare.vitacare.Model.UrgentQuestion;
import com.vitacare.vitacare.Model.User;
import com.vitacare.vitacare.Repository.ChecklistRepository;
import com.vitacare.vitacare.Repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional
public class ChecklistService {

    private final ChecklistRepository checklistRepository;
    private final UserRepository userRepository;
    private final ObjectMapper jsonMapper = new ObjectMapper();

    public ChecklistService(ChecklistRepository checklistRepository, UserRepository userRepository) {
        this.checklistRepository = checklistRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<ChecklistDTO> getPublishedChecklists() {
        return checklistRepository.findByStatus(ChecklistStatus.PUBLISHED).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ChecklistDTO> getDraftChecklists() {
        return checklistRepository.findByStatus(ChecklistStatus.DRAFT).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ChecklistDTO getChecklistById(String id) {
        Checklist checklist = checklistRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Checklist non trouvée: " + id));
        return toDTO(checklist);
    }

    public ChecklistDTO publishChecklist(String id, String doctorEmail) {
        Checklist checklist = checklistRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Checklist non trouvée: " + id));
        User doctor = userRepository.findByEmail(doctorEmail)
                .orElseThrow(() -> new NoSuchElementException("Docteur non trouvé"));

        checklist.setStatus(ChecklistStatus.PUBLISHED);
        checklist.setReviewedBy(doctor);
        checklist.setPublishedAt(LocalDateTime.now());
        return toDTO(checklistRepository.save(checklist));
    }

    public ChecklistDTO archiveChecklist(String id, String doctorEmail) {
        Checklist checklist = checklistRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Checklist non trouvée: " + id));
        checklist.setStatus(ChecklistStatus.ARCHIVED);
        return toDTO(checklistRepository.save(checklist));
    }

    public ChecklistDTO toDTO(Checklist checklist) {
        String doctorName = null;
        if (checklist.getReviewedBy() != null) {
            doctorName = (checklist.getReviewedBy().getFirstName() != null ? checklist.getReviewedBy().getFirstName() + " " : "")
                    + (checklist.getReviewedBy().getLastName() != null ? checklist.getReviewedBy().getLastName() : "");
            if (doctorName.isBlank()) {
                doctorName = checklist.getReviewedBy().getEmail();
            }
        }

        List<ChecklistTestDTO> testDTOs = checklist.getTests().stream()
                .map(this::toTestDTO)
                .collect(Collectors.toList());

        List<UrgentQuestionDTO> uqDTOs = checklist.getUrgentQuestions().stream()
                .map(uq -> UrgentQuestionDTO.builder()
                        .id(uq.getId())
                        .questionId(uq.getQuestionId())
                        .questionFr(uq.getQuestionFr())
                        .questionEn(uq.getQuestionEn())
                        .build())
                .collect(Collectors.toList());

        return ChecklistDTO.builder()
                .id(checklist.getId())
                .title(checklist.getTitle())
                .guideline(checklist.getGuideline())
                .note(checklist.getNote())
                .status(checklist.getStatus())
                .reviewedByDoctorName(doctorName)
                .publishedAt(checklist.getPublishedAt())
                .tests(testDTOs)
                .urgentQuestions(uqDTOs)
                .build();
    }

    private ChecklistTestDTO toTestDTO(ChecklistTest test) {
        List<String> synonyms = Collections.emptyList();
        if (test.getSynonymsJson() != null) {
            try {
                synonyms = jsonMapper.readValue(test.getSynonymsJson(), new TypeReference<>() {});
            } catch (Exception ignored) {}
        }

        Map<String, Object> conversions = Collections.emptyMap();
        if (test.getConversionsJson() != null) {
            try {
                conversions = jsonMapper.readValue(test.getConversionsJson(), new TypeReference<>() {});
            } catch (Exception ignored) {}
        }

        List<String> components = null;
        if (test.getComponentsJson() != null) {
            try {
                components = jsonMapper.readValue(test.getComponentsJson(), new TypeReference<>() {});
            } catch (Exception ignored) {}
        }

        return ChecklistTestDTO.builder()
                .id(test.getId())
                .code(test.getCode())
                .synonyms(synonyms)
                .valueType(test.getValueType())
                .canonicalUnit(test.getCanonicalUnit())
                .conversions(conversions)
                .validityDays(test.getValidityDays())
                .flagExpr(test.getFlagExpr())
                .caveat(test.getCaveat())
                .optional(test.isOptional())
                .components(components)
                .specialty(test.getSpecialty())
                .build();
    }
}
