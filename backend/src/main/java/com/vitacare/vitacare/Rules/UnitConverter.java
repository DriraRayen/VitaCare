package com.vitacare.vitacare.Rules;

import java.util.Map;

public class UnitConverter {

    /**
     * Converts a numeric value to the test's canonical unit based on conversions map.
     * Conversions can be:
     * - A direct factor Number: value * factor (e.g. g/L -> mg/dL: 100)
     * - A scale & offset Map: value * scale + offset (e.g. mmol/mol -> %: scale=0.0915, offset=2.15)
     */
    @SuppressWarnings("unchecked")
    public static Double convert(Double value, String fromUnit, String canonicalUnit, Map<String, Object> conversions) {
        if (value == null) return null;
        if (fromUnit == null || fromUnit.isBlank() || canonicalUnit == null) return value;

        String normFrom = fromUnit.trim().toLowerCase();
        String normCanonical = canonicalUnit.trim().toLowerCase();

        if (normFrom.equals(normCanonical)) {
            return value;
        }

        if (conversions == null || conversions.isEmpty()) {
            return value;
        }

        for (Map.Entry<String, Object> entry : conversions.entrySet()) {
            String targetKey = entry.getKey().trim().toLowerCase();
            if (targetKey.equals(normFrom)) {
                Object convRule = entry.getValue();
                if (convRule instanceof Number number) {
                    return value * number.doubleValue();
                } else if (convRule instanceof Map<?, ?> map) {
                    Object scaleObj = map.get("scale");
                    Object offsetObj = map.get("offset");
                    double scale = scaleObj instanceof Number n ? n.doubleValue() : 1.0;
                    double offset = offsetObj instanceof Number n ? n.doubleValue() : 0.0;
                    return value * scale + offset;
                }
            }
        }

        return value;
    }
}
