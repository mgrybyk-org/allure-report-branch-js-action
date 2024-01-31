# allure-report-branch-js-action

Allure Report with history per branch (type: `node20`)

**WARNING: Requires java to be installed in container in prior to using the action!**

See examples:

- [Allure History List](https://mgrybyk.github.io/allure-report-branch-js-action/allure-js-action/main/self-test/)
- [Allure Report](https://mgrybyk.github.io/allure-report-branch-js-action/allure-js-action/main/self-test/5931206129_1692650191550/)
- [Browse different branches](https://mgrybyk.github.io/allure-report-branch-js-action/allure-js-action/)
- [Pull Request Comment Example](https://github.com/mgrybyk/allure-report-branch-js-action/pull/1)

*Compatible with [HTML Trend Report Action](https://github.com/marketplace/actions/publish-report-per-branch).*

## Usage

1. Enable Pages in your repository settings.
![Github Pages](docs/github_pages.png "Github Pages")

2. In your workflow yaml
```yaml
permissions:
  contents: write

steps:
  - name: Checkout gh-pages
    uses: actions/checkout@v3
    if: always()
    continue-on-error: true
    with:
      ref: gh-pages # branch name
      path: gh-pages-dir # checkout path

  - name: Allure Report Action
    uses: mgrybyk/allure-report-branch-js-action@v1
    if: always()
    continue-on-error: true
    id: allure # used in comment to PR
    with:
      report_id: 'self-test'
      gh_pages: 'gh-pages-dir'
      report_dir: 'allure-results'

  - name: Git Commit and Push Action
    uses: mgrybyk/git-commit-pull-push-action@v1
    if: always()
    with:
      repository: gh-pages-dir
      branch: gh-pages
      pull_args: --rebase -X ours
```

### Adding PR Comment

Make sure to set `id` in `mgrybyk/allure-report-branch-js-action` step.

```yaml
permissions:
  # required by https://github.com/thollander/actions-comment-pull-request
  pull-requests: write

steps:
  # After publishing to gh-pages
  - name: Comment PR with Allure Report link
    if: ${{ always() && github.event_name == 'pull_request' && steps.allure.outputs.report_url }}
    continue-on-error: true
    uses: thollander/actions-comment-pull-request@v2
    with:
      message: |
        ${{ steps.allure.outputs.test_result_icon }} [Allure Report](${{ steps.allure.outputs.report_url }}) | [History](${{ steps.allure.outputs.report_history_url }})
      comment_tag: allure_report
      mode: recreate
```

### Examples Repos

- https://github.com/mgrybyk/webdriverio-devtools

## Screenshots

![Allure Reports History](docs/allure_history.png "Allure Reports History")
![PR Comment](docs/pr_comment.png "PR Comment")
![Allure Report Trend](docs/allure_trend.png "Allure Report Trend")

## API

Please see [action.yml](./action.yml)

## Troubleshooting

### Issues on push to gh-pages

Log `! [rejected]        HEAD -> gh-pages (non-fast-forward)`

Do not run your workflow concurrently per PR or branch!
```yaml
# Allow only one job per PR or branch
concurrency:
  group: ${{ github.workflow }}-${{ github.head_ref || github.ref }}
  cancel-in-progress: true # true to cancel jobs in progress, set to false otherwise
```

### Running in Windows or MacOS

The `allure-report-branch-js-action` is designed as a JavaScript action wrapped with `docker` action because `allure` requires java and is shipped with bunch of java files.

As far as `docker` action runs in linux environments only, it's required to do some extra steps for users running Windows and MacOS workflows. See [Types of actions](https://docs.github.com/en/actions/creating-actions/about-custom-actions#types-of-actions) for more details.

- option 1: using upload/download artifacts. See [simple-elf/allure-report-action/issues/28#issuecomment-1139332329](https://github.com/simple-elf/allure-report-action/issues/28#issuecomment-1139332329)
- option 2: use JS version of this action (raise an issue and I'll publish it). In this case you'll have to install Java and download download allure-commandline yourself.

## Credits

- [docker-java-node](https://github.com/timbru31/docker-java-node) for building Dockerimage with Java and NodeJS together
- [thollander/actions-comment-pull-request](https://github.com/thollander/actions-comment-pull-request) for building Github Action that comments the linked PRs

## Upcoming features

- cleanup old reports
