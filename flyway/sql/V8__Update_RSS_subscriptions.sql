-- content_id (creator_post) calculation for RSS feeds was changed
-- Prevent reposting content by updating subscription's created_at
update creator_subscription as cs
set created_at = now()
from creator as c
where c.id = cs.creator_id
  and c.type = 'RSS';
