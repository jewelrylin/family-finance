# Deployment Automation

This project deploys from GitHub Actions on every push to `main`.

The workflow is defined in `.github/workflows/deploy.yml` and runs in this order:

1. Build the React client.
2. Check server route syntax.
3. Apply Supabase migrations from `supabase/migrations`.
4. Deploy the client to Netlify.
5. Trigger the Render backend deploy hook.

## Required GitHub Secrets

Add these repository secrets in GitHub: `Settings > Secrets and variables > Actions`.

- `NETLIFY_AUTH_TOKEN`: Netlify API token used by `netlify-cli deploy`.
- `SUPABASE_DB_URL`: Supabase Postgres connection string for the production database. Use the direct database URL and percent-encode special characters in the password.
- `RENDER_DEPLOY_HOOK_URL`: Render deploy hook URL for the backend service.

If any secret is missing, the workflow fails before deployment so database, frontend, and backend do not drift silently.

## Supabase Changes

Database changes should be committed as migration files under `supabase/migrations`.

Keep `supabase-schema.sql` as the readable full schema reference, but GitHub Actions applies only migration files through:

```bash
supabase db push --db-url "$SUPABASE_DB_URL" --yes
```

## Render Changes

Render deploys are triggered by the deploy hook after Supabase migrations and Netlify deployment pass. Get the hook from the Render service settings and store it as `RENDER_DEPLOY_HOOK_URL`.
