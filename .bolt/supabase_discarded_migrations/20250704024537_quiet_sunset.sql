@@ .. @@
  END IF;
  
-  -- Mood variety badge (emotional-range)
-  -- Calculate progress percentage for mood variety
-  progress_pct := LEAST(100, ROUND((distinct_moods::NUMERIC / 5::NUMERIC) * 100));
-  
-  RAISE LOG 'Processing mood variety badge: emotional-range, target: 5, current: %, percentage: %', 
-    distinct_moods, progress_pct;
-  
-  INSERT INTO user_badges (
-    user_id, 
-    badge_id, 
-    progress_current, 
-    progress_percentage,
-    earned, 
-    earned_at
-  )
-  VALUES (
-    p_user_id, 
-    'emotional-range', 
-    distinct_moods,
-    progress_pct,
-    distinct_moods >= 5,
-    CASE WHEN distinct_moods >= 5 THEN NOW() ELSE NULL END
-  )
-  ON CONFLICT (user_id, badge_id) 
-  DO UPDATE SET 
-    progress_current = distinct_moods,
-    progress_percentage = progress_pct,
-    earned = distinct_moods >= 5,
-    earned_at = CASE 
-      WHEN distinct_moods >= 5 AND user_badges.earned_at IS NULL 
-      THEN NOW() 
-      ELSE user_badges.earned_at 
-    END;
-  
   -- Premium Supporter badge
   RAISE LOG 'Processing premium supporter badge for user %, is_premium: %', p_user_id, is_premium;