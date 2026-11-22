package com.vitacare.vitacare.Config;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import com.vitacare.vitacare.Model.*;
import com.vitacare.vitacare.Repository.ChecklistRepository;
import com.vitacare.vitacare.Repository.UserRepository;
import com.vitacare.vitacare.Repository.DiagnosticCaseRepository;
import com.vitacare.vitacare.Repository.CaseResultRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.util.*;

@Component
public class PathwaysDataLoader implements CommandLineRunner {

    private final ChecklistRepository checklistRepository;
    private final UserRepository userRepository;
    private final DiagnosticCaseRepository diagnosticCaseRepository;
    private final CaseResultRepository caseResultRepository;
    private final PasswordEncoder passwordEncoder;
    private final ObjectMapper yamlMapper = new ObjectMapper(new YAMLFactory());
    private final ObjectMapper jsonMapper = new ObjectMapper();

    public PathwaysDataLoader(ChecklistRepository checklistRepository,
                              UserRepository userRepository,
                              DiagnosticCaseRepository diagnosticCaseRepository,
                              CaseResultRepository caseResultRepository,
                              PasswordEncoder passwordEncoder) {
        this.checklistRepository = checklistRepository;
        this.userRepository = userRepository;
        this.diagnosticCaseRepository = diagnosticCaseRepository;
        this.caseResultRepository = caseResultRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        User doctor = seedDoctor();
        seedPatientAndCase(doctor);
        seedChecklists(doctor);
    }

    private User seedDoctor() {
        String doctorEmail = User.DEMO_DOCTOR_EMAIL;
        return userRepository.findByEmail(doctorEmail).orElseGet(() -> {
            User doctor = new User();
            doctor.setEmail(doctorEmail);
            doctor.setPassword(passwordEncoder.encode("doctor123"));
            doctor.setFirstName("Dr. Sophie");
            doctor.setLastName("Bernard");
            doctor.setRole(User.Role.ROLE_DOCTOR);
            doctor.setProvider(User.AuthProvider.LOCAL);
            return userRepository.save(doctor);
        });
    }

    private void seedPatientAndCase(User doctor) {
        String patientEmail = "patient@vitacare.com";
        User patient = userRepository.findByEmail(patientEmail).orElseGet(() -> {
            User p = new User();
            p.setEmail(patientEmail);
            p.setPassword(passwordEncoder.encode("patient123"));
            p.setFirstName("Jean");
            p.setLastName("Dupont");
            p.setDateOfBirth(java.time.LocalDate.of(1982, 5, 14));
            p.setGender(User.Gender.MALE);
            p.setPhoneNumber("+33 6 12 34 56 78");
            p.setBloodType("A+");
            p.setAllergies("Pénicilline");
            p.setChronicConditions("Suspicion diabète de type 2");
            p.setMedications("Aucun");
            p.setRole(User.Role.ROLE_PATIENT);
            p.setProvider(User.AuthProvider.LOCAL);
            return userRepository.save(p);
        });

        if (diagnosticCaseRepository.findByUserEmailOrderByCreatedAtDesc(patientEmail).isEmpty()) {
            DiagnosticCase dc = DiagnosticCase.builder()
                    .user(patient)
                    .checklistId("diabetes-diagnosis")
                    .complaint("Fatigue chronique inexpliquée depuis 2 mois, soif fréquente surtout en fin de journée.")
                    .status(DiagnosticCase.CaseStatus.ACTIVE)
                    .urgentFlag(false)
                    .build();
            DiagnosticCase savedCase = diagnosticCaseRepository.save(dc);

            CaseResult r1 = CaseResult.builder()
                    .diagnosticCase(savedCase)
                    .canonicalCode("FASTING_GLUCOSE")
                    .rawName("Glycémie à jeun")
                    .numericValue(1.10)
                    .unit("g/L")
                    .resultDate(java.time.LocalDate.now().minusDays(12))
                    .confidence(0.98)
                    .confirmedByUser(true)
                    .build();

            CaseResult r2 = CaseResult.builder()
                    .diagnosticCase(savedCase)
                    .canonicalCode("HBA1C")
                    .rawName("Hémoglobine glyquée (HbA1c)")
                    .numericValue(5.8)
                    .unit("%")
                    .resultDate(java.time.LocalDate.now().minusDays(12))
                    .confidence(0.95)
                    .confirmedByUser(true)
                    .build();

            caseResultRepository.saveAll(List.of(r1, r2));
        }
    }

