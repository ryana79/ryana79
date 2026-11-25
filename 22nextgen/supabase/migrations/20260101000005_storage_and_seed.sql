-- Storage buckets + policies, and non-fictional seed configuration.
-- public-media: event graphics, news covers, sponsor logos, approved athlete photos (public read).
-- private-docs: consent documents and other non-public files (admin only).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('public-media', 'public-media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('private-docs', 'private-docs', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "public media is readable" on storage.objects for select to anon, authenticated
  using (bucket_id = 'public-media');
create policy "editors upload public media" on storage.objects for insert to authenticated
  with check (bucket_id = 'public-media' and public.is_editor());
create policy "editors update public media" on storage.objects for update to authenticated
  using (bucket_id = 'public-media' and public.is_editor()) with check (bucket_id = 'public-media' and public.is_editor());
create policy "editors delete public media" on storage.objects for delete to authenticated
  using (bucket_id = 'public-media' and public.is_editor());
create policy "admins manage private docs" on storage.objects for all to authenticated
  using (bucket_id = 'private-docs' and public.is_admin()) with check (bucket_id = 'private-docs' and public.is_admin());

-- Built-in combine tests. Ranges are plausibility bounds for youth athletes, not performance standards.
insert into public.combine_test_types (slug, name, unit, direction, min_value, max_value, decimals, is_builtin, sort_order, protocol_note) values
  ('forty_yard_dash', '40-Yard Dash', 's', 'lower_is_better', 3.5, 12, 2, true, 10, 'Hand-timed and laser-timed results should be recorded under different protocols.'),
  ('ten_yard_split', '10-Yard Split', 's', 'lower_is_better', 1.0, 4, 2, true, 20, null),
  ('shuttle_5_10_5', '5-10-5 Shuttle', 's', 'lower_is_better', 3.0, 9, 2, true, 30, null),
  ('vertical_jump', 'Vertical Jump', 'in', 'higher_is_better', 5, 60, 1, true, 40, null),
  ('broad_jump', 'Broad Jump', 'in', 'higher_is_better', 30, 180, 0, true, 50, null)
on conflict (slug) do nothing;

-- Editable site configuration. No invented content: events/athletes/sponsors/results start empty.
insert into public.site_settings (key, value, is_public) values
  ('homepage', jsonb_build_object(
    'hero', jsonb_build_object(
      'enabled', true,
      'headline', '22 NEXT GEN',
      'subhead', 'THE FUTURE STARTS HERE.',
      'tagline', 'Compete. Develop. Get Discovered.',
      'primary_cta_label', 'Explore Events',
      'primary_cta_href', '/events',
      'secondary_cta_label', 'Create Athlete Profile',
      'secondary_cta_href', '/register',
      'background_image_path', null),
    'events', jsonb_build_object('enabled', true, 'title', 'Upcoming Events', 'description', 'Combines, showcases and development camps across the Northeast.'),
    'athletes', jsonb_build_object('enabled', true, 'title', 'Featured Athletes', 'description', 'Approved public profiles with verified performance metrics.'),
    'leaderboards', jsonb_build_object('enabled', true, 'title', 'Performance Leaderboards', 'description', 'Verified combine results only.'),
    'news', jsonb_build_object('enabled', true, 'title', 'Latest from 22 NEXT GEN', 'description', 'Spotlights, recaps, announcements and development.'),
    'membership', jsonb_build_object('enabled', true, 'title', 'NEXT GEN+', 'description', 'Expanded profiles, performance tracking and player cards for serious athletes.'),
    'sponsors', jsonb_build_object('enabled', true, 'title', 'Partners', 'description', 'Brands backing the next generation.')
  ), true),
  ('membership', jsonb_build_object(
    'name', 'NEXT GEN+',
    'price_cents', 1999,
    'interval', 'month',
    'billing_enabled', false,
    'available_benefits', jsonb_build_array(
      'Athlete profile on the 22 NEXT GEN directory (after parental consent and review)',
      'Verified combine results shown on your profile and leaderboards'),
    'planned_benefits', jsonb_build_array(
      'Expanded profile with extended media',
      'Performance tracking over time',
      'Downloadable branded player cards',
      'Premium media access',
      'Event invitations',
      'Development resources')
  ), true),
  ('sponsor_packages', jsonb_build_object(
    'event_sponsor_min_cents', 15000,
    'event_sponsor_max_label', '$2,500+',
    'annual_partner_label', 'Custom',
    'notes', 'Pricing is a starting guide; contact us to build a package.'
  ), true),
  ('contact', jsonb_build_object('email', null, 'phone', null, 'address', null, 'social', jsonb_build_object('instagram', null, 'x', null, 'youtube', null, 'facebook', null, 'tiktok', null)), true),
  ('seo', jsonb_build_object('site_description', '22 NEXT GEN is a New Jersey youth football events, athlete exposure and combine performance platform by 22 Fitness LLC.'), true),
  ('coppa', jsonb_build_object('workflow_approved', false, 'note', 'Enable only after counsel approves a verifiable parental consent process.'), false)
on conflict (key) do nothing;
