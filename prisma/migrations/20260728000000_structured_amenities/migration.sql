-- Amenities stop being free text: "amenityKeys" holds keys from the catalogue in
-- src/lib/amenities.ts, and the catalogue is the only vocabulary there is.
--
-- The synonym list below is a frozen snapshot, and this file is the only place
-- that ever has to know hosts wrote "fast wifi", "wifi" and "wifi rápido" for the
-- same thing. New keys are added to the catalogue, never to this list.
--
-- Anything a host wrote that no synonym reaches is DROPPED with the old column.
-- There is deliberately nowhere else for it to go — a closed list is the point —
-- so read the "amenities" column before running this if you want to know what
-- you are losing.

ALTER TABLE "Place" ADD COLUMN "amenityKeys" TEXT[] NOT NULL DEFAULT '{}';

WITH tag AS (
  SELECT
    p."id" AS place_id,
    translate(lower(btrim(t.raw)), 'áéíóúüñ', 'aeiouun') AS norm
  FROM "Place" p,
       regexp_split_to_table(p."amenities", ',') AS t(raw)
  WHERE btrim(t.raw) <> ''
),
synonym (norm, amenity_key) AS (
  VALUES
    ('wifi', 'wifi_rapido'),
    ('fast wifi', 'wifi_rapido'),
    ('wifi rapido', 'wifi_rapido'),
    ('buen wifi', 'wifi_rapido'),
    ('wifi bueno', 'wifi_rapido'),
    ('internet', 'wifi_rapido'),
    ('internet rapido', 'wifi_rapido'),
    ('fibra', 'wifi_rapido'),
    ('fibra optica', 'wifi_rapido'),
    ('monitor', 'monitor'),
    ('monitores', 'monitor'),
    ('monitor extra', 'monitor'),
    ('2 monitors', 'monitor'),
    ('2 monitores', 'monitor'),
    ('pantalla', 'monitor'),
    ('segunda pantalla', 'monitor'),
    ('pieza para llamadas', 'pieza_llamadas'),
    ('pieza aparte para llamadas', 'pieza_llamadas'),
    ('sala de llamadas', 'pieza_llamadas'),
    ('lugar para calls', 'pieza_llamadas'),
    ('cuarto para calls', 'pieza_llamadas'),
    ('enchufes', 'enchufes'),
    ('enchufes de sobra', 'enchufes'),
    ('zapatilla', 'enchufes'),
    ('aire', 'aire'),
    ('aire acondicionado', 'aire'),
    ('ac', 'aire'),
    ('a/a', 'aire'),
    ('calefaccion', 'calefaccion'),
    ('estufa', 'calefaccion'),
    ('losa radiante', 'calefaccion'),
    ('patio', 'patio'),
    ('terraza', 'patio'),
    ('balcon', 'patio'),
    ('balcony', 'patio'),
    ('rooftop', 'patio'),
    ('jardin', 'patio'),
    ('azotea', 'patio'),
    ('luz natural', 'luz_natural'),
    ('mucha luz', 'luz_natural'),
    ('luminoso', 'luz_natural'),
    ('silencio', 'silencio'),
    ('silencioso', 'silencio'),
    ('zona silenciosa', 'silencio'),
    ('tranquilo', 'silencio'),
    ('quiet', 'silencio'),
    ('quiet room', 'silencio'),
    ('pileta', 'pileta'),
    ('piscina', 'pileta'),
    ('pool', 'pileta'),
    ('mate', 'mate'),
    ('mates', 'mate'),
    ('yerba', 'mate'),
    ('cafe', 'cafe'),
    ('coffee', 'cafe'),
    ('espresso', 'cafe'),
    ('cafetera', 'cafe'),
    ('cafe de maquina', 'cafe'),
    ('cafe de filtro', 'cafe'),
    ('filter coffee', 'cafe'),
    ('heladera', 'heladera'),
    ('heladera libre', 'heladera'),
    ('freezer', 'heladera'),
    ('pet friendly', 'pet_friendly'),
    ('pet-friendly', 'pet_friendly'),
    ('petfriendly', 'pet_friendly'),
    ('dog friendly', 'pet_friendly'),
    ('se aceptan mascotas', 'pet_friendly'),
    ('venis con tu perro', 'pet_friendly'),
    ('consola', 'consola'),
    ('gaming console', 'consola'),
    ('play', 'consola'),
    ('playstation', 'consola'),
    ('ps5', 'consola'),
    ('xbox', 'consola'),
    ('nintendo', 'consola'),
    ('switch', 'consola'),
    ('bandejas', 'bandejas'),
    ('bandejas de dj', 'bandejas'),
    ('dj', 'bandejas'),
    ('dj controller', 'bandejas'),
    ('controladora', 'bandejas'),
    ('tornamesas', 'bandejas'),
    ('instrumentos', 'instrumentos'),
    ('guitarra', 'instrumentos'),
    ('piano', 'instrumentos'),
    ('ping pong', 'ping_pong'),
    ('ping-pong', 'ping_pong'),
    ('pingpong', 'ping_pong'),
    ('tenis de mesa', 'ping_pong'),
    ('gimnasio', 'gimnasio'),
    ('gym', 'gimnasio'),
    ('pesas', 'gimnasio'),
    ('bici', 'bici'),
    ('bicicleta', 'bici'),
    ('bicicletero', 'bici'),
    ('lugar para la bici', 'bici')
),
matched AS (
  SELECT tag.place_id, s.amenity_key
  FROM tag
  LEFT JOIN synonym s ON s.norm = tag.norm
),
rolled AS (
  SELECT
    place_id,
    array_remove(array_agg(DISTINCT amenity_key), NULL) AS keys
  FROM matched
  GROUP BY place_id
)
UPDATE "Place" p
SET "amenityKeys" = rolled.keys
FROM rolled
WHERE rolled.place_id = p."id";

ALTER TABLE "Place" DROP COLUMN "amenities";
