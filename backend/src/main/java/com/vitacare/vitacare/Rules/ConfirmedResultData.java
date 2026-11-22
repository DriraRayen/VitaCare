package com.vitacare.vitacare.Rules;

import java.time.LocalDate;

public class ConfirmedResultData {
    private String canonicalCode;
    private String rawName;
    private Double numericValue;
    private String unit;
    private LocalDate resultDate;
    private String reportText;

    public ConfirmedResultData() {}

    public ConfirmedResultData(String canonicalCode, String rawName, Double numericValue, String unit, LocalDate resultDate, String reportText) {
        this.canonicalCode = canonicalCode;
        this.rawName = rawName;
        this.numericValue = numericValue;
        this.unit = unit;
        this.resultDate = resultDate;
        this.reportText = reportText;
    }

    public String getCanonicalCode() { return canonicalCode; }
    public void setCanonicalCode(String canonicalCode) { this.canonicalCode = canonicalCode; }

    public String getRawName() { return rawName; }
    public void setRawName(String rawName) { this.rawName = rawName; }

    public Double getNumericValue() { return numericValue; }
    public void setNumericValue(Double numericValue) { this.numericValue = numericValue; }

    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }

    public LocalDate getResultDate() { return resultDate; }
    public void setResultDate(LocalDate resultDate) { this.resultDate = resultDate; }

    public String getReportText() { return reportText; }
    public void setReportText(String reportText) { this.reportText = reportText; }
}
