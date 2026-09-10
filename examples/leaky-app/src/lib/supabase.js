import { createClient } from '@supabase/supabase-js';

const url = 'https://abcdefghijklmnop.supabase.co';

export const supabase = createClient(url, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJsZWFreS1hcHAtZml4dHVyZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoyMDAwMDAwMDAwfQ.fixture_signature_not_real_0000000000');

// quick admin client so the dashboard "just works"
export const supabaseAdmin = createClient(url, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJsZWFreS1hcHAtZml4dHVyZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjIwMDAwMDAwMDB9.fixture_signature_not_real_0000000000');
