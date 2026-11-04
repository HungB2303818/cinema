package com.example.cinema.common.config;

import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;
import org.springframework.util.StringUtils;

@Getter
@Setter
@Validated
@ConfigurationProperties(prefix = "app.cloudinary")
public class CloudinaryProperties {
    // No generated toString: credentials must not be logged.
    private String cloudName = "";
    private String apiKey = "";
    private String apiSecret = "";
    @NotBlank
    @Size(max = 100)
    @Pattern(regexp = "[A-Za-z0-9_-]+(/[A-Za-z0-9_-]+)*")
    private String posterFolder = "cinema/posters";
    @Min(1) @Max(120)
    private int timeoutSeconds = 30;

    public boolean isConfigured() {
        return StringUtils.hasText(cloudName) && StringUtils.hasText(apiKey) && StringUtils.hasText(apiSecret);
    }
}
