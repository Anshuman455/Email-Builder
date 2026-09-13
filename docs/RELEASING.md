# Releasing

How to publish the five packages to npm.

| Package | Contains |
|---|---|
| `@email-builder/core` | Document model, blocks, HTML compiler |
| `@email-builder/engine` | Headless editor and drag engine (depends on core) |
| `@email-builder/styles` | Editor stylesheet |
| `@email-builder/react` | React editor (depends on core and engine) |
| `@email-builder/vue` | Vue 3 editor (depends on core and engine) |

`examples/*` are private and are never published.

## One-time setup

1. **Create the npm organization.** The packages live under the `@email-builder` scope, which must
   belong to you before anything can be published. On npmjs.com, go to *Add Organization*, name it
   `email-builder`, and pick the free plan (unlimited public packages).
2. **Log in:** `npm login`, with an account that's a member of that organization.
3. **Turn on 2FA for publishing** on that account (npm → Account → Two-Factor Authentication).

## Every release

1. **Bump the version in all five packages together.** They depend on each other at exact
   versions, so they must move as a set. For example, from `0.1.0` to `0.1.1`:
   - `"version"` in `packages/*/package.json`
   - the `@email-builder/core` / `@email-builder/engine` entries under `"dependencies"` in
     `packages/engine`, `packages/react` and `packages/vue`
   - the root `package.json` `"version"`
2. **Add an entry to `CHANGELOG.md`.**
3. **Check everything:**

   ```sh
   npm run release:check
   ```

   This builds all packages, typechecks, runs the tests, and prints the file list of each tarball
   without publishing. Every package should contain `dist/`, `package.json`, `README.md` and
   `LICENSE`, and nothing else.
4. **Commit and tag:**

   ```sh
   git commit -am "release: v0.1.1"
   git tag v0.1.1
   git push && git push --tags
   ```

5. **Publish:**

   ```sh
   npm run release
   ```

   This reruns the checks, then publishes core, engine, styles, react and vue in that order, so
   each package's dependencies are already on npm when it arrives. npm asks for your 2FA code.

## If a publish fails halfway

npm versions can't be reused. If some packages published and others didn't, fix the problem and
publish only the missing ones at the **same** version:

```sh
npm publish -w @email-builder/react -w @email-builder/vue --access public
```

Don't bump the version for the packages that already went out.

## Undoing a release

`npm unpublish` only works within 72 hours and is discouraged. Prefer publishing a fixed patch
version and deprecating the bad one:

```sh
npm deprecate @email-builder/react@0.1.1 "Broken build — use 0.1.2"
```
