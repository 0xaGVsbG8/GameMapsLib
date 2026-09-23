PRAGMA foreign_keys = ON;

CREATE TABLE sites (
  id    TEXT PRIMARY KEY DEFAULT 'default',
  title TEXT NOT NULL
);

CREATE TABLE games (
  id         TEXT PRIMARY KEY,
  site_id    TEXT NOT NULL DEFAULT 'default' REFERENCES sites(id),
  name       TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE maps (
  id         TEXT PRIMARY KEY,
  game_id    TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  image      TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE categories (
  id         TEXT NOT NULL,
  map_id     TEXT NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (map_id, id)
);

CREATE TABLE items (
  id                 TEXT NOT NULL,
  map_id             TEXT NOT NULL,
  category_id        TEXT NOT NULL,
  name               TEXT NOT NULL,
  icon               TEXT NOT NULL,
  enabled_by_default INTEGER NOT NULL DEFAULT 0 CHECK (enabled_by_default IN (0, 1)),
  sort_order         INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (map_id, category_id, id),
  FOREIGN KEY (map_id, category_id) REFERENCES categories(map_id, id) ON DELETE CASCADE
);

CREATE TABLE markers (
  id          TEXT NOT NULL,
  map_id      TEXT NOT NULL,
  category_id TEXT NOT NULL,
  item_id     TEXT NOT NULL,
  name        TEXT NOT NULL,
  x           REAL NOT NULL,
  y           REAL NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (map_id, category_id, item_id, id),
  FOREIGN KEY (map_id, category_id, item_id)
    REFERENCES items(map_id, category_id, id) ON DELETE CASCADE
);

INSERT INTO sites (id, title) VALUES ('default', 'Interactive Map');

INSERT INTO games (id, name, sort_order) VALUES
  ('palworld', 'Palworld', 1),
  ('elden-ring', 'Elden Ring', 2);

INSERT INTO maps (id, game_id, name, image, sort_order) VALUES
  ('palpagos', 'palworld', 'Palpagos', '/maps/palpagos.svg', 1),
  ('world-tree', 'palworld', 'World Tree', '/maps/world-tree.svg', 2),
  ('lands-between', 'elden-ring', 'The Lands Between', '/maps/lands-between.svg', 1),
  ('shadow-realm', 'elden-ring', 'Realm of Shadow', '/maps/shadow-realm.svg', 2);

-- Rebuild maps.json
SELECT json_object(
  'title', s.title,
  'games', (
    SELECT json_group_array(game_obj)
    FROM (
      SELECT json_object(
        'id', g.id,
        'name', g.name,
        'maps', (
          SELECT json_group_array(map_obj)
          FROM (
            SELECT json_object(
              'id', m.id,
              'name', m.name,
              'image', m.image,
              'categories', (
                SELECT json_group_array(cat_obj)
                FROM (
                  SELECT json_object(
                    'id', c.id,
                    'name', c.name,
                    'items', (
                      SELECT json_group_array(item_obj)
                      FROM (
                        SELECT json_object(
                          'id', i.id,
                          'name', i.name,
                          'icon', i.icon,
                          'enabledByDefault', json(iif(i.enabled_by_default, 'true', 'false')),
                          'markers', (
                            SELECT json_group_array(marker_obj)
                            FROM (
                              SELECT json_object(
                                'id', mk.id,
                                'name', mk.name,
                                'x', mk.x,
                                'y', mk.y
                              ) AS marker_obj
                              FROM markers mk
                              WHERE mk.map_id = i.map_id
                                AND mk.category_id = i.category_id
                                AND mk.item_id = i.id
                              ORDER BY mk.sort_order
                            )
                          )
                        ) AS item_obj
                        FROM items i
                        WHERE i.map_id = c.map_id AND i.category_id = c.id
                        ORDER BY i.sort_order
                      )
                    )
                  ) AS cat_obj
                  FROM categories c
                  WHERE c.map_id = m.id
                  ORDER BY c.sort_order
                )
              )
            ) AS map_obj
            FROM maps m
            WHERE m.game_id = g.id
            ORDER BY m.sort_order
          )
        )
      ) AS game_obj
      FROM games g
      WHERE g.site_id = s.id
      ORDER BY g.sort_order
    )
  )
) AS maps_json
FROM sites s
WHERE s.id = 'default';