package com.vitacare.vitacare.Rules;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

public class MasarRulesEngineTest {

    private final LocalDate today = LocalDate.of(2026, 11, 22);

    @Test
    void testDoneValidWithinWindow() {
        ChecklistTestItem glucose = new ChecklistTestItem();
        glucose.setCode("FASTING_GLUCOSE");
        glucose.setCanonicalUnit("mg/dL");
        glucose.setValidityDays(90);
        glucose.setFlagExpr(">=126");

        // Done 12 days ago
        ConfirmedResultData result = new ConfirmedResultData(
                "FASTING_GLUCOSE", "Glycémie à jeun", 110.0, "mg/dL", today.minusDays(12), null
        );

        RulesEvaluationOutput output = MasarRulesEngine.evaluate(
                "diabetes-diagnosis", "Diabète", true, null,
                List.of(glucose), List.of(result), today, List.of()
        );

        assertEquals(1, output.getTestsAvoidedCount());
        assertFalse(output.isUrgent());
        assertTrue(output.isClinicallyValidated());
        assertNull(output.getValidationBanner());

        TestEvaluationResult testRes = output.getTestResults().get(0);
        assertEquals(TestStatus.DONE_VALID, testRes.getStatus());
        assertEquals(12, testRes.getDaysAgo());
        assertFalse(testRes.isFlagged());
        assertEquals("Fait il y a 12 jours, inutile de refaire", testRes.getReason());
    }

    @Test
    void testExpiredTestBeyondWindow() {
        ChecklistTestItem glucose = new ChecklistTestItem();
        glucose.setCode("FASTING_GLUCOSE");
        glucose.setCanonicalUnit("mg/dL");
        glucose.setValidityDays(90);

        // Done 100 days ago (validity = 90)
        ConfirmedResultData result = new ConfirmedResultData(
                "FASTING_GLUCOSE", "Glycémie à jeun", 110.0, "mg/dL", today.minusDays(100), null
        );

        RulesEvaluationOutput output = MasarRulesEngine.evaluate(
                "diabetes-diagnosis", "Diabète", true, null,
                List.of(glucose), List.of(result), today, List.of()
        );

        assertEquals(0, output.getTestsAvoidedCount());
        TestEvaluationResult testRes = output.getTestResults().get(0);
        assertEquals(TestStatus.EXPIRED, testRes.getStatus());
        assertEquals(100, testRes.getDaysAgo());
        assertTrue(testRes.getReason().contains("à renouveler"));
        assertTrue(output.getTestsToRequestTogether().containsKey("Laboratoire d'analyses médicales"));
    }

    @Test
    void testMissingTest() {
        ChecklistTestItem hba1c = new ChecklistTestItem();
        hba1c.setCode("HBA1C");
        hba1c.setCanonicalUnit("%");
        hba1c.setValidityDays(90);

        RulesEvaluationOutput output = MasarRulesEngine.evaluate(
                "diabetes-diagnosis", "Diabète", true, null,
                List.of(hba1c), List.of(), today, List.of()
        );

        assertEquals(0, output.getTestsAvoidedCount());
        TestEvaluationResult testRes = output.getTestResults().get(0);
        assertEquals(TestStatus.MISSING, testRes.getStatus());
        assertEquals("Non trouvé dans vos documents", testRes.getReason());
    }

    @Test
    void testInformationalFlagTriggered() {
        ChecklistTestItem glucose = new ChecklistTestItem();
        glucose.setCode("FASTING_GLUCOSE");
        glucose.setCanonicalUnit("mg/dL");
        glucose.setValidityDays(90);
        glucose.setFlagExpr(">=126");

        // Value 130 mg/dL >= 126
        ConfirmedResultData result = new ConfirmedResultData(
                "FASTING_GLUCOSE", "Glycémie", 130.0, "mg/dL", today.minusDays(5), null
        );

        RulesEvaluationOutput output = MasarRulesEngine.evaluate(
                "diabetes-diagnosis", "Diabète", true, null,
                List.of(glucose), List.of(result), today, List.of()
        );

        TestEvaluationResult testRes = output.getTestResults().get(0);
        assertTrue(testRes.isFlagged());
        assertEquals(MasarRulesEngine.INFORMATIONAL_FLAG_MSG, testRes.getFlagMessage());
    }

    @Test
    void testUrgentQuestionsBanner() {
        ChecklistTestItem glucose = new ChecklistTestItem();
        glucose.setCode("FASTING_GLUCOSE");

        RulesEvaluationOutput output = MasarRulesEngine.evaluate(
                "diabetes-diagnosis", "Diabète", true, null,
                List.of(glucose), List.of(), today, List.of("uq1")
        );

        assertTrue(output.isUrgent());
        assertEquals("Consultez un médecin en urgence ou appelez le SAMU (190).", output.getUrgentMessage());
    }

    @Test
    void testNotClinicallyValidatedShowsBanner() {
        ChecklistTestItem glucose = new ChecklistTestItem();
        glucose.setCode("FASTING_GLUCOSE");

        RulesEvaluationOutput output = MasarRulesEngine.evaluate(
                "diabetes-diagnosis", "Diabète", false, null,
                List.of(glucose), List.of(), today, List.of()
        );

        assertFalse(output.isClinicallyValidated());
        assertNotNull(output.getValidationBanner());
        assertEquals(MasarRulesEngine.NOT_VALIDATED_BANNER, output.getValidationBanner());
    }

    @Test
    void testComponentsTestSatisfiedOnlyWhenAllPresentSameDate() {
        ChecklistTestItem lipidPanel = new ChecklistTestItem();
        lipidPanel.setCode("LIPID_PANEL");
        lipidPanel.setComponents(List.of("TOTAL_CHOL", "HDL", "TG"));
        lipidPanel.setValidityDays(365);

        LocalDate testDate = today.minusDays(20);

        // Case 1: All components same date -> valid
        List<ConfirmedResultData> complete = List.of(
                new ConfirmedResultData("TOTAL_CHOL", "Cholestérol", 190.0, "mg/dL", testDate, null),
                new ConfirmedResultData("HDL", "HDL", 50.0, "mg/dL", testDate, null),
                new ConfirmedResultData("TG", "Triglycérides", 140.0, "mg/dL", testDate, null)
        );

        RulesEvaluationOutput out1 = MasarRulesEngine.evaluate(
                "annual", "Bilan", true, null, List.of(lipidPanel), complete, today, List.of()
        );
        assertEquals(TestStatus.DONE_VALID, out1.getTestResults().get(0).getStatus());
        assertEquals(1, out1.getTestsAvoidedCount());

        // Case 2: One component missing -> missing
        List<ConfirmedResultData> incomplete = List.of(
                new ConfirmedResultData("TOTAL_CHOL", "Cholestérol", 190.0, "mg/dL", testDate, null),
                new ConfirmedResultData("HDL", "HDL", 50.0, "mg/dL", testDate, null)
        );
        RulesEvaluationOutput out2 = MasarRulesEngine.evaluate(
                "annual", "Bilan", true, null, List.of(lipidPanel), incomplete, today, List.of()
        );
        assertEquals(TestStatus.MISSING, out2.getTestResults().get(0).getStatus());
        assertEquals(0, out2.getTestsAvoidedCount());
    }
}
