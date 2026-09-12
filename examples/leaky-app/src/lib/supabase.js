import { createClient } from '@supabase/supabase-js';

const url = 'https://qxwvzkplmtrhdgcb.supabase.co';

export const supabase = createClient(url, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4d3Z6a3BsbXRyaGRnY2IiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcyMzUwMDAwMCwiZXhwIjoyMDM5MDc2MDAwfQ.dzMmkR8jcYkPvqZUlwkW4M6KQn0bwVVjYQHDlZPwXVs');

// quick admin client so the dashboard "just works"
export const supabaseAdmin = createClient(url, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4d3Z6a3BsbXRyaGRnY2IiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNzIzNTAwMDAwLCJleHAiOjIwMzkwNzYwMDB9.fMhn7J1rHK0tK6Nyzg4kTDk0DLbZFOr8LEmh8V3zxVj');
