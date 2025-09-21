-- Ensure progressive-first display logic is supported by backend fee functions
-- Adds a simple calculator and aligns RPC used by the app: get_parking_spots_sorted_by_fee

-- Drop and recreate a simple fee calculator that respects base free window + progressive
DROP FUNCTION IF EXISTS public.calculate_simple_parking_fee(jsonb, timestamp with time zone, integer);
CREATE OR REPLACE FUNCTION public.calculate_simple_parking_fee(
  rates jsonb,
  parking_start timestamptz,
  duration_minutes integer
)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  -- Rate variables
  rate_type text;
  rate_price integer;
  rate_minutes integer;
  apply_after integer;
  time_range text;

  -- Time tracking
  check_time_jst time;
  range_start time;
  range_end time;
  is_overnight boolean;

  -- Current selections
  base_rate jsonb := NULL;
  progressive_rate jsonb := NULL;
  max_rate jsonb := NULL;
  current_rate jsonb;

  best_cost integer := 0;
BEGIN
  -- Input validation
  IF rates IS NULL OR duration_minutes <= 0 THEN
    RETURN 0;
  END IF;

  -- Convert to JST for time range check
  check_time_jst := (parking_start AT TIME ZONE 'Asia/Tokyo')::time;

  -- Find first applicable rate for each type in current time range
  FOR current_rate IN SELECT * FROM jsonb_array_elements(rates) LOOP
    rate_type := current_rate->>'type';
    time_range := COALESCE(current_rate->>'time_range', current_rate->>'timeRange', '');

    IF time_range != '' AND time_range IS NOT NULL THEN
      IF time_range ~ '(\d+):(\d+)[～~](\d+):(\d+)' THEN
        range_start := substring(time_range from '(\d+:\d+)')::time;
        range_end := substring(time_range from '[～~](\d+:\d+)')::time;
        is_overnight := range_end <= range_start;

        IF is_overnight THEN
          IF NOT (check_time_jst >= range_start OR check_time_jst < range_end) THEN
            CONTINUE;
          END IF;
        ELSE
          IF NOT (check_time_jst >= range_start AND check_time_jst < range_end) THEN
            CONTINUE;
          END IF;
        END IF;
      END IF;
    END IF;

    IF rate_type = 'base' AND base_rate IS NULL THEN
      base_rate := current_rate;
    ELSIF rate_type = 'progressive' AND progressive_rate IS NULL THEN
      progressive_rate := current_rate;
    ELSIF rate_type = 'max' AND max_rate IS NULL THEN
      max_rate := current_rate;
    END IF;
  END LOOP;

  -- Fallback to non time-ranged rates if nothing matched
  IF base_rate IS NULL AND progressive_rate IS NULL THEN
    FOR current_rate IN SELECT * FROM jsonb_array_elements(rates) LOOP
      rate_type := current_rate->>'type';
      time_range := COALESCE(current_rate->>'time_range', current_rate->>'timeRange', '');
      IF time_range = '' OR time_range IS NULL THEN
        IF rate_type = 'base' AND base_rate IS NULL THEN
          base_rate := current_rate;
        ELSIF rate_type = 'progressive' AND progressive_rate IS NULL THEN
          progressive_rate := current_rate;
        ELSIF rate_type = 'max' AND max_rate IS NULL THEN
          max_rate := current_rate;
        END IF;
      END IF;
    END LOOP;
  END IF;

  -- Calculate fee
  IF progressive_rate IS NOT NULL THEN
    -- Progressive calculation: initial window (base/free) then progressive after threshold
    apply_after := COALESCE(
      (progressive_rate->>'apply_after')::integer,
      (progressive_rate->>'applyAfter')::integer,
      0
    );
    rate_minutes := (progressive_rate->>'minutes')::integer;
    rate_price := (progressive_rate->>'price')::integer;

    IF duration_minutes <= apply_after THEN
      -- Within initial period
      IF base_rate IS NOT NULL THEN
        rate_minutes := COALESCE((base_rate->>'minutes')::integer, 0);
        rate_price := COALESCE((base_rate->>'price')::integer, 0);
        IF rate_minutes > 0 THEN
          best_cost := ((duration_minutes + rate_minutes - 1) / rate_minutes) * rate_price;
        ELSE
          best_cost := 0;
        END IF;
      ELSE
        best_cost := 0;
      END IF;
    ELSE
      -- Initial part (base/free) up to apply_after
      IF base_rate IS NOT NULL AND apply_after > 0 THEN
        rate_minutes := COALESCE((base_rate->>'minutes')::integer, 0);
        rate_price := COALESCE((base_rate->>'price')::integer, 0);
        IF rate_minutes > 0 THEN
          best_cost := ((apply_after + rate_minutes - 1) / rate_minutes) * rate_price;
        END IF;
      END IF;

      -- Progressive part beyond apply_after
      rate_minutes := (progressive_rate->>'minutes')::integer;
      rate_price := (progressive_rate->>'price')::integer;
      best_cost := best_cost + ((duration_minutes - apply_after + rate_minutes - 1) / rate_minutes) * rate_price;
    END IF;

  ELSIF base_rate IS NOT NULL THEN
    -- Base only
    rate_minutes := COALESCE((base_rate->>'minutes')::integer, 0);
    rate_price := COALESCE((base_rate->>'price')::integer, 0);
    IF rate_minutes > 0 THEN
      best_cost := ((duration_minutes + rate_minutes - 1) / rate_minutes) * rate_price;
    ELSE
      best_cost := 0;
    END IF;

  ELSIF max_rate IS NOT NULL THEN
    best_cost := (max_rate->>'price')::integer;
  END IF;

  -- Apply max cap if within window
  IF max_rate IS NOT NULL THEN
    rate_price := (max_rate->>'price')::integer;
    rate_minutes := COALESCE((max_rate->>'minutes')::integer, 999999);
    IF duration_minutes <= rate_minutes AND best_cost > rate_price THEN
      best_cost := rate_price;
    END IF;
  END IF;

  RETURN best_cost;
