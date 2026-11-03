# Justin Clagg’s website

A static Angular website for [www.justinclagg.com](https://www.justinclagg.com/). Angular prerenders the about and contact pages during the build. Both pages work without JavaScript. The build includes its fonts and their SIL Open Font License.

## Local development

Use the Node.js version in `.nvmrc` and install dependencies from the lockfile.

```sh
nvm use
npm ci
npm start
```

Open `http://localhost:4200/`. Edit the page copy in `src/app/home.html` and `src/app/contact.html`, the page metadata in the corresponding TypeScript files, and shared styles in `src/styles.css`. Static files, redirect pages, and the custom 404 live in `public/`.

## Background effect and lab

`npm start` shows the effects lab panel; H hides it. Tune the effect, use **Copy as site default**, and paste the result into `src/app/flow-field/flow-settings.ts`. Production builds never include the lab.

## Verify the production build

```sh
npx playwright install chromium
npm run check
npm run preview
```

On Linux CI, use `npx playwright install --with-deps chromium` to install browser system dependencies. The check builds the production site and development lab, runs browser tests against the built files, and audits the entire npm dependency tree. The preview server at `http://127.0.0.1:4173/` models static directory indexes and custom 404 responses for local validation.

Publish only the files in `dist/website/browser/`. That directory is the static artifact and can be served without npm, Angular, or a Node.js process. The rest of `dist/website/` contains build metadata or build-time files.

## Publish a routine update

Pushing to `master` does not deploy the site. Run the **Deploy website** workflow after the change reaches `master`.

1. Run `npm run check` and merge the change to `master` after any required review.
2. In **Actions → Deploy website**, select **Run workflow** and choose `master`.
3. Wait for the build and deployment jobs to succeed, then [verify the live host](#verify-the-live-host).

The pull request workflow runs checks with read-only permissions. The deploy workflow runs the checks again and uploads only `dist/website/browser/`. Its deployment job has only Pages and OpenID Connect permissions.

### What is public

Everything in `public/` is copied into the site artifact. Treat that directory and the generated browser output as public, including JavaScript bundles and assets that the site does not link to. Keep credentials, private documents, and local configuration out of the artifact and the repository.

The GitHub repository is also public. Files tracked there, including source and documentation, can be read on GitHub. Removing a file in a later commit leaves earlier copies in Git history.

### Verify the live host

Check that `/` and `/contact/` return HTTP 200 and show the matching page and canonical URL. Check that `/contact` resolves to `/contact/`. The legacy `/contact.html` and `/construction.html` pages use immediate HTML redirects with visible link fallbacks. Open them in a browser to confirm the final addresses. Check that an unknown path returns HTTP 404 with the custom page. Also check `/robots.txt`, `/sitemap.xml`, and the contact links.

## Set up or restore GitHub Pages

Use these steps when configuring Pages for the first time or changing its hosting settings.

1. Before changing settings, record the current Pages source, custom domain, DNS records, and last working revision or Pages deployment, if available.
2. In **Settings → Pages**, select **GitHub Actions** as the source and set the custom domain to `www.justinclagg.com`. Limit the `github-pages` environment to deployments from `master`. GitHub stores the domain in repository settings for Actions deployments. The artifact also includes `CNAME` for portability.
3. Confirm the `www` DNS record points to the Pages hostname. [Run a release](#publish-a-routine-update), allow DNS and certificate provisioning to finish, then enable **Enforce HTTPS**. Verify that the canonical host has a valid certificate and serves the artifact over HTTPS.

### Roll back

For an issue after a successful Actions release, use a reviewed revert or corrective change on `master` and run **Deploy website** again. Verify the replacement deployment and repeat the live checks.

If the first Actions release fails and a replacement deployment is unavailable, publish the emergency landing page in `fallback/index.html`. It contains inline styles and working contact links. Prepare a recovery branch whose publishing root contains only a copy of that file named `index.html`, `public/404.html` as `404.html`, and the `CNAME`, `.nojekyll`, and favicon files from `public/`. In **Settings → Pages**, select **Deploy from a branch** and choose the recovery branch and its root directory. Confirm that the custom domain and HTTPS settings match the recorded configuration. Verify the fallback home page, its contact links, and an HTTP 404 on the live host. Return to the Actions publishing source and run **Deploy website** once the full site is ready again.