    private void seedChecklists(User doctor) {
        try {
            PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
            Resource[] resources = resolver.getResources("classpath:pathways/*.yml");

            for (Resource resource : resources) {
                try (InputStream is = resource.getInputStream()) {
                    Map<String, Object> data = yamlMapper.readValue(is, new TypeReference<>() {});
                    String id = (String) data.get("id");
                    if (id == null || checklistRepository.existsById(id)) {
                        continue;
                    }

                    Checklist checklist = new Checklist();
                    checklist.setId(id);
                    checklist.setTitle((String) data.get("title"));
                    checklist.setGuideline((String) data.get("guideline"));
                    checklist.setNote((String) data.get("note"));
                    if ("diabetes-diagnosis".equals(id)) {
                        checklist.setStatus(ChecklistStatus.PUBLISHED);
                        checklist.setReviewedBy(doctor);
                        checklist.setPublishedAt(java.time.LocalDateTime.now().minusDays(5));
                    } else {
                        checklist.setStatus(ChecklistStatus.DRAFT);
                    }

                    // Urgent questions
                    List<UrgentQuestion> urgentQuestions = new ArrayList<>();
                    if (data.get("urgent_questions") instanceof List<?> uqList) {
                        for (Object uqObj : uqList) {
                            if (uqObj instanceof Map<?, ?> uqMap) {
                                UrgentQuestion uq = new UrgentQuestion();
                                uq.setChecklist(checklist);
                                uq.setQuestionId((String) uqMap.get("id"));
                                uq.setQuestionFr((String) uqMap.get("fr"));
                                uq.setQuestionEn((String) uqMap.get("en"));
                                urgentQuestions.add(uq);
                            }
                        }
                    }
                    checklist.setUrgentQuestions(urgentQuestions);

                    // Tests
                    List<ChecklistTest> tests = new ArrayList<>();
                    if (data.get("tests") instanceof List<?> testList) {
                        for (Object tObj : testList) {
                            if (tObj instanceof Map<?, ?> tMap) {
                                ChecklistTest test = new ChecklistTest();
                                test.setChecklist(checklist);
                                test.setCode((String) tMap.get("code"));

                                Object syns = tMap.get("synonyms");
                                test.setSynonymsJson(syns != null ? jsonMapper.writeValueAsString(syns) : "[]");

                                String typeStr = (String) tMap.get("type");
                                test.setValueType("report".equalsIgnoreCase(typeStr) ? TestValueType.REPORT : TestValueType.NUMERIC);

                                test.setCanonicalUnit((String) tMap.get("unit"));

                                Object conv = tMap.get("conv");
                                test.setConversionsJson(conv != null ? jsonMapper.writeValueAsString(conv) : "{}");

                                Object valDays = tMap.get("validity_days");
                                test.setValidityDays(valDays instanceof Number n ? n.intValue() : 365);

                                test.setFlagExpr((String) tMap.get("flag"));
                                test.setCaveat((String) tMap.get("caveat"));
                                test.setOptional(Boolean.TRUE.equals(tMap.get("optional")));

                                Object comps = tMap.get("components");
                                test.setComponentsJson(comps != null ? jsonMapper.writeValueAsString(comps) : null);

                                test.setSpecialty((String) tMap.get("specialty"));

                                tests.add(test);
                            }
                        }
                    }
                    checklist.setTests(tests);

                    checklistRepository.save(checklist);
                }
            }
        } catch (Exception e) {
            System.err.println("Failed to seed pathways: " + e.getMessage());
        }
    }
}
