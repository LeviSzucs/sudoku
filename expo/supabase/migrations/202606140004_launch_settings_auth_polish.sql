-- Launch settings/auth polish.
-- Adds persistent app preference columns and keeps feedback categories aligned with the app UI.

alter table public.user_settings
  add column if not exists sound_enabled boolean not null default true,
  add column if not exists haptics_enabled boolean not null default true;

alter table public.feedback
  drop constraint if exists feedback_category_check;

alter table public.feedback
  add constraint feedback_category_check
  check (category in (
    'general_feedback',
    'bug_report',
    'account_issue',
    'gameplay_issue',
    'ranked_duel_issue',
    'privacy_data_request',
    'account_deletion',
    'other',
    'feedback',
    'problem'
  ));
