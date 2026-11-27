-- "End the race now" logs an 'end' event (the checkered flag shown early), so every device sees the race ended.
alter table public.events drop constraint if exists events_type_check;
alter table public.events add constraint events_type_check check (type in ('green', 'in', 'out', 'yellow', 'red', 'void', 'end'));
