-- SQL Script to add total_days column to time_off_requests
ALTER TABLE public.time_off_requests 
ADD COLUMN IF NOT EXISTS total_days numeric DEFAULT 0;

-- Update existing records (rough estimate, might not be 100% accurate for weekends but better than 0)
UPDATE public.time_off_requests 
SET total_days = (end_date - start_date + 1)
WHERE total_days = 0 OR total_days IS NULL;

-- Handle half days in existing records if type contains "Half Day"
UPDATE public.time_off_requests 
SET total_days = 0.5 
WHERE type ILIKE '%Half Day%' AND (total_days = 1 OR total_days IS NULL);
