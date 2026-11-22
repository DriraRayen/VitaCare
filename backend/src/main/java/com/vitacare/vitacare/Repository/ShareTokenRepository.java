package com.vitacare.vitacare.Repository;

import com.vitacare.vitacare.Model.ShareToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ShareTokenRepository extends JpaRepository<ShareToken, Long> {
    Optional<ShareToken> findByTokenHash(String tokenHash);
}
