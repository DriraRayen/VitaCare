package com.vitacare.vitacare.Service;

import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import com.vitacare.vitacare.Model.CaseResult;
import com.vitacare.vitacare.Model.DiagnosticCase;
import com.vitacare.vitacare.Model.User;
import com.vitacare.vitacare.Rules.MasarRulesEngine;
import com.vitacare.vitacare.Rules.RulesEvaluationOutput;
import com.vitacare.vitacare.Rules.TestEvaluationResult;
import com.vitacare.vitacare.Rules.TestStatus;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.Period;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class ReferralPacketPdfService {

    private static final Color PRIMARY_COLOR = new Color(26, 139, 183);
    private static final Color SUCCESS_COLOR = new Color(39, 174, 96);
    private static final Color WARNING_COLOR = new Color(230, 126, 34);
    private static final Color DANGER_COLOR = new Color(192, 57, 43);
    private static final Color BG_LIGHT = new Color(248, 250, 252);
    private static final Color BORDER_COLOR = new Color(227, 232, 239);

    public byte[] generateReferralPacketPdf(DiagnosticCase dc, RulesEvaluationOutput eval, String specialistQuestion) throws DocumentException {
        User user = dc.getUser();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4, 36, 36, 40, 40);
        PdfWriter writer = PdfWriter.getInstance(document, out);

        document.open();

        // 1. Header with Title & Logo text
        Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, PRIMARY_COLOR);
        Font subtitleFont = FontFactory.getFont(FontFactory.HELVETICA, 10, Color.DARK_GRAY);
        Font boldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.BLACK);
        Font textFont = FontFactory.getFont(FontFactory.HELVETICA, 10, Color.BLACK);
        Font sectionFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, PRIMARY_COLOR);
        Font footerFont = FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 8, Color.GRAY);

        Paragraph header = new Paragraph();
        header.add(new Chunk("VitaCare - Dossier d'Orientation Médicale (Masar)\n", titleFont));
        header.add(new Chunk("Synthèse structurée pour la première consultation spécialisée\n", subtitleFont));
        header.add(new Chunk("Date d'édition : " + LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) + "\n\n", subtitleFont));
        document.add(header);

        // 2. Patient Profile Box
        PdfPTable profileTable = new PdfPTable(2);
        profileTable.setWidthPercentage(100);
        profileTable.setSpacingAfter(15);

        String fullName = ((user.getFirstName() != null ? user.getFirstName() + " " : "")
                + (user.getLastName() != null ? user.getLastName() : "")).trim();
        if (fullName.isBlank()) fullName = user.getEmail();

        String ageStr = "Non renseigné";
        if (user.getDateOfBirth() != null) {
            int age = Period.between(user.getDateOfBirth(), LocalDate.now()).getYears();
            ageStr = age + " ans (" + user.getDateOfBirth().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) + ")";
        }

        PdfPCell pCell1 = new PdfPCell();
        pCell1.setBackgroundColor(BG_LIGHT);
        pCell1.setBorderColor(BORDER_COLOR);
        pCell1.setPadding(8);
        pCell1.addElement(new Paragraph("Informations Patient", sectionFont));
        pCell1.addElement(new Paragraph("Nom / Prénom : " + fullName, textFont));
        pCell1.addElement(new Paragraph("Âge : " + ageStr, textFont));
        pCell1.addElement(new Paragraph("Groupe Sanguin : " + (user.getBloodType() != null ? user.getBloodType() : "Non renseigné"), textFont));

        PdfPCell pCell2 = new PdfPCell();
        pCell2.setBackgroundColor(BG_LIGHT);
        pCell2.setBorderColor(BORDER_COLOR);
        pCell2.setPadding(8);
        pCell2.addElement(new Paragraph("Antécédents & Terrain", sectionFont));
        pCell2.addElement(new Paragraph("Allergies : " + (user.getAllergies() != null && !user.getAllergies().isBlank() ? user.getAllergies() : "Aucune signalée"), textFont));
        pCell2.addElement(new Paragraph("Maladies chroniques : " + (user.getChronicConditions() != null && !user.getChronicConditions().isBlank() ? user.getChronicConditions() : "Aucune"), textFont));
        pCell2.addElement(new Paragraph("Traitements en cours : " + (user.getMedications() != null && !user.getMedications().isBlank() ? user.getMedications() : "Aucun"), textFont));

        profileTable.addCell(pCell1);
        profileTable.addCell(pCell2);
        document.add(profileTable);

        // 3. Motif de Consultation & Parcours
        Paragraph motifPara = new Paragraph();
        motifPara.add(new Chunk("Motif de consultation & Parcours clinique\n", sectionFont));
        motifPara.add(new Chunk("Parcours ciblé : ", boldFont));
        motifPara.add(new Chunk(eval.getChecklistTitle() + "\n", textFont));
        motifPara.add(new Chunk("Plainte / Symptômes décrits : ", boldFont));
        motifPara.add(new Chunk(dc.getComplaint() + "\n\n", textFont));
        document.add(motifPara);

        // 4. Checklist Results Table (Done vs Expired vs Missing)
        Paragraph tableTitle = new Paragraph("État des examens requis\n", sectionFont);
        tableTitle.setSpacingAfter(6);
        document.add(tableTitle);

        PdfPTable resultsTable = new PdfPTable(4);
        resultsTable.setWidthPercentage(100);
        resultsTable.setWidths(new float[]{30, 25, 20, 25});
        resultsTable.setSpacingAfter(15);

        // Header cells
        for (String col : List.of("Examen", "Valeur / Rapport", "Statut", "Dernière date / Raison")) {
            PdfPCell c = new PdfPCell(new Phrase(col, boldFont));
            c.setBackgroundColor(BORDER_COLOR);
            c.setPadding(6);
            resultsTable.addCell(c);
        }

        for (TestEvaluationResult res : eval.getTestResults()) {
            resultsTable.addCell(new Phrase(res.getCode(), textFont));

            String valDisplay = "-";
            if (res.getCanonicalValue() != null) {
                valDisplay = String.format("%.2f %s", res.getCanonicalValue(), res.getCanonicalUnit() != null ? res.getCanonicalUnit() : "");
            } else if (res.getReportText() != null && !res.getReportText().isBlank()) {
                valDisplay = res.getReportText().length() > 30 ? res.getReportText().substring(0, 30) + "..." : res.getReportText();
            }
            resultsTable.addCell(new Phrase(valDisplay, textFont));

            Font statusFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9);
            String statusText = res.getStatus().name();
            if (res.getStatus() == TestStatus.DONE_VALID) {
                statusFont.setColor(SUCCESS_COLOR);
                statusText = "VALIDE (À ne pas refaire)";
            } else if (res.getStatus() == TestStatus.EXPIRED) {
                statusFont.setColor(WARNING_COLOR);
                statusText = "EXPIRÉ (À renouveler)";
            } else {
                statusFont.setColor(DANGER_COLOR);
                statusText = "MANQUANT";
            }
            resultsTable.addCell(new Phrase(statusText, statusFont));

            String dateStr = res.getResultDate() != null ? res.getResultDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) : "Non fait";
            resultsTable.addCell(new Phrase(dateStr + "\n" + (res.getReason() != null ? res.getReason() : ""), textFont));
        }

        document.add(resultsTable);

        // 5. Tests to Request Together Box
        if (eval.getTestsToRequestTogether() != null && !eval.getTestsToRequestTogether().isEmpty()) {
            PdfPTable groupTable = new PdfPTable(1);
            groupTable.setWidthPercentage(100);
            groupTable.setSpacingAfter(15);

            PdfPCell gCell = new PdfPCell();
            gCell.setBackgroundColor(new Color(254, 249, 231));
            gCell.setBorderColor(new Color(243, 156, 18));
            gCell.setPadding(8);

            Paragraph gTitle = new Paragraph("Examens à regrouper lors de la prochaine prescription :\n", boldFont);
            gCell.addElement(gTitle);

            eval.getTestsToRequestTogether().forEach((specialty, tests) -> {
                Paragraph spPara = new Paragraph("• " + specialty + " : " + String.join(", ", tests), textFont);
                gCell.addElement(spPara);
            });

            groupTable.addCell(gCell);
            document.add(groupTable);
        }

        // 6. Specialist Question Section
        Paragraph questionTitle = new Paragraph("Question ou précision pour le médecin spécialiste :\n", sectionFont);
        document.add(questionTitle);

        PdfPTable qTable = new PdfPTable(1);
        qTable.setWidthPercentage(100);
        qTable.setSpacingAfter(15);

        PdfPCell qCell = new PdfPCell();
        qCell.setMinimumHeight(50);
        qCell.setBorderColor(BORDER_COLOR);
        qCell.setPadding(8);
        String qText = (specialistQuestion != null && !specialistQuestion.isBlank())
                ? specialistQuestion
                : "Espace réservé aux questions du patient ou remarques du médecin traitant : \n___________________________________________________________________________________\n___________________________________________________________________________________";
        qCell.addElement(new Paragraph(qText, textFont));
        qTable.addCell(qCell);
        document.add(qTable);

        // 7. Legal Disclaimer Footer
        Paragraph footer = new Paragraph();
        footer.add(new Chunk("Généré à partir de documents fournis par le patient. Liste suggérée, à confirmer par le médecin traitant.\n", footerFont));
        footer.add(new Chunk("VitaCare Masar - Aide à l'orientation diagnostique - Ne remplace pas la consultation médicale.", footerFont));
        document.add(footer);

        document.close();
        return out.toByteArray();
    }
}
