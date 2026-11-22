package com.vitacare.vitacare.Service;

import com.vitacare.vitacare.Model.Document;
import com.vitacare.vitacare.Model.User;
import com.vitacare.vitacare.Repository.DocumentRepository;
import com.vitacare.vitacare.Security.Redactor;
import com.vitacare.vitacare.Service.AI.AiGateway;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.io.File;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class DocumentAnalysisService {
    private static final Map<String, String> LANGUAGES = Map.of("fr", "French", "en", "English", "ar", "Arabic");

    private final DocumentRepository documents;
    private final DocumentTextExtractor extractor;
    private final AiGateway ai;

    public record Result(String summary, String language, boolean excerpt) {}

    @Transactional(readOnly = true)
    public Result saved(User owner, String filename) {
        Document document = documents.findByFilenameAndUserId(filename, owner.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (document.getAnalysisSummary() == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        return result(document);
    }

    @Transactional
    public Result analyse(User owner, String filename, String language) {
        Document document = documents.lockOwnedDocument(filename, owner.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (document.getAnalysisSummary() != null) {
            return result(document);
        }

        String text = extractor.extractText(new File(document.getFilePath()));
        Result result = summarize(owner, text, language);
        document.setAnalysisSummary(result.summary());
        document.setAnalysisLanguage(result.language());
        document.setAnalysisExcerpt(result.excerpt());
        return result;
    }

    public Result summarize(User owner, String text, String language) {
        if (text == null || text.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY);
        }
        String redacted = Redactor.redact(text, owner);
        if (redacted == null || redacted.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY);
        }
        String locale = language != null && LANGUAGES.containsKey(language) ? language : "fr";
        String summary = ai.generateSummary(redacted, LANGUAGES.get(locale));
        if (summary == null || summary.isBlank()) {
            String excerpt = AiGateway.excerpt(redacted);
            int end = excerpt.offsetByCodePoints(0, Math.min(4000, excerpt.codePointCount(0, excerpt.length())));
            return new Result(excerpt.substring(0, end), null, true);
        }
        return new Result(summary, locale, false);
    }

    private Result result(Document document) {
        return new Result(document.getAnalysisSummary(), document.getAnalysisLanguage(),
                Boolean.TRUE.equals(document.getAnalysisExcerpt()));
    }
}
