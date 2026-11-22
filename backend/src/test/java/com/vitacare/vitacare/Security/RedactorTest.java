package com.vitacare.vitacare.Security;

import com.vitacare.vitacare.Model.User;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class RedactorTest {

    @Test
    void testRedactPatientProfileNameAndContact() {
        User user = new User();
        user.setFirstName("Mohamed");
        user.setLastName("Ben Salah");
        user.setEmail("mohamed.bensalah@email.com");
        user.setPhoneNumber("+216 98 123 456");

        String document = """
                Laboratoire d'analyses médicales
                Patient : Mohamed Ben Salah
                Email de contact : mohamed.bensalah@email.com
                Tel : +216 98 123 456
                Glycémie à jeun : 1.15 g/L
                Date : 2026-10-15
                """;

        String redacted = Redactor.redact(document, user);

        assertFalse(redacted.contains("Mohamed"));
        assertFalse(redacted.contains("Ben Salah"));
        assertFalse(redacted.contains("mohamed.bensalah@email.com"));
        assertFalse(redacted.contains("98 123 456"));

        assertTrue(redacted.contains("[PATIENT_NAME]"));
        assertTrue(redacted.contains("[EMAIL]"));
        assertTrue(redacted.contains("[PHONE]"));
        // Medical data must remain intact!
        assertTrue(redacted.contains("Glycémie à jeun : 1.15 g/L"));
        assertTrue(redacted.contains("2026-10-15"));
    }

    @Test
    void testRedactCinAndAddress() {
        String document = """
                Clinique Les Oliviers
                CIN : 08765432
                Adresse : 12 Avenue Habib Bourguiba Tunis
                HbA1c : 6.8 %
                """;

        String redacted = Redactor.redact(document, null);

        assertFalse(redacted.contains("08765432"));
        assertFalse(redacted.contains("12 Avenue Habib Bourguiba Tunis"));
        assertTrue(redacted.contains("[ID_CIN]"));
        assertTrue(redacted.contains("[ADDRESS]"));
        assertTrue(redacted.contains("HbA1c : 6.8 %"));
    }

    @Test
    void testRedactGeneralEmailsAndPhonesWithoutProfile() {
        String document = """
                Médecin traitant : Dr Martin
                Contact : dr.martin@hospital.fr ou +33 1 42 68 55 00
                Créatinine : 9.5 mg/L
                """;

        String redacted = Redactor.redact(document, null);

        assertFalse(redacted.contains("dr.martin@hospital.fr"));
        assertTrue(redacted.contains("[EMAIL]"));
        assertTrue(redacted.contains("[PHONE]"));
        assertTrue(redacted.contains("Créatinine : 9.5 mg/L"));
    }
}
