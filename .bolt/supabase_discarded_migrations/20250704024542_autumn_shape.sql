@@ .. @@
    WHERE user_id = OLD.user_id AND badge_id = badge_record.id;
  END LOOP;
  
-  -- Update mood variety badge (emotional-range)
-  -- Calculate progress percentage for mood variety
-  progress_pct := LEAST(100, ROUND((distinct_moods::NUMERIC / 5::NUMERIC) * 100));
-  
-  RAISE LOG 'Updating mood variety badge after deletion: emotional-range, target: 5, current: %, percentage: %', 
-    distinct_moods, progress_pct;
-  
-  UPDATE user_badges
-  SET progress_current = distinct_moods,
-      progress_percentage = progress_pct,
-      earned = distinct_moods >= 5,
-      earned_at = CASE 
-        WHEN distinct_moods >= 5 AND earned_at IS NULL THEN NOW() 
-        WHEN distinct_moods < 5 THEN NULL
-        ELSE earned_at 
-      END
-  WHERE user_id = OLD.user_id AND badge_id = 'emotional-range';
-  
   -- Update monthly badges
   FOR badge_record IN 
     SELECT id, progress_target