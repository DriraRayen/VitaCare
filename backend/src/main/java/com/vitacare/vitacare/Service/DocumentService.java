package com.vitacare.vitacare.Service;

import com.vitacare.vitacare.DTO.DTOMapper;
import com.vitacare.vitacare.DTO.DocumentDTO;
import com.vitacare.vitacare.Model.Document;
import com.vitacare.vitacare.Model.Tag;
import com.vitacare.vitacare.Model.User;
import com.vitacare.vitacare.Repository.DocumentRepository;
import com.vitacare.vitacare.Repository.TagRepository;
import com.vitacare.vitacare.Repository.CaseResultRepository;
import com.vitacare.vitacare.Repository.CareDocumentShareRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class DocumentService {
    private static final Logger LOG = LoggerFactory.getLogger(DocumentService.class);

    private final DocumentRepository documentRepository;
    private final TagRepository tagRepository;
    private final CaseResultRepository caseResults;
    private final CareDocumentShareRepository shares;
    private final DTOMapper dtoMapper;
    private final Path uploadDir = Paths.get("uploads");

    public DocumentService(DocumentRepository documentRepository, TagRepository tagRepository, 
                          CaseResultRepository caseResults, CareDocumentShareRepository shares,
                          DTOMapper dtoMapper) throws IOException {
        this.documentRepository = documentRepository;
        this.tagRepository = tagRepository;
        this.caseResults = caseResults;
        this.shares = shares;
        this.dtoMapper = dtoMapper;
        if (!Files.exists(uploadDir)) {
            Files.createDirectories(uploadDir);
        }
    }

    // Upload a file and associate with a user
    @Transactional(rollbackFor = IOException.class)
    public Document uploadFile(MultipartFile file, User user) throws IOException {
        String original = file.getOriginalFilename();
        if (file.isEmpty() || original == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        }
        String basename = original.replace('\\', '/');
        basename = basename.substring(basename.lastIndexOf('/') + 1);
        if (basename.isBlank() || basename.length() > 200) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        }
        String filename = UUID.randomUUID() + "_" + basename;
        Path filePath = uploadDir.resolve(filename);
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status == STATUS_ROLLED_BACK) removeFile(filePath);
            }
        });
        file.transferTo(filePath);

        Document document = new Document();
        document.setFilename(filename);
        document.setFileType(file.getContentType());
        document.setFileSize(file.getSize());
        document.setFilePath(filePath.toString());
        document.setUser(user);
        document.setUploadedAt(LocalDateTime.now());

        return documentRepository.save(document);
    }

    // List documents for a specific user
    public List<Document> getDocumentsByUser(User user) {
        return documentRepository.findByUserId(user.getId());
    }

    // Delete a document, only if it belongs to the user
    public void deleteDocument(User user, String filename) {
        Document doc = documentRepository.lockOwnedDocument(filename, user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        Path filePath = Paths.get(doc.getFilePath());
        new ArrayList<>(doc.getTags()).forEach(tag -> tag.removeDocument(doc));
        caseResults.detachDocument(doc.getId());
        shares.deleteByDocumentId(doc.getId());
        documentRepository.delete(doc);
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                removeFile(filePath);
            }
        });
    }

    private void removeFile(Path filePath) {
        try {
            Files.deleteIfExists(filePath);
        } catch (IOException e) {
            LOG.warn("Could not clean up stored document file", e);
        }
    }

    // Get a file resource for download
    public Path getDocumentPath(User user, String filename) {
        Document doc = documentRepository.findByFilenameAndUserId(filename, user.getId())
                .orElseThrow(() -> new RuntimeException("Document not found or access denied"));

        return Paths.get(doc.getFilePath());
    }

    // Get documents as DTOs (includes tag information)
    public List<DocumentDTO> getDocumentDTOsByUser(User user) {
        List<Document> documents = documentRepository.findByUserId(user.getId());
        return documents.stream()
                .map(dtoMapper::toDocumentDTO)
                .collect(Collectors.toList());
    }

    // Update document tags
    public DocumentDTO updateDocumentTags(User user, String filename, List<String> tagNames) {
        Document document = documentRepository.lockOwnedDocument(filename, user.getId())
                .orElseThrow(() -> new RuntimeException("Document not found or access denied"));

        // Clear existing tags
        new ArrayList<>(document.getTags()).forEach(tag -> tag.removeDocument(document));

        // Add new tags (create if they don't exist)
        if (tagNames != null && !tagNames.isEmpty()) {
            for (String tagName : tagNames) {
                Tag tag = tagRepository.findByNameAndUser(tagName, user)
                        .orElseGet(() -> {
                            // Create new tag if it doesn't exist
                            Tag newTag = new Tag();
                            newTag.setName(tagName);
                            newTag.setDescription("Auto-generated tag");
                            newTag.setColor(generateRandomColor());
                            newTag.setUser(user);
                            return tagRepository.save(newTag);
                        });
                
                tag.addDocument(document);
            }
        }

        documentRepository.save(document);
        return dtoMapper.toDocumentDTO(document);
    }

    // Get document by filename with tag information
    public DocumentDTO getDocumentDTOByFilename(User user, String filename) {
        Document document = documentRepository.findByFilenameAndUserId(filename, user.getId())
                .orElseThrow(() -> new RuntimeException("Document not found or access denied"));
        return dtoMapper.toDocumentDTO(document);
    }

    // Helper method to generate random colors for tags
    private String generateRandomColor() {
        String[] colors = {
            "#1ABC9C", "#3498DB", "#9B59B6", "#E74C3C", "#F39C12",
            "#16A085", "#2980B9", "#8E44AD", "#C0392B", "#D68910",
            "#27AE60", "#2C3E50", "#E67E22", "#95A5A6", "#34495E"
        };
        int randomIndex = (int) (Math.random() * colors.length);
        return colors[randomIndex];
    }
}
