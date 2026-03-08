# Documentation review (for Copilot PR review agent)

These rules apply to **all documentation** in this repo: root [README.md](../../README.md), every **README.md** (e.g. `docker/readme.md`, `move-contracts/readme.md`), flow docs in `docs/`, [troubleshooting-guide.md](../../troubleshooting-guide.md), and any other markdown in the repo.

When **reviewing PRs** that add or edit documentation, enforce [docs/documentation-guide.md](../../docs/documentation-guide.md) and the rules below. Suggest or request changes when they are violated.

## Review criteria

1. **Easy to follow**  
   - Procedures use short, numbered steps; one main action per step.  
   - Prefer bullet lists over long paragraphs.  
   - Flag long step sequences or dense blocks of prose in the main flow.

2. **Clear**  
   - Use concrete examples and exact commands where possible; avoid vague “run the script” without the command.  
   - Jargon should be defined once and linked; sentences short.  
   - Flag unexplained terms or nested, hard-to-scan sentences.

3. **Not overwhelming**  
   - Main flow (README quickstart, flow docs) contains only the happy path.  
   - Long explanations, “why”, alternatives, and optional content belong in `<details>` or a separate doc with a **link**.  
   - Do not allow multiple ways to do the same thing in the same place; one approach in the main path, link alternatives.  
   - Flag new content that should be moved into `<details>` or a linked doc.

4. **No duplication**  
   - The same instructions must **not** appear in multiple files (including between READMEs and other docs).  
   - Each piece of information has **one canonical place** (see “Where to put what” in the documentation guide); elsewhere, **link** to it.  
   - Flag duplicated procedures or copy-pasted blocks; suggest replacing with a link to the canonical doc.

## Placement checks

- Content is placed according to the documentation guide’s **“Where to put what”** table.  
- Content that is not part of the happy path → in a detailed section or separate doc, with a link from the main path.  
- Troubleshooting → in [troubleshooting-guide.md](../../troubleshooting-guide.md) using the existing `<details>` pattern; do not add new troubleshooting in README or flow docs.  
- Flow docs: numbered steps kept minimal; “why” and optional material in `<details>` or linked docs.  
  - Flag new long explanations or alternatives in the middle of a flow.

## Defaults when suggesting edits

- Prefer **one short sentence + link** over in-place duplication.  
- Prefer **less text** in the main path and **more in linked/expandable sections**.
