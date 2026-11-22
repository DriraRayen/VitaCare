package com.vitacare.vitacare.Rules;

import java.util.List;
import java.util.Map;

public class RulesEvaluationOutput {
    private String checklistId;
    private String checklistTitle;
    private boolean clinicallyValidated;
    private String validationBanner;
    private boolean urgent;
    private String urgentMessage;
    private int testsAvoidedCount;
    private List<TestEvaluationResult> testResults;
    private Map<String, List<String>> testsToRequestTogether;

    public RulesEvaluationOutput() {}

    public String getChecklistId() { return checklistId; }
    public void setChecklistId(String checklistId) { this.checklistId = checklistId; }

    public String getChecklistTitle() { return checklistTitle; }
    public void setChecklistTitle(String checklistTitle) { this.checklistTitle = checklistTitle; }

    public boolean isClinicallyValidated() { return clinicallyValidated; }
    public void setClinicallyValidated(boolean clinicallyValidated) { this.clinicallyValidated = clinicallyValidated; }

    public String getValidationBanner() { return validationBanner; }
    public void setValidationBanner(String validationBanner) { this.validationBanner = validationBanner; }

    public boolean isUrgent() { return urgent; }
    public void setUrgent(boolean urgent) { this.urgent = urgent; }

    public String getUrgentMessage() { return urgentMessage; }
    public void setUrgentMessage(String urgentMessage) { this.urgentMessage = urgentMessage; }

    public int getTestsAvoidedCount() { return testsAvoidedCount; }
    public void setTestsAvoidedCount(int testsAvoidedCount) { this.testsAvoidedCount = testsAvoidedCount; }

    public List<TestEvaluationResult> getTestResults() { return testResults; }
    public void setTestResults(List<TestEvaluationResult> testResults) { this.testResults = testResults; }

    public Map<String, List<String>> getTestsToRequestTogether() { return testsToRequestTogether; }
    public void setTestsToRequestTogether(Map<String, List<String>> testsToRequestTogether) { this.testsToRequestTogether = testsToRequestTogether; }
}
