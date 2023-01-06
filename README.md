# Cypress REST API Test Framework

API Testing Framework using `Cypress` with `GitHub Actions` workflow for generating and publishing test report

## 🚀 Description:

Automated CRUD (i.e., `POST`, `GET`, `PUT`, `DELETE`) operations using `Cypress`

## 🚀 Prerequisites:

- `Node.js` and `npm`, https://www.npmjs.com/get-npm explains what are these and how to install them
- `Cypress`
- Go Rest APIs, https://gorest.co.in

## 🚀 Installation Steps:

- Fork the repository `api-testing-cypress`
- Clone the repository via HTTPS `git clone https://github.com/<your_github_username>/api-testing-cypress.git` or via SSH `git clone git@github.com:<your_github_username>/api-testing-cypress.git`
- Move to the `api-testing-cypress` directory
- Set up a new npm package:

```commandline
$ npm init
```

- Install cypress:

```commandline
$ npm install cypress
```

- Add the following lines to the `package.json` file, `"scripts"` section:

```json
  "scripts": {
    "cypress:open": "./node_modules/.bin/cypress open",
    "cypress:run": "./node_modules/.bin/cypress run --spec **/*.cy.js"
  }
```

## 🚀 Test Execution:

- To run the tests on your terminal:

```commandline
$ npm run cypress:run
```

- To run the tests against the Cypress Test Runner:

```commandline
$ npm run cypress:open
```

- On Cypress Test Runner:
  - Select `E2E Testing`
  - Choose a browser: `Chrome` or `Electron`
  - Click on `Start E2E Testing in {browser}`
  - Once the test runner has loaded, click on the spec file i.e., `test_crud.cy.js` to run the test

## 🚀 Reporting:

- Install `mochawesome` dependencies:

```commandline
$ npm install --save-dev mocha cypress-multi-reporters mochawesome
```

```commandline
$ npm install --save-dev mochawesome-merge
```

```commandline
$ npm install --save-dev mochawesome-report-generator
```

- Add the following lines to the `package.json` file, `"scripts"` section:

```json
  "scripts": {
    "report:merge": "mochawesome-merge cypress/reports/json/*.json > index.json",
    "report:generate": "marge index.json --reportDir public --assetsDir public/assets --reportPageTitle index.html"
  }
```

- For reference, check out https://github.com/ashikkumar23/api-testing-cypress/blob/master/.github/workflows/cypress_report.yml
- Finally, enable the GitHub Pages feature for your repository:
  - Navigate to `Settings` > `Pages` > Make sure that `Source` is set to `Deploy from a branch` and `Branch` as `gh-pages`
  - Trigger the workflow manually via `workflow_dispatch:` or scheduled test execution via `schedule:`
  - Your site should be deployed at `https://{GITHUB_ACCOUNT_NAME}.github.io/{REPOSITORY_NAME}/`, example: https://ashikkumar23.github.io/api-testing-cypress/

## 🚀 Notes:

- `.github/workflows/package_update.yml` workflow would ensure the dependencies are up-to-date
- Tests are always run on the latest dependencies ✅
