-- QR Gen Database Initialization
-- URL Shortening Service with HTTP Referrer Tracking

-- Enable UUID extension for generating unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: shortened_urls
-- Stores URL shortening mappings
CREATE TABLE IF NOT EXISTS shortened_urls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    short_code VARCHAR(20) UNIQUE NOT NULL,
    original_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'::JSONB,
    CONSTRAINT short_code_format CHECK (short_code ~ '^[a-zA-Z0-9_-]+$')
);

-- Table: url_visits
-- Records each visit to a shortened URL with referrer information
CREATE TABLE IF NOT EXISTS url_visits (
    id BIGSERIAL PRIMARY KEY,
    short_code VARCHAR(20) NOT NULL,
    visited_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    referrer TEXT,
    referrer_domain VARCHAR(255),
    user_agent TEXT,
    ip_address INET,
    country_code VARCHAR(2),
    city VARCHAR(100),
    device_type VARCHAR(50),
    browser VARCHAR(100),
    os VARCHAR(100),
    CONSTRAINT fk_short_code 
        FOREIGN KEY (short_code) 
        REFERENCES shortened_urls(short_code)
        ON DELETE CASCADE
);

-- Table: referrer_stats
-- Aggregated statistics for referrer analysis
CREATE TABLE IF NOT EXISTS referrer_stats (
    id BIGSERIAL PRIMARY KEY,
    short_code VARCHAR(20) NOT NULL,
    referrer_domain VARCHAR(255),
    visit_count INTEGER DEFAULT 1,
    first_visit TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_visit TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_referrer_short_code 
        FOREIGN KEY (short_code) 
        REFERENCES shortened_urls(short_code)
        ON DELETE CASCADE,
    CONSTRAINT unique_short_referrer 
        UNIQUE (short_code, referrer_domain)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_shortened_urls_short_code ON shortened_urls(short_code);
CREATE INDEX IF NOT EXISTS idx_shortened_urls_created_at ON shortened_urls(created_at);
CREATE INDEX IF NOT EXISTS idx_shortened_urls_is_active ON shortened_urls(is_active);

CREATE INDEX IF NOT EXISTS idx_url_visits_short_code ON url_visits(short_code);
CREATE INDEX IF NOT EXISTS idx_url_visits_visited_at ON url_visits(visited_at);
CREATE INDEX IF NOT EXISTS idx_url_visits_referrer_domain ON url_visits(referrer_domain);
CREATE INDEX IF NOT EXISTS idx_url_visits_ip_address ON url_visits(ip_address);

CREATE INDEX IF NOT EXISTS idx_referrer_stats_short_code ON referrer_stats(short_code);
CREATE INDEX IF NOT EXISTS idx_referrer_stats_referrer_domain ON referrer_stats(referrer_domain);
CREATE INDEX IF NOT EXISTS idx_referrer_stats_visit_count ON referrer_stats(visit_count DESC);

-- Function: Update referrer stats on new visit
CREATE OR REPLACE FUNCTION update_referrer_stats()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO referrer_stats (short_code, referrer_domain, visit_count, first_visit, last_visit)
    VALUES (NEW.short_code, NEW.referrer_domain, 1, NEW.visited_at, NEW.visited_at)
    ON CONFLICT (short_code, referrer_domain)
    DO UPDATE SET
        visit_count = referrer_stats.visit_count + 1,
        last_visit = NEW.visited_at;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Automatically update referrer_stats when a visit is recorded
CREATE TRIGGER trigger_update_referrer_stats
    AFTER INSERT ON url_visits
    FOR EACH ROW
    EXECUTE FUNCTION update_referrer_stats();

-- Function: Clean up expired URLs
CREATE OR REPLACE FUNCTION cleanup_expired_urls()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM shortened_urls
    WHERE expires_at IS NOT NULL 
    AND expires_at < CURRENT_TIMESTAMP
    AND is_active = TRUE;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- View: Popular URLs by visit count
CREATE OR REPLACE VIEW popular_urls AS
SELECT 
    su.short_code,
    su.original_url,
    COUNT(uv.id) as total_visits,
    COUNT(DISTINCT uv.referrer_domain) as unique_referrers,
    MAX(uv.visited_at) as last_visit,
    su.created_at
FROM shortened_urls su
LEFT JOIN url_visits uv ON su.short_code = uv.short_code
WHERE su.is_active = TRUE
GROUP BY su.short_code, su.original_url, su.created_at
ORDER BY total_visits DESC;

-- View: Top referrers across all URLs
CREATE OR REPLACE VIEW top_referrers AS
SELECT 
    referrer_domain,
    SUM(visit_count) as total_visits,
    COUNT(DISTINCT short_code) as urls_referred,
    MAX(last_visit) as last_visit
FROM referrer_stats
WHERE referrer_domain IS NOT NULL AND referrer_domain != ''
GROUP BY referrer_domain
ORDER BY total_visits DESC;

-- View: URL statistics summary
CREATE OR REPLACE VIEW url_stats_summary AS
SELECT 
    su.short_code,
    su.original_url,
    su.created_at,
    COUNT(uv.id) as total_visits,
    COUNT(DISTINCT uv.ip_address) as unique_visitors,
    COUNT(DISTINCT uv.referrer_domain) as unique_referrers,
    MAX(uv.visited_at) as last_visit,
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - su.created_at))/86400 as age_days
FROM shortened_urls su
LEFT JOIN url_visits uv ON su.short_code = uv.short_code
WHERE su.is_active = TRUE
GROUP BY su.short_code, su.original_url, su.created_at;

-- Grant permissions to qrgen_user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO qrgen_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO qrgen_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO qrgen_user;

-- Insert sample data for testing (optional - comment out for production)
-- INSERT INTO shortened_urls (short_code, original_url, created_by) 
-- VALUES ('demo123', 'https://example.com/very-long-url', 'system');

-- INSERT INTO url_visits (short_code, referrer, referrer_domain, user_agent, ip_address)
-- VALUES ('demo123', 'https://google.com/search', 'google.com', 'Mozilla/5.0', '127.0.0.1');

COMMENT ON TABLE shortened_urls IS 'Stores shortened URL mappings with metadata';
COMMENT ON TABLE url_visits IS 'Records individual visits with referrer tracking';
COMMENT ON TABLE referrer_stats IS 'Aggregated statistics per referrer domain';
COMMENT ON COLUMN url_visits.referrer IS 'Full HTTP Referer header value';
COMMENT ON COLUMN url_visits.referrer_domain IS 'Extracted domain from referrer for easier analysis';
COMMENT ON COLUMN shortened_urls.metadata IS 'JSON field for custom metadata like QR code settings';
