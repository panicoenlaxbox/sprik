---
name: publish
description: Publish a new release - bumps version, commits, tags, and pushes to trigger the GitHub Actions release.
disable-model-invocation: true
---

Publish a new release of the project. Follow these steps exactly:

1. Verify the working tree is clean (no uncommitted changes). If there are uncommitted changes, stop and tell the user to commit or stash them first.

2. Ask the user which version bump they want: patch, minor, or major. Wait for their answer before continuing.

3. Run `pnpm version <patch|minor|major>` with the chosen bump type. This automatically bumps package.json, creates the commit, and creates the `v<version>` tag.

4. Push the commit and tag: `git push --follow-tags`

5. Report the version that was published and the tag that was pushed.