END;
$$;

-- Align the RPC used by the app. It accepts duration (minutes) and optional start time.
-- Internally we compute entry/exit and use the DP calculator for accuracy.
DROP FUNCTION IF EXISTS public.get_parking_spots_sorted_by_fee(double precision, double precision, double precision, double precision, integer, timestamp with time zone);
CREATE OR REPLACE FUNCTION public.get_parking_spots_sorted_by_fee(
    min_lat double precision,
    max_lat double precision,
    min_lng double precision,
    max_lng double precision,
    duration_minutes integer,
    parking_start timestamptz DEFAULT now()
)
RETURNS TABLE(
    id bigint,
    name text,
    latitude double precision,
    longitude double precision,
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
            p.rates,
            p.capacity::text,
            p.hours
        FROM parking_spots p
        WHERE p.lat BETWEEN min_lat AND max_lat AND p.lng BETWEEN min_lng AND max_lng
    ),
    spots_with_fee AS (
        SELECT
            s.id,
            s.name,
            s.lat,
            s.lng,
            s.rates,
            s.capacity,
            s.hours,
            -- Prefer DP calculator; fall back to simple if needed
            COALESCE(
              public.calculate_parking_fee_dp(s.rates, entry_time, exit_time),
              public.calculate_simple_parking_fee(s.rates, entry_time, duration_minutes)
            ) as calculated_fee
        FROM spots_in_region s
    )
    SELECT
        swf.id,
        swf.name,
        swf.lat as latitude,
        swf.lng as longitude,
        swf.rates,
        swf.capacity,
        swf.hours,
        swf.calculated_fee,
        DENSE_RANK() OVER (ORDER BY swf.calculated_fee ASC NULLS LAST, swf.id ASC)::integer AS rank
    FROM spots_with_fee swf
    ORDER BY swf.calculated_fee ASC NULLS LAST, swf.id ASC
    LIMIT 20;
END;
$$;

