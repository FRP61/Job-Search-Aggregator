# Going public

**English** | [Русский](PUBLIC_RELEASE.ru.md)

What to do when the project is ready to become public. At the time of checking, the commit history had no secrets:
the `jobs` password in `docker-compose.yml`, `.env.example` and CI is only for the local database.

## Required

- [ ] **Choose a license** and add `LICENSE`. Without one, others can't legally use the code, even if it's public.
- [ ] **Check each source's terms of use:** EURES, Bundesagentur, cv.ee/lv/lt, justjoin.it, JobTech, ESCO, ECB, Eurostat. Especially commercial use and republishing vacancy texts.
- [ ] **Bundesagentur:** the `jobboerse-jobsuche` key in `app/integrations/bundesagentur.py` is shared, but we haven't seen official permission for this access. Check it or remove the source.
- [ ] **Search for secrets again** across the whole history, since new commits will appear after this check: `gitleaks detect` or similar.
- [ ] **Review the commit history and decide whether to keep it.** One option is a clean start: a new repository without the old history.
- [x] **State the authorship:** who did what. The history contains `Co-Authored-By` lines, and a rewrite is the only way to remove them.

## Merging the frontend

1. Merge the backend PRs in order: #1, #2, #3, with **Create a merge commit** (squashing causes conflicts here).
2. The frontend goes on a `feature/frontend` branch from `main`, in a `frontend/` folder.
3. The frontend reads the API address from an environment variable, and its own address goes into the backend's `CORS_ORIGINS`.
4. Add a `frontend` service to `docker-compose.yml`, so one command starts everything.
5. Test search, filters, pages and the vacancy card on real data, then open a PR into `main`.

## Copyright and license

- [ ] Copyright exists automatically, no registration is needed. Add a line with the author: `Copyright (c) 2026 SatohyNo`.
- [ ] Choose: MIT (others may do almost anything), AGPL-3.0 (a service built on it must open its code), or no license with "All rights reserved" (others may only view it).
- [ ] Remember the limits: vacancy data belongs to the boards and employers, and protection of AI-generated code is weaker and depends on the country. For a commercial use, ask a lawyer.

## Who did what

Done: the **Author** section in the [README](../README.md). The whole project is by SatohyNo, written with an AI coding assistant.

## README for the public version

- [ ] Add a link to the live version.
- [x] Screenshots and a frontend description.
- [x] Update "Status", "Limitations" and "Next steps".
- [x] Add a CI badge.

## GitHub settings

- [ ] Add a repository description and topics (`fastapi`, `job-search`, `eu`).
- [ ] Protect `main`: changes only through PRs with green CI.
- [ ] Turn on secret scanning and Dependabot.

## Before deploying

- [ ] Set real `DATABASE_URL` and `CORS_ORIGINS` through the host's environment variables.
- [ ] Don't expose the database port: `5432:5432` in `docker-compose.yml` is only for local development.
- [ ] Limit the API request rate.
- [ ] Add the service name and a contact to requests to sources where it's required.
