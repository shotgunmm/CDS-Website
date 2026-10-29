# ExpressionEngine templates

Mirror of `management/user/templates/default_site/` on the staging server
(cds.shieldssgf.dev). The static HTML in the repo root is the design source;
these are the EE templates that render it.

Deploy: upload to `management/user/templates/default_site/` (SFTP). EE can also keep
copies in the DB (`exp_templates`/`exp_snippets`, per the Book entry of 2026-10-20);
the 2026-10-29 file uploads took effect, so files win here, but if an upload ever
doesn't show, check the CP Template Manager copy. EE may also cache output.

## Notes
- Help-section jump links and section ids use the Page Builder `anchor` field
  (`{content:anchor}`, e.g. `foreclosure-oversight`), falling back to the header
  if empty. EE modifiers like `:url_title` do not work on Fluid variables here
  (the parser splits on the last colon), so slugs are stored explicitly.
- Footer Services links are Nav Builder custom URLs (`/services/#<anchor>`), set
  in the CP, not in these files.
