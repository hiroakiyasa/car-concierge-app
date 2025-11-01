-- Update RPC function to return total count of parking spots in region
-- This will help frontend decide when to auto-zoom the map

DROP FUNCTION IF EXISTS public.get_parking_spots_sorted_by_fee(double precision, double precision, double precision, double precision, integer, timestamp with time zone, double precision, integer);

CREATE OR REPLACE FUNCTION public.get_parking_spots_sorted_by_fee(
    min_lat double precision,
    max_lat double precision,
    min_lng double precision,
    max_lng double precision,
    duration_minutes integer,
    parking_start timestamptz DEFAULT now(),
    min_elevation double precision DEFAULT NULL,
    limit_candidates integer DEFAULT 1000
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
    rank integer,
    total_spots_in_region integer
)
LANGUAGE plpgsql
AS $$
DECLARE
    entry_time timestamptz := parking_start;
    exit_time timestamptz := parking_start + (duration_minutes || ' minutes')::interval;
    total_count integer;
BEGIN
    -- First, count total spots in region
    SELECT COUNT(*)::integer INTO total_count
    FROM parking_spots p
    WHERE p.lat BETWEEN min_lat AND max_lat
      AND p.lng BETWEEN min_lng AND max_lng
      AND (min_elevation IS NULL OR p.elevation >= min_elevation);

    -- Return results with total count
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
        DENSE_RANK() OVER (ORDER BY vs.calculated_fee ASC, vs.id ASC)::integer AS rank,
        total_count AS total_spots_in_region
    FROM valid_spots vs
    ORDER BY vs.calculated_fee ASC, vs.id ASC
    LIMIT 20;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_parking_spots_sorted_by_fee TO anon, authenticated;