package com.vitacare.vitacare.Rules;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

public class UnitConverterTest {

    @Test
    void testSameUnitReturnsOriginalValue() {
        Double val = UnitConverter.convert(120.0, "mg/dL", "mg/dL", Map.of("g/L", 100.0));
        assertEquals(120.0, val);
    }

    @Test
    void testFactorConversion() {
        // 1.2 g/L -> 120 mg/dL with factor 100
        Map<String, Object> conv = Map.of("g/L", 100.0, "mmol/L", 18.0);
        Double val1 = UnitConverter.convert(1.2, "g/L", "mg/dL", conv);
        assertEquals(120.0, val1, 0.001);

        // 7.0 mmol/L -> 126 mg/dL
        Double val2 = UnitConverter.convert(7.0, "mmol/L", "mg/dL", conv);
        assertEquals(126.0, val2, 0.001);
    }

    @Test
    void testScaleAndOffsetConversion() {
        // mmol/mol -> %: scale: 0.0915, offset: 2.15
        Map<String, Object> conv = Map.of("mmol/mol", Map.of("scale", 0.0915, "offset", 2.15));
        // 48 mmol/mol = 48 * 0.0915 + 2.15 = 4.392 + 2.15 = 6.542 %
        Double val = UnitConverter.convert(48.0, "mmol/mol", "%", conv);
        assertEquals(6.542, val, 0.001);
    }

    @Test
    void testUnknownUnitReturnsOriginal() {
        Map<String, Object> conv = Map.of("g/L", 100.0);
        Double val = UnitConverter.convert(5.0, "unknown_unit", "mg/dL", conv);
        assertEquals(5.0, val);
    }
}
