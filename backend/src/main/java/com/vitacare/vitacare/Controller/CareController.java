package com.vitacare.vitacare.Controller;

import com.vitacare.vitacare.Model.CareConnection;
import com.vitacare.vitacare.Model.CareConnection.Status;
import com.vitacare.vitacare.Model.CareInstruction;
import com.vitacare.vitacare.Model.CareDocumentShare;
import com.vitacare.vitacare.Model.Document;
import com.vitacare.vitacare.Model.User;
import com.vitacare.vitacare.Repository.CareConnectionRepository;
import com.vitacare.vitacare.Repository.CareInstructionRepository;
import com.vitacare.vitacare.Repository.UserRepository;
import com.vitacare.vitacare.Repository.CareDocumentShareRepository;
import com.vitacare.vitacare.Repository.DocumentRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.core.io.Resource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.security.Principal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/care")
@RequiredArgsConstructor
@Transactional
public class CareController {
    private final UserRepository users;
    private final CareConnectionRepository connections;
    private final CareInstructionRepository instructions;
    private final CareDocumentShareRepository shares;
    private final DocumentRepository documents;

    public record Invite(@NotBlank @Email @Size(max = 254) String email) {}
    public record InstructionInput(@NotBlank @Size(max = 160) String title,
                                   @Size(max = 2000) String details, LocalDate dueDate) {}
    public record Completion(@NotNull Boolean done) {}
    public record ShareInput(@NotNull Boolean shared) {}
    public record SharedDocument(Long id, String filename) {}
    public record ConnectionView(Long id, String email, Status status) {}
    public record InstructionView(Long id, Long connectionId, String title, String details,
                                  LocalDate dueDate, boolean done, String contact) {}
    public record Workspace(boolean doctor, List<ConnectionView> connections, List<InstructionView> instructions) {}

    @GetMapping
    @Transactional(readOnly = true)
    public Workspace workspace(Principal principal) {
        User user = currentUser(principal);
        boolean doctor = isDoctor(user);
        var links = connections.findByPatientIdOrDoctorIdOrderByIdDesc(user.getId(), user.getId()).stream()
                .filter(link -> link.getStatus() != Status.CLOSED).toList();
        var accepted = links.stream().filter(link -> link.getStatus() == Status.ACCEPTED).map(CareConnection::getId).toList();
        var tasks = accepted.isEmpty() ? List.<CareInstruction>of() : instructions.findByConnectionIdInOrderByIdDesc(accepted);
        return new Workspace(doctor, links.stream().map(link -> new ConnectionView(link.getId(),
                        contact(link, doctor), link.getStatus())).toList(),
                tasks.stream().map(task -> new InstructionView(task.getId(), task.getConnection().getId(),
                        task.getTitle(), task.getDetails(), task.getDueDate(), task.isDone(),
                        contact(task.getConnection(), doctor))).toList());
    }

    @PostMapping("/connections")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void invite(@Valid @RequestBody Invite input, Principal principal) {
        User patient = currentUser(principal);
        if (isDoctor(patient)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        User doctor = users.findByEmailIgnoreCase(input.email())
                .filter(this::isDoctor).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        var existing = connections.findByPatientIdAndDoctorId(patient.getId(), doctor.getId());
        if (existing.isPresent()) {
            CareConnection link = ownedConnection(existing.get().getId(), patient);
            if (link.getStatus() == Status.CLOSED) {
                link.setStatus(Status.PENDING);
            }
            return;
        }
        CareConnection link = new CareConnection();
        link.setPatient(patient);
        link.setDoctor(doctor);
        try {
            connections.saveAndFlush(link);
        } catch (DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }
    }

    @PostMapping("/connections/{id}/accept")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void accept(@PathVariable Long id, Principal principal) {
        User doctor = currentUser(principal);
        CareConnection link = ownedConnection(id, doctor);
        if (!isDoctor(doctor)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        if (link.getStatus() != Status.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }
        link.setStatus(Status.ACCEPTED);
    }

    @DeleteMapping("/connections/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void disconnect(@PathVariable Long id, Principal principal) {
        ownedConnection(id, currentUser(principal)).setStatus(Status.CLOSED);
        shares.deleteByConnectionId(id);
    }

    @GetMapping("/connections/{id}/documents")
    public List<SharedDocument> sharedDocuments(@PathVariable Long id, Principal principal) {
        acceptedConnection(id, currentUser(principal));
        return shares.findByConnectionIdOrderByIdDesc(id).stream()
                .map(share -> new SharedDocument(share.getDocument().getId(), share.getDocument().getFilename()))
                .toList();
    }

    @PutMapping("/connections/{id}/documents/{documentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void share(@PathVariable Long id, @PathVariable Long documentId,
                      @Valid @RequestBody ShareInput input, Principal principal) {
        User patient = currentUser(principal);
        CareConnection link = acceptedConnection(id, patient);
        if (isDoctor(patient)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        Document document = documents.findByIdAndUserId(documentId, patient.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        var existing = shares.findByConnectionIdAndDocumentId(id, documentId);
        if (!input.shared()) {
            existing.ifPresent(shares::delete);
        } else if (existing.isEmpty()) {
            CareDocumentShare share = new CareDocumentShare();
            share.setConnection(link);
            share.setDocument(document);
            shares.save(share);
        }
    }

    @GetMapping("/connections/{id}/documents/{documentId}")
    public ResponseEntity<Resource> download(@PathVariable Long id, @PathVariable Long documentId, Principal principal) {
        acceptedConnection(id, currentUser(principal));
        Document document = shares.findByConnectionIdAndDocumentId(id, documentId)
                .map(CareDocumentShare::getDocument)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        Resource resource = new FileSystemResource(document.getFilePath());
        if (!resource.isReadable()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body(resource);
    }

    @PostMapping("/connections/{id}/instructions")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void addInstruction(@PathVariable Long id, @Valid @RequestBody InstructionInput input, Principal principal) {
        User doctor = currentUser(principal);
        CareConnection link = acceptedConnection(id, doctor);
        if (!isDoctor(doctor)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        CareInstruction task = new CareInstruction();
        task.setConnection(link);
        task.setTitle(input.title().strip());
        task.setDetails(input.details());
        task.setDueDate(input.dueDate());
        instructions.save(task);
    }

    @PutMapping("/connections/{id}/instructions/{instructionId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void complete(@PathVariable Long id, @PathVariable Long instructionId,
                         @Valid @RequestBody Completion input, Principal principal) {
        User patient = currentUser(principal);
        acceptedConnection(id, patient);
        if (isDoctor(patient)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        CareInstruction task = instructions.findByIdAndConnectionId(instructionId, id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        task.setDone(input.done());
    }

    private CareConnection acceptedConnection(Long id, User user) {
        CareConnection link = ownedConnection(id, user);
        if (link.getStatus() != Status.ACCEPTED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }
        return link;
    }

    private CareConnection ownedConnection(Long id, User user) {
        return connections.lockById(id)
                .filter(link -> (isDoctor(user) ? link.getDoctor() : link.getPatient()).getId().equals(user.getId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    private User currentUser(Principal principal) {
        return users.findByEmail(principal.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }

    private boolean isDoctor(User user) {
        return user.getRole() == User.Role.ROLE_DOCTOR || user.getRole() == User.Role.ROLE_CARE_DOCTOR;
    }

    private String contact(CareConnection link, boolean doctor) {
        return (doctor ? link.getPatient() : link.getDoctor()).getEmail();
    }
}
