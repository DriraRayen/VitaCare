package com.vitacare.vitacare.Rules;

import java.util.List;
import java.util.Map;

public class ChecklistTestItem {
    private String code;
    private List<String> synonyms;
    private String valueType; // "numeric" or "report"
    private String canonicalUnit;
    private Map<String, Object> conversions;
    private int validityDays;
    private String flagExpr;
    private String caveat;
    private boolean optional;
    private List<String> components;
    private String specialty;

    public ChecklistTestItem() {}

    public ChecklistTestItem(String code, List<String> synonyms, String valueType, String canonicalUnit,
                             Map<String, Object> conversions, int validityDays, String flagExpr,
                             String caveat, boolean optional, List<String> components, String specialty) {
        this.code = code;
        this.synonyms = synonyms;
        this.valueType = valueType;
        this.canonicalUnit = canonicalUnit;
        this.conversions = conversions;
        this.validityDays = validityDays;
        this.flagExpr = flagExpr;
        this.caveat = caveat;
        this.optional = optional;
        this.components = components;
        this.specialty = specialty;
    }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public List<String> getSynonyms() { return synonyms; }
    public void setSynonyms(List<String> synonyms) { this.synonyms = synonyms; }

    public String getValueType() { return valueType; }
    public void setValueType(String valueType) { this.valueType = valueType; }

    public String getCanonicalUnit() { return canonicalUnit; }
    public void setCanonicalUnit(String canonicalUnit) { this.canonicalUnit = canonicalUnit; }

    public Map<String, Object> getConversions() { return conversions; }
    public void setConversions(Map<String, Object> conversions) { this.conversions = conversions; }

    public int getValidityDays() { return validityDays; }
    public void setValidityDays(int validityDays) { this.validityDays = validityDays; }

    public String getFlagExpr() { return flagExpr; }
    public void setFlagExpr(String flagExpr) { this.flagExpr = flagExpr; }

    public String getCaveat() { return caveat; }
    public void setCaveat(String caveat) { this.caveat = caveat; }

    public boolean isOptional() { return optional; }
    public void setOptional(boolean optional) { this.optional = optional; }

    public List<String> getComponents() { return components; }
    public void setComponents(List<String> components) { this.components = components; }

    public String getSpecialty() { return specialty; }
    public void setSpecialty(String specialty) { this.specialty = specialty; }
}
