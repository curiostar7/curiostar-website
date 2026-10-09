# CurioStar

CurioStar is an astrology consultation website where clients can submit questions and view replies from the administrator.

## Features

- Client registration and login
- Astrology consultation submissions
- Admin consultation dashboard
- Replies between admin and clients
- Supabase database integration

## Hosting

This website can be hosted using GitHub Pages, with Supabase providing authentication and database services.
### 1. Create your Supabase project
Create a project at https://supabase.com/

### 2. Create the database
Open Supabase -> SQL Editor -> New query.
Paste the entire `supabase.sql` file and run it.

### 3. Get your project credentials
In Supabase, open your project's API settings and copy:
- Project URL
- Publishable/anon key

Open `script.js` and replace:
`PASTE_YOUR_SUPABASE_URL`
`PASTE_YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY`

Also change:
`YOUR_ADMIN_EMAIL`
to the email you will use for your CurioStar admin account.

Only use the publishable/anon key in browser code. NEVER put a Supabase service-role/secret key in `script.js`.

### 4. Create your admin account
Open CurioStar, create an account with your admin email, then confirm the email if your Supabase authentication settings require it.

In Supabase SQL Editor, run:
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'YOUR_ADMIN_EMAIL');

Replace the email with your actual admin email.

### 5. Test
Client:
- Create another account
- Submit a consultation
- Sign out

Admin:
- Sign in with the admin account
- Open Account
- Your Consultation Inbox will show the request
- Write a reply and Save reply

Client:
- Sign in again
- Their reply appears under "Your consultation".

## Local test

From this folder:
python3 -m http.server 8000

Then open:
http://localhost:8000

## Important
The frontend is static; Supabase provides the secure authentication/database layer.
Do not put private Supabase service-role keys in the website.
=======
# curiostar-website
CurioStar astrology consultation website
>>>>>>> 7212a52dc8e7fe11e1dd2573869c08df4bebbe27
