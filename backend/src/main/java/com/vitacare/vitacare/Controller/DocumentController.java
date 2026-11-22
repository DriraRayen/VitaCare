package com.vitacare.vitacare.Controller;

import com.vitacare.vitacare.DTO.DocumentDTO;
import com.vitacare.vitacare.Model.Document;
import com.vitacare.vitacare.Model.User;
import com.vitacare.vitacare.Repository.UserRepository;
import com.vitacare.vitacare.Service.DocumentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ContentDisposition;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import com.vitacare.vitacare.Service.DocumentAnalysisService;
import java.nio.file.Path;
import java.nio.charset.StandardCharsets;
import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/documents")
@CrossOrigin(origins = "http://localhost:3000", allowCredentials = "true")
public class DocumentController {

    @Autowired
    private DocumentService documentService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DocumentAnalysisService analysis;

    // Example method to get the current user
    private User getCurrentUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }

    // Upload a file for current user
    @PostMapping("/upload")
    public ResponseEntity<String> uploadFile(@RequestParam("file") MultipartFile file,
                                             Principal principal) throws Exception {
        User user = getCurrentUser(principal.getName());
        Document doc = documentService.uploadFile(file, user);
        return ResponseEntity.ok(doc.getFilename());
    }

    // List documents of the current user (with tags)
    @GetMapping
    public ResponseEntity<List<DocumentDTO>> getUserDocuments(Principal principal) {
        User user = getCurrentUser(principal.getName());
        List<DocumentDTO> docs = documentService.getDocumentDTOsByUser(user);
        return ResponseEntity.ok(docs);
    }

    // Download a document (only if belongs to user)
    @GetMapping("/uploads/{filename:.+}")
    public ResponseEntity<Resource> getFile(@PathVariable String filename,
                                            Principal principal) throws Exception {
        User user = getCurrentUser(principal.getName());
        Path filePath = documentService.getDocumentPath(user, filename);
        Resource resource = new UrlResource(filePath.toUri());
        if (!resource.isReadable()) throw new ResponseStatusException(HttpStatus.NOT_FOUND);

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.inline()
                        .filename(resource.getFilename(), StandardCharsets.UTF_8).build().toString())
                .body(resource);
    }

    // Delete a document
    @DeleteMapping("/{filename:.+}")
    public ResponseEntity<Void> deleteFile(@PathVariable String filename,
                                           Principal principal) throws Exception {
        User user = getCurrentUser(principal.getName());
        documentService.deleteDocument(user, filename);
        return ResponseEntity.ok().build();
    }

    // Update document tags
    @PutMapping("/{filename:.+}/tags")
    public ResponseEntity<DocumentDTO> updateDocumentTags(
            @PathVariable String filename,
            Principal principal,
            @RequestBody Map<String, List<String>> request) {
        try {
            User user = getCurrentUser(principal.getName());
            List<String> tags = request.get("tags");
            DocumentDTO updatedDoc = documentService.updateDocumentTags(user, filename, tags);
            return ResponseEntity.ok(updatedDoc);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // Get document with tags
    @GetMapping("/{filename:.+}/details")
    public ResponseEntity<DocumentDTO> getDocumentDetails(
            @PathVariable String filename,
            Principal principal) {
        try {
            User user = getCurrentUser(principal.getName());
            DocumentDTO doc = documentService.getDocumentDTOByFilename(user, filename);
            return ResponseEntity.ok(doc);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/analyse/{filename:.+}")
    public DocumentAnalysisService.Result getAnalysis(@PathVariable String filename, Principal principal) {
        return analysis.saved(getCurrentUser(principal.getName()), filename);
    }

    @PostMapping("/analyse/{filename:.+}")
    public DocumentAnalysisService.Result analyseDocument(@PathVariable String filename,
            @RequestParam(defaultValue = "fr") String language, Principal principal) {
        return analysis.analyse(getCurrentUser(principal.getName()), filename, language);
    }

    @PostMapping("/analysis/summarize")
    public DocumentAnalysisService.Result summarize(@RequestBody Map<String, String> payload, Principal principal) {
        return analysis.summarize(getCurrentUser(principal.getName()), payload.get("text"), payload.get("language"));
    }
}
