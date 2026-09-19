package com.dearlove.model;

import java.time.LocalDateTime;

public class Letter {
    private String id;
    private String title;
    private String body;
    private double lat;
    private double lng;
    private int radius;
    private String placeLabel;
    private String ownerToken;
    private String username;
    private String recipientUsername;
    private LocalDateTime createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }

    public double getLat() { return lat; }
    public void setLat(double lat) { this.lat = lat; }

    public double getLng() { return lng; }
    public void setLng(double lng) { this.lng = lng; }

    public int getRadius() { return radius; }
    public void setRadius(int radius) { this.radius = radius; }

    public String getPlaceLabel() { return placeLabel; }
    public void setPlaceLabel(String placeLabel) { this.placeLabel = placeLabel; }

    public String getOwnerToken() { return ownerToken; }
    public void setOwnerToken(String ownerToken) { this.ownerToken = ownerToken; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getRecipientUsername() { return recipientUsername; }
    public void setRecipientUsername(String recipientUsername) { this.recipientUsername = recipientUsername; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
