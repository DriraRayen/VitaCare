package com.vitacare.vitacare.Rules;

import java.time.LocalDate;

public class TestEvaluationResult {
    private String code;
    private TestStatus status;
    private String reason;
    private LocalDate resultDate;
    private Integer daysAgo;
    private Double canonicalValue;
    private String canonicalUnit;
    private String reportText;
    private boolean flagged;
    private String flagMessage;
    private String caveat;
    private boolean optional;
    private String specialty;

    public TestEvaluationResult() {}

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public TestStatus getStatus() { return status; }
    public void setStatus(TestStatus status) { this.status = status; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public LocalDate getResultDate() { return resultDate; }
    public void setResultDate(LocalDate resultDate) { this.resultDate = resultDate; }

    public Integer getDaysAgo() { return daysAgo; }
    public void setDaysAgo(Integer daysAgo) { this.daysAgo = daysAgo; }

    public Double getCanonicalValue() { return canonicalValue; }
    public void setCanonicalValue(Double canonicalValue) { this.canonicalValue = canonicalValue; }

    public String getCanonicalUnit() { return canonicalUnit; }
    public void setCanonicalUnit(String canonicalUnit) { this.canonicalUnit = canonicalUnit; }

    public String getReportText() { return reportText; }
    public void setReportText(String reportText) { this.reportText = reportText; }

    public boolean isFlagged() { return flagged; }
    public void setFlagged(boolean flagged) { this.flagged = flagged; }

    public String getFlagMessage() { return flagMessage; }
    public void setFlagMessage(String flagMessage) { this.flagMessage = flagMessage; }

    public String getCaveat() { return caveat; }
    public void setCaveat(String caveat) { this.caveat = caveat; }

    public boolean isOptional() { return optional; }
    public void setOptional(boolean optional) { this.optional = optional; }

    public String getSpecialty() { return specialty; }
    public void setSpecialty(String specialty) { this.specialty = specialty; }
}
