package com.vitacare.vitacare.Service;

import net.sourceforge.tess4j.Tesseract;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.util.Locale;

@Service
public class DocumentTextExtractor {

    public String extractText(File file) {
        if (file == null || !file.exists()) {
            return "";
        }

        String fileName = file.getName().toLowerCase(Locale.ROOT);

        if (fileName.endsWith(".txt")) {
            try {
                return Files.readString(file.toPath());
            } catch (IOException e) {
                return "";
            }
        }
        if (fileName.endsWith(".pdf")) {
            String pdfText = extractTextFromPdf(file);
            if (pdfText != null && !pdfText.trim().isEmpty()) {
                return pdfText;
            }
            // Scanned PDF fallback to OCR
            return tryOcr(file);
        } else if (fileName.endsWith(".png") || fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")) {
            return tryOcr(file);
        }

        return "";
    }

    private String extractTextFromPdf(File file) {
        try (PDDocument document = Loader.loadPDF(file)) {
            PDFTextStripper stripper = new PDFTextStripper();
            return stripper.getText(document);
        } catch (Exception e) {
            System.err.println("PDFBox extraction error: " + e.getMessage());
            return "";
        }
    }

    private String tryOcr(File file) {
        try {
            Tesseract tesseract = new Tesseract();
            tesseract.setLanguage("fra+eng");
            return tesseract.doOCR(file);
        } catch (Throwable t) {
            // Tess4J requires native tesseract binaries. Graceful degradation if absent.
            System.err.println("OCR unavailable or failed: " + t.getMessage());
            return "";
        }
    }
}
