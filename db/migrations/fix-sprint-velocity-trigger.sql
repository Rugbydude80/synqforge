-- Fix trigger_sprint_velocity_update to handle empty arrays
-- This fixes the same bug as the epic aggregates trigger
-- Error: "upper bound of FOR loop cannot be null"

CREATE OR REPLACE FUNCTION public.trigger_sprint_velocity_update()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  affected_sprint_ids VARCHAR[];
  sprint_id_from_junction VARCHAR;
BEGIN
  affected_sprint_ids := ARRAY[]::VARCHAR[];

  -- Handle sprint_stories junction table changes
  IF TG_TABLE_NAME = 'sprint_stories' THEN
    IF TG_OP = 'INSERT' THEN
      affected_sprint_ids := affected_sprint_ids || NEW.sprint_id;
    ELSIF TG_OP = 'DELETE' THEN
      affected_sprint_ids := affected_sprint_ids || OLD.sprint_id;
    ELSIF TG_OP = 'UPDATE' THEN
      affected_sprint_ids := affected_sprint_ids || OLD.sprint_id;
      affected_sprint_ids := affected_sprint_ids || NEW.sprint_id;
    END IF;

  -- Handle stories table changes
  ELSIF TG_TABLE_NAME = 'stories' THEN
    -- For INSERT - check if story belongs to any sprint
    IF TG_OP = 'INSERT' THEN
      IF NEW.status = 'done' AND NEW.done_at IS NOT NULL THEN
        SELECT sprint_id INTO sprint_id_from_junction
        FROM sprint_stories
        WHERE story_id = NEW.id
        LIMIT 1;

        IF sprint_id_from_junction IS NOT NULL THEN
          affected_sprint_ids := affected_sprint_ids || sprint_id_from_junction;
        END IF;
      END IF;

    -- For UPDATE - check if status/points/done_at changed
    ELSIF TG_OP = 'UPDATE' THEN
      IF (OLD.status != NEW.status OR
          COALESCE(OLD.story_points, 0) != COALESCE(NEW.story_points, 0) OR
          OLD.done_at IS DISTINCT FROM NEW.done_at) THEN

        -- Get all sprints this story belongs to
        FOR sprint_id_from_junction IN
          SELECT sprint_id FROM sprint_stories WHERE story_id = NEW.id
        LOOP
          affected_sprint_ids := affected_sprint_ids || sprint_id_from_junction;
        END LOOP;
      END IF;

    -- For DELETE
    ELSIF TG_OP = 'DELETE' THEN
      IF OLD.status = 'done' AND OLD.done_at IS NOT NULL THEN
        FOR sprint_id_from_junction IN
          SELECT sprint_id FROM sprint_stories WHERE story_id = OLD.id
        LOOP
          affected_sprint_ids := affected_sprint_ids || sprint_id_from_junction;
        END LOOP;
      END IF;
    END IF;
  END IF;

  -- Update cache for affected sprints (remove duplicates)
  affected_sprint_ids := ARRAY(SELECT DISTINCT unnest(affected_sprint_ids));

  -- FIX: Only loop if there are sprint IDs to process
  -- Changed from: FOR i IN 1..array_length(affected_sprint_ids, 1) LOOP
  -- Which would fail when array_length returns NULL for empty arrays
  IF array_length(affected_sprint_ids, 1) > 0 THEN
    FOREACH sprint_id_from_junction IN ARRAY affected_sprint_ids LOOP
      PERFORM update_sprint_velocity_cache(sprint_id_from_junction);
    END LOOP;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$function$;
