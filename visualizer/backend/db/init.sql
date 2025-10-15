
CREATE TABLE IF NOT EXISTS creator (
  id        BIGINT PRIMARY KEY,
  username  TEXT NOT NULL
);

-- Images (top-level object)
CREATE TABLE IF NOT EXISTS image (
  id           BIGINT PRIMARY KEY,
  url          TEXT NOT NULL,
  camera_type  TEXT NOT NULL,  -- or constraint/enum if set of values is known
  lat          DOUBLE PRECISION NOT NULL,
  lon          DOUBLE PRECISION NOT NULL,
  width        INTEGER NOT NULL CHECK (width > 0),
  height       INTEGER NOT NULL CHECK (height > 0),

  creator_id   BIGINT NOT NULL REFERENCES traffic.creators(id) ON UPDATE CASCADE,
  sequence_id  TEXT   NOT NULL,
);

CREATE TABLE IF NOT EXISTS detection (
  id         BIGINT PRIMARY KEY,
  image_id   BIGINT NOT NULL REFERENCES image(id) ON DELETE CASCADE ON UPDATE CASCADE,
  value      TEXT   NOT NULL,
  geometry   TEXT   NOT NULL,
  bbox       INTEGER[] NOT NULL,
  CHECK (bbox[0] < bbox[2] AND bbox[1] < bbox[3])
  CHECK (array_ndims(bbox) = 1)
  CHECK (array_length(bbox, 1) = 4)
);

-- Indexes
