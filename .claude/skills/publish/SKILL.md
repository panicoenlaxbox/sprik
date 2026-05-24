---
name: publish
description: Publish a new release - bumps version, commits, tags, and pushes to trigger the GitHub Actions release.
disable-model-invocation: true
---

Publish a new release of the project. Follow these steps exactly:

1. Verify the working tree is clean (no uncommitted changes). If there are uncommitted changes, use AskUserQuestion to ask the user whether they want you to commit those changes for them or prefer to handle it themselves. If they want you to commit, stage all modified tracked files, write an appropriate commit message yourself, and create the commit before continuing. If they prefer to handle it themselves, stop here.

2. Use AskUserQuestion to ask the user which version bump they want: patch, minor, or major. Wait for their answer before continuing.

3. Run `pnpm version <patch|minor|major>` with the chosen bump type. This automatically bumps package.json, creates the commit, and creates the `v<version>` tag.

4. Push the commit and tag: `git push --follow-tags`

5. Report the version that was published and the tag that was pushed.
