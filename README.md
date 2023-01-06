# Cypress REST API Test Framework

[![Actions Status](https://github.com/ashikkumar23/api-testing-cypress/workflows/Update%20Dependencies/badge.svg)](https://github.com/ashikkumar23/api-testing-cypress/actions/workflows/package_update.yml)
[![Actions Status](https://github.com/ashikkumar23/api-testing-cypress/workflows/Run%20API%20Tests%20and%20Generate%20Cypress%20Report/badge.svg)](https://github.com/ashikkumar23/api-testing-cypress/actions/workflows/cypress_report.yml)
[![Actions Status](https://github.com/ashikkumar23/api-testing-cypress/actions/workflows/pages/pages-build-deployment/badge.svg)](https://github.com/ashikkumar23/api-testing-cypress/actions/workflows/pages/pages-build-deployment)

API Testing Framework using `Cypress` with `GitHub Actions` workflow for generating and publishing test report

## 🚀 Description:

Automated CRUD (i.e., `POST`, `GET`, `PUT`, `DELETE`) operations using `Cypress`

## 🚀 Prerequisites:

- [nodejs](https://nodejs.org/en/)
- [npm](https://docs.npmjs.com/about-npm)
- [Cypress](https://www.cypress.io/)
- [Go Rest APIs](https://gorest.co.in)

## 🚀 Installation Steps:

- [Fork](https://github.com/ashikkumar23/api-testing-cypress/fork) and Clone the repository `api-testing-cypress`
- Move to the `api-testing-cypress` directory:

```commandline
cd api-testing-cypress
```

- Set up a new npm package:

```commandline
npm init
```

- Install cypress:

```commandline
npm install cypress
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
npm run cypress:run
```

- To run the tests against the [Cypress Test Runner](https://docs.cypress.io/guides/core-concepts/cypress-app#The-Test-Runner):

```commandline
npm run cypress:open
```

- On [Cypress Test Runner](https://docs.cypress.io/guides/core-concepts/cypress-app#The-Launchpad):
  - Select `E2E Testing`
  - Choose a browser: `Chrome` or `Electron`
  - Click on `Start E2E Testing in {browser}`
  - Once the test runner has loaded, click on the spec file i.e., `test_crud.cy.js` to run the test

## 🚀 Reporting:

- Install [mochawesome](https://www.npmjs.com/package/mochawesome) dependencies:

```commandline
npm install --save-dev mocha cypress-multi-reporters mochawesome
```

```commandline
npm install --save-dev mochawesome-merge
```

```commandline
npm install --save-dev mochawesome-report-generator
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
  - Currently, the workflow can be triggered manually via `workflow_dispatch` or on every push to the `master` branch
  - Your site should be deployed at `https://{GITHUB_ACCOUNT_NAME}.github.io/{REPOSITORY_NAME}/`
- The final test report can be viewed here, https://ashikkumar23.github.io/api-testing-cypress/

## 🚀 Notes:

- `.github/workflows/package_update.yml` workflow would ensure the dependencies are up-to-date
- Tests are always run on the latest dependencies ✅
