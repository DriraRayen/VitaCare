package com.vitacare.vitacare.Service;

import com.vitacare.vitacare.Model.Document;
import com.vitacare.vitacare.Model.User;
import com.vitacare.vitacare.Repository.DocumentRepository;
import com.vitacare.vitacare.Service.AI.AiGateway;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.io.File;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class DocumentAnalysisServiceTest {
    private final DocumentRepository documents = mock(DocumentRepository.class);
    private final DocumentTextExtractor extractor = mock(DocumentTextExtractor.class);
    private final AiGateway ai = mock(AiGateway.class);
    private final DocumentAnalysisService service = new DocumentAnalysisService(documents, extractor, ai);

    @Test
    void generatedAnalysisIsReusedAndCanBeReadSeparately() {
        User owner = owner(1L);
        Document document = new Document("report.txt", "text/plain", 10L, "report.txt", owner);
        when(documents.lockOwnedDocument("report.txt", 1L)).thenReturn(Optional.of(document));
        when(documents.findByFilenameAndUserId("report.txt", 1L)).thenReturn(Optional.of(document));
        when(extractor.extractText(new File("report.txt"))).thenReturn("source");
        when(ai.generateSummary("source", "Arabic")).thenReturn("Summary");

        var first = service.analyse(owner, "report.txt", "ar");
        assertEquals(new DocumentAnalysisService.Result("Summary", "ar", false), first);
        assertEquals(first, service.saved(owner, "report.txt"));
        assertEquals(first, service.analyse(owner, "report.txt", "en"));
        verify(ai).generateSummary("source", "Arabic");
        verifyNoMoreInteractions(ai);
    }

    @Test
    void unreadableDocumentDoesNotAcquireASavedResult() {
        User owner = owner(1L);
        Document document = new Document("scan.pdf", "application/pdf", 10L, "scan.pdf", owner);
        when(documents.lockOwnedDocument("scan.pdf", 1L)).thenReturn(Optional.of(document));
        when(extractor.extractText(new File("scan.pdf"))).thenReturn("");

        var failure = assertThrows(ResponseStatusException.class, () -> service.analyse(owner, "scan.pdf", "fr"));
        assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, failure.getStatusCode());
        assertNull(document.getAnalysisSummary());
        verifyNoInteractions(ai);
    }

    @Test
    void anotherAccountCannotReadOrRunAnalysis() {
        User other = owner(2L);
        assertEquals(HttpStatus.NOT_FOUND,
                assertThrows(ResponseStatusException.class, () -> service.saved(other, "report.txt")).getStatusCode());
        assertEquals(HttpStatus.NOT_FOUND,
                assertThrows(ResponseStatusException.class, () -> service.analyse(other, "report.txt", "fr")).getStatusCode());
        verifyNoInteractions(extractor, ai);
    }

    private User owner(Long id) {
        User owner = new User();
        owner.setId(id);
        return owner;
    }
}
