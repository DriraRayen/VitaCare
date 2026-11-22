package com.vitacare.vitacare.Rules;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

public class MasarRulesEngine {

    public static final String INFORMATIONAL_FLAG_MSG = "À discuter avec votre médecin (information, pas un diagnostic)";
    public static final String NOT_VALIDATED_BANNER = "Cette liste n'a pas encore été validée cliniquement par un médecin.";
    public static final String DEFAULT_URGENT_MSG = "Consultez un médecin en urgence ou appelez le SAMU (190).";

    public static RulesEvaluationOutput evaluate(
            String checklistId,
            String checklistTitle,
            boolean isClinicallyValidated,
            String urgentMessageOverride,
            List<ChecklistTestItem> tests,
            List<ConfirmedResultData> confirmedResults,
            LocalDate today,
            List<String> answeredUrgentQuestions
    ) {
        if (today == null) today = LocalDate.now();
        if (confirmedResults == null) confirmedResults = Collections.emptyList();
        if (tests == null) tests = Collections.emptyList();

        RulesEvaluationOutput output = new RulesEvaluationOutput();
        output.setChecklistId(checklistId);
        output.setChecklistTitle(checklistTitle);
        output.setClinicallyValidated(isClinicallyValidated);
        if (!isClinicallyValidated) {
            output.setValidationBanner(NOT_VALIDATED_BANNER);
        }

        // Urgent flag evaluation
        boolean urgent = answeredUrgentQuestions != null && !answeredUrgentQuestions.isEmpty();
        output.setUrgent(urgent);
        if (urgent) {
            output.setUrgentMessage(urgentMessageOverride != null && !urgentMessageOverride.isBlank()
                    ? urgentMessageOverride : DEFAULT_URGENT_MSG);
        }

        int testsAvoided = 0;
        List<TestEvaluationResult> evalResults = new ArrayList<>();
        Map<String, List<String>> toRequestTogether = new LinkedHashMap<>();

        // Group confirmed results by canonicalCode
        Map<String, List<ConfirmedResultData>> resultsByCode = new HashMap<>();
        for (ConfirmedResultData cr : confirmedResults) {
            if (cr.getCanonicalCode() != null) {
                resultsByCode.computeIfAbsent(cr.getCanonicalCode().toUpperCase(), k -> new ArrayList<>()).add(cr);
            }
        }
        // Sort each list by date descending (latest first)
        for (List<ConfirmedResultData> list : resultsByCode.values()) {
            list.sort((a, b) -> {
                if (a.getResultDate() == null && b.getResultDate() == null) return 0;
                if (a.getResultDate() == null) return 1;
                if (b.getResultDate() == null) return -1;
                return b.getResultDate().compareTo(a.getResultDate());
            });
        }

        for (ChecklistTestItem test : tests) {
            String code = test.getCode().toUpperCase();
            String specialty = test.getSpecialty() != null && !test.getSpecialty().isBlank()
                    ? test.getSpecialty() : "Laboratoire d'analyses médicales";

            TestEvaluationResult eval = new TestEvaluationResult();
            eval.setCode(test.getCode());
            eval.setOptional(test.isOptional());
            eval.setCaveat(test.getCaveat());
            eval.setSpecialty(specialty);

            // Case A: Components grouping (e.g. LIPID_PANEL)
            if (test.getComponents() != null && !test.getComponents().isEmpty()) {
                evaluateComponentsTest(test, resultsByCode, today, eval);
            }
            // Case B: Report type (e.g. EYE_EXAM)
            else if ("report".equalsIgnoreCase(test.getValueType())) {
                evaluateReportTest(test, resultsByCode.get(code), today, eval);
            }
            // Case C: Standard Numeric test
            else {
                evaluateNumericTest(test, resultsByCode.get(code), today, eval);
            }

            evalResults.add(eval);

            if (eval.getStatus() == TestStatus.DONE_VALID) {
                testsAvoided++;
            } else {
                // EXPIRED or MISSING -> add to tests to request together (unless optional)
                toRequestTogether.computeIfAbsent(specialty, k -> new ArrayList<>())
                        .add(test.getCode() + (test.getCanonicalUnit() != null ? " (" + test.getCanonicalUnit() + ")" : ""));
            }
        }

        output.setTestsAvoidedCount(testsAvoided);
        output.setTestResults(evalResults);
        output.setTestsToRequestTogether(toRequestTogether);

        return output;
    }

