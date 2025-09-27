-- Fix invalid parking rate data and improve RPC function
-- 1. Clean up invalid data where base rates have apply_after
-- 2. Update RPC function to exclude spots with invalid or failed calculations

-- Fix specific invalid parking spots
UPDATE parking_spots
SET rates = jsonb_build_array(
  jsonb_build_object('type', 'base', 'price', 400, 'minutes', 30, 'time_range', '7:00～22:00'),
  jsonb_build_object('type', 'max', 'price', 2800, 'minutes', 150, 'time_range', '7:00～22:00'),
  jsonb_build_object('type', 'max', 'price', 5600, 'minutes', 1050, 'time_range', '7:00～22:00')
)
WHERE id = 22438;

-- Find and log other spots with invalid base rates that have apply_after
DO $$
DECLARE
  invalid_spot RECORD;
  rate_item jsonb;
BEGIN
  FOR invalid_spot IN
    SELECT id, name, rates
    FROM parking_spots
    WHERE rates IS NOT NULL
  LOOP
    FOR rate_item IN SELECT * FROM jsonb_array_elements(invalid_spot.rates)
    LOOP
      IF rate_item->>'type' = 'base' AND
         (rate_item->>'apply_after' IS NOT NULL OR rate_item->>'applyAfter' IS NOT NULL) THEN
        RAISE NOTICE 'Invalid base rate with apply_after in spot %: %', invalid_spot.id, invalid_spot.name;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- Update the RPC function to exclude spots with calculation errors or NULL fees
DROP FUNCTION IF EXISTS public.get_parking_spots_sorted_by_fee(double precision, double precision, double precision, double precision, integer, timestamp with time zone, double precision, integer);
CREATE OR REPLACE FUNCTION public.get_parking_spots_sorted_by_fee(
    min_lat double precision,
    max_lat double precision,
    min_lng double precision,
    max_lng double precision,
    duration_minutes integer,
    parking_start timestamptz DEFAULT now(),
    min_elevation double precision DEFAULT NULL,
    limit_candidates integer DEFAULT 600
)
RETURNS TABLE(
    id bigint,
    name text,
    latitude double precision,
    longitude double precision,
    elevation double precision,
    rates jsonb,
    capacity text,
    hours jsonb,
    calculated_fee integer,
    rank integer
)
LANGUAGE plpgsql
AS $$
DECLARE
    entry_time timestamptz := parking_start;
    exit_time timestamptz := parking_start + (duration_minutes || ' minutes')::interval;
BEGIN
    RETURN QUERY
    WITH spots_in_region AS (
        SELECT
            p.id::bigint,
            p.name,
            p.lat,
            p.lng,
            p.elevation,
            p.rates,
            p.capacity::text,
            p.hours
        FROM parking_spots p
        WHERE p.lat BETWEEN min_lat AND max_lat
          AND p.lng BETWEEN min_lng AND max_lng
          AND (min_elevation IS NULL OR p.elevation >= min_elevation)
        ORDER BY p.id
        LIMIT limit_candidates
    ),
    spots_with_fee AS (
        SELECT
            s.id,
            s.name,
            s.lat,
            s.lng,
            s.elevation,
            s.rates,
            s.capacity,
            s.hours,
            -- Calculate fee with SIMPLE calculator
            public.calculate_simple_parking_fee(s.rates, entry_time, duration_minutes) as calculated_fee
        FROM spots_in_region s
    ),
    valid_spots AS (
        -- Filter out spots with NULL or negative fees (calculation errors)
        SELECT *
        FROM spots_with_fee swf
        WHERE swf.calculated_fee IS NOT NULL
          AND swf.calculated_fee >= 0
    )
    SELECT
        vs.id,
        vs.name,
        vs.lat as latitude,
        vs.lng as longitude,
        vs.elevation,
        vs.rates,
        vs.capacity,
        vs.hours,
        vs.calculated_fee,
        DENSE_RANK() OVER (ORDER BY vs.calculated_fee ASC, vs.id ASC)::integer AS rank
    FROM valid_spots vs
    ORDER BY vs.calculated_fee ASC, vs.id ASC
    LIMIT 20;
END;
$$;