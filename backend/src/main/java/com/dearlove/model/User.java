package com.dearlove.model;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class User {
    private String username;
    private String passwordHash;
    private String partnerUsername;
    private LocalDate relationshipStartDate;
    private LocalDateTime createdAt;

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }

    public String getPartnerUsername() { return partnerUsername; }
    public void setPartnerUsername(String partnerUsername) { this.partnerUsername = partnerUsername; }

    public LocalDate getRelationshipStartDate() { return relationshipStartDate; }
    public void setRelationshipStartDate(LocalDate relationshipStartDate) { this.relationshipStartDate = relationshipStartDate; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
