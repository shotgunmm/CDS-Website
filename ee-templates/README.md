# ExpressionEngine templates

Mirror of `management/user/templates/default_site/` on the staging server
(cds.shieldssgf.dev). The static HTML in the repo root is the design source;
these are the EE templates that render it.

Deploy: upload to `management/user/templates/default_site/` (SFTP). Templates are
file-based, so no CP step is needed, but EE may cache output.

## Notes
- Help-section jump links and section ids use the Page Builder `anchor` field
  (`{content:anchor}`, e.g. `foreclosure-oversight`), falling back to the header
  if empty. EE modifiers like `:url_title` do not work on Fluid variables here
  (the parser splits on the last colon), so slugs are stored explicitly.
- Footer Services links are Nav Builder custom URLs (`/services/#<anchor>`), set
  in the CP, not in these files.
