# Zell documentation site

Source of the Zell documentation site, built with [Docusaurus](https://docusaurus.io/) and published on GitHub Pages at <https://zell-lang.github.io/docs/>.

**This repository holds no documentation text to edit.** The content lives in [zell-lang/zell](https://github.com/zell-lang/zell) (`docs/guide/*.md`, `docs/*.md`, `DESIGN.md`, `README.md`, `editors/vscode/README.md`, doc comments in `std/`). Every page has an "Edit this page" link that points to its source there. Only the landing page, `docs/download.md` and the editor pages `docs/editors/index.md` and `docs/editors/idea.md` are written here.

## How it is built

`scripts/sync.mjs` (Node, no dependencies) runs before every build:

1. clones or updates `zell-lang/zell` into `.cache/zell` at `ZELL_REF` (default `master`);
2. copies the guides, the design documents, `EXAMPLES.md`, the README of every example project in `docs/examples/` (one page each under `/examples/<name>`) and the VS Code README into `docs/`, rewriting links between them (links to files that are not on the site become GitHub links pinned to the synced commit), dropping HTML comments, escaping `<` outside code and turning `<url>` autolinks into links;
3. splits `DESIGN.md` (Russian) into one page per `##` section under `docs/spec/`; heading ids stay the same, so cross-links keep working;
4. renders the standard-library reference, one page per namespace, from `std/docs.json` written by `zell doc --site`;
5. writes `generated/` (sidebars, landing-page data, `version.json` shown in the footer as "docs built from zell@<sha>").

Generated files are not committed (see `.gitignore`).

## Run locally

```sh
npm ci
node scripts/sync.mjs --fetch-only                       # clone zell-lang/zell into .cache/zell
(cd .cache/zell && zell doc --site ../../generated-api)  # needs a zell toolchain; skip it to build without the API reference
node scripts/sync.mjs                                    # ZELL_REF=v0.1.0-rc.3 to pick another ref
npm run start                                            # dev server, or: npm run build && npm run serve
```

Use `ZELL_SRC=/path/to/zell` to sync from a local checkout instead of cloning, and `ZELL_DOCS_JSON=/path/to/docs.json` to point at another API dump. The build fails on any broken link.

## Deploy

Deployment is manual: run the **Deploy docs** workflow (`.github/workflows/deploy.yml`):

```sh
gh workflow run deploy.yml -R zell-lang/docs -f zell_ref=master -f toolchain_tag=v0.1.0-rc.3
```

Enable it once under *Settings > Pages > Build and deployment > Source: GitHub Actions*. The workflow checks out this repository, syncs the content, downloads the toolchain release for the API reference, builds with `baseUrl: /docs/` and publishes with `actions/deploy-pages`.

## Highlighting

`src/theme/prism-include-languages.ts` registers the `zell` Prism grammar (keywords, types, strings including raw strings, comments, numbers, `@attributes`, the `T!` and `?` operators), so ```` ```zell ```` blocks are highlighted.
