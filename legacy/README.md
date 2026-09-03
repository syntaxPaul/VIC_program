# Legacy application

The original Tkinter desktop app, kept for reference and for migrating data.

- `vic.py` — the original single-file application (259 lines). Member
  registration only, shipped as a Windows `.exe` via GitHub Actions.
- `church_logo.jpg`, `church_icon.ico` — branding assets.

`church_members.db` is no longer tracked in this repository — it held real
personal data. Keep your copy locally and import it with:

```bash
npx tsx prisma/import-legacy.mts /path/to/church_members.db
```

The importer is safe to re-run and reports anything it could not parse
rather than guessing. See the main README for detail.
