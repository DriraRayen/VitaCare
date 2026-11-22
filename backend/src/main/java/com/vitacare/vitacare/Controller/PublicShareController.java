package com.vitacare.vitacare.Controller;

import com.vitacare.vitacare.DTO.SharedPacketDTO;
import com.vitacare.vitacare.Service.ShareService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/public/masar/share")
@CrossOrigin(origins = "http://localhost:3000", exposedHeaders = {"Authorization", "Content-Disposition"})
public class PublicShareController {

    private final ShareService shareService;

    public PublicShareController(ShareService shareService) {
        this.shareService = shareService;
    }

    @GetMapping("/{token}")
    public ResponseEntity<SharedPacketDTO> getSharedPacket(@PathVariable String token) {
        return ResponseEntity.ok(shareService.getSharedPacket(token));
    }
}