    private static void evaluateComponentsTest(
            ChecklistTestItem test,
            Map<String, List<ConfirmedResultData>> resultsByCode,
            LocalDate today,
            TestEvaluationResult eval
    ) {
        List<String> components = test.getComponents();
        // Check if a direct test result exists
        List<ConfirmedResultData> directResults = resultsByCode.get(test.getCode().toUpperCase());
        if (directResults != null && !directResults.isEmpty()) {
            ConfirmedResultData latest = directResults.get(0);
            applyDateStatus(latest.getResultDate(), test.getValidityDays(), today, eval, "Bilan complet");
            return;
        }

        // Check each component and see if there is a common date
        Map<LocalDate, Set<String>> componentsByDate = new HashMap<>();
        for (String comp : components) {
            List<ConfirmedResultData> compResults = resultsByCode.get(comp.toUpperCase());
            if (compResults != null) {
                for (ConfirmedResultData cr : compResults) {
                    if (cr.getResultDate() != null) {
                        componentsByDate.computeIfAbsent(cr.getResultDate(), d -> new HashSet<>()).add(comp.toUpperCase());
                    }
                }
            }
        }

        // Find latest date where all components are present
        LocalDate validMatchingDate = null;
        for (Map.Entry<LocalDate, Set<String>> entry : componentsByDate.entrySet()) {
            if (entry.getValue().size() >= components.size()) {
                if (validMatchingDate == null || entry.getKey().isAfter(validMatchingDate)) {
                    validMatchingDate = entry.getKey();
                }
            }
        }

        if (validMatchingDate != null) {
            applyDateStatus(validMatchingDate, test.getValidityDays(), today, eval,
                    "Composants (" + String.join(", ", components) + ") réalisés");
        } else {
            eval.setStatus(TestStatus.MISSING);
            eval.setReason("Composants incomplets (" + String.join(", ", components) + "), à réaliser ensemble");
        }
    }

    private static void evaluateReportTest(
            ChecklistTestItem test,
            List<ConfirmedResultData> results,
            LocalDate today,
            TestEvaluationResult eval
    ) {
        if (results == null || results.isEmpty()) {
            eval.setStatus(TestStatus.MISSING);
            eval.setReason("Rapport non trouvé dans vos documents");
            return;
        }

        ConfirmedResultData latest = results.get(0);
        eval.setReportText(latest.getReportText());
        applyDateStatus(latest.getResultDate(), test.getValidityDays(), today, eval, "Rapport");
    }

    private static void evaluateNumericTest(
            ChecklistTestItem test,
            List<ConfirmedResultData> results,
            LocalDate today,
            TestEvaluationResult eval
    ) {
        if (results == null || results.isEmpty()) {
            eval.setStatus(TestStatus.MISSING);
            eval.setReason("Non trouvé dans vos documents");
            return;
        }

        ConfirmedResultData latest = results.get(0);
        Double rawVal = latest.getNumericValue();
        Double canonicalVal = UnitConverter.convert(rawVal, latest.getUnit(), test.getCanonicalUnit(), test.getConversions());

        eval.setCanonicalValue(canonicalVal);
        eval.setCanonicalUnit(test.getCanonicalUnit());

        boolean flagged = FlagEvaluator.isFlagged(canonicalVal, test.getFlagExpr());
        eval.setFlagged(flagged);
        if (flagged) {
            eval.setFlagMessage(INFORMATIONAL_FLAG_MSG);
        }

        applyDateStatus(latest.getResultDate(), test.getValidityDays(), today, eval, "Test");
    }

    private static void applyDateStatus(
            LocalDate resultDate,
            int validityDays,
            LocalDate today,
            TestEvaluationResult eval,
            String prefix
    ) {
        eval.setResultDate(resultDate);
        if (resultDate == null) {
            eval.setStatus(TestStatus.MISSING);
            eval.setReason(prefix + " sans date renseignée");
            return;
        }

        long daysAgo = ChronoUnit.DAYS.between(resultDate, today);
        eval.setDaysAgo((int) daysAgo);

        if (daysAgo < 0) {
            // Future date (aberrant or invalid)
            eval.setStatus(TestStatus.MISSING);
            eval.setReason("Date future invalide (" + resultDate + ")");
        } else if (daysAgo <= validityDays) {
            eval.setStatus(TestStatus.DONE_VALID);
            eval.setReason("Fait il y a " + daysAgo + " jours, inutile de refaire");
        } else {
            eval.setStatus(TestStatus.EXPIRED);
            eval.setReason("Fait il y a " + daysAgo + " jours (valide " + validityDays + " jours), à renouveler");
        }
    }
}
