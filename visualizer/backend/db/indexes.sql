CREATE INDEX IF NOT EXISTS image_url_idx         ON image(url);
CREATE INDEX IF NOT EXISTS detection_image_id_idx ON detection(image_id);
CREATE INDEX IF NOT EXISTS detection_value ON detection(value);

-- Enable trigram indexing for efficient LIKE/ILIKE substring searches
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Substring LIKE/ILIKE: uses trigram GIN index
CREATE INDEX IF NOT EXISTS detection_value_trgm_idx ON detection USING gin (value gin_trgm_ops);

-- Prefix LIKE (e.g., 'foo%'): text_pattern_ops helps btree plan selection
CREATE INDEX IF NOT EXISTS detection_value_prefix_idx ON detection (value text_pattern_ops);
