import * as path from 'path'
import * as core from '@actions/core'
import * as github from '@actions/github'
import * as io from '@actions/io'
import { writeFolderListing, shouldWriteRootHtml } from './src/writeFolderListing.js'
import {
    getLastRunId,
    writeExecutorJson,
    spawnAllure,
    writeLastRunId,
    updateDataJson,
    writeAllureListing,
    getTestResultIcon,
    isAllureResultsOk,
    deleteAllure,
    downloadAllure,
    extractAllure,
} from './src/allure.js'
import { getBranchName } from './src/helpers.js'
import { isFileExist } from './src/isFileExists.js'
import { cleanupOutdatedBranches, cleanupOutdatedReports } from './src/cleanup.js'
import { writeLatestReport } from './src/writeLatest.js'

const baseDir = 'allure-action'
const allureRelease = '2.34.1'
const allureCliDir = 'allure-cli'
const allureArchiveName = 'allure-commandline.tgz'

try {
    const runTimestamp = Date.now()

    // vars
    const sourceReportDir = core.getInput('report_dir')
    const ghPagesPath = core.getInput('gh_pages')
    const reportId = core.getInput('report_id')
    const listDirs = core.getInput('list_dirs') == 'true'
    const listDirsBranch = core.getInput('list_dirs_branch') == 'true'
    const branchCleanupEnabled = core.getInput('branch_cleanup_enabled') == 'true'
    const maxReports = parseInt(core.getInput('max_reports'), 10)
    const branchName = getBranchName(github.context.ref, github.context.payload.pull_request)
    const ghPagesBaseDir = path.join(ghPagesPath, baseDir)
    const reportBaseDir = path.join(ghPagesBaseDir, branchName, reportId)

    /**
     * `runId` is unique but won't change on job re-run
     * `runNumber` is not unique and resets from time to time
     * that's why the `runTimestamp` is used to guarantee uniqueness
     */
    const runUniqueId = `${github.context.runId}_${runTimestamp}`
    const reportDir = path.join(reportBaseDir, runUniqueId)

    // urls
    const githubActionRunUrl = `https://github.com/${github.context.repo.owner}/${github.context.repo.repo}/actions/runs/${github.context.runId}`
    const ghPagesUrl = `https://${github.context.repo.owner}.github.io/${github.context.repo.repo}`
    const ghPagesBaseUrl = `${ghPagesUrl}/${baseDir}/${branchName}/${reportId}`.replaceAll(' ', '%20')
    const ghPagesReportUrl = `${ghPagesBaseUrl}/${runUniqueId}`.replaceAll(' ', '%20')

    // log
    console.log({
        report_dir: sourceReportDir,
        gh_pages: ghPagesPath,
        report_id: reportId,
        runUniqueId,
        ref: github.context.ref,
        repo: github.context.repo,
        branchName,
        reportBaseDir,
        reportDir,
        report_url: ghPagesReportUrl,
        listDirs,
        listDirsBranch,
        branchCleanupEnabled,
        maxReports,
    })

    if (!(await isFileExist(ghPagesPath))) {
        throw new Error("Folder with gh-pages branch doesn't exist: " + ghPagesPath)
    }

    if (!(await isAllureResultsOk(sourceReportDir))) {
        throw new Error('There were issues with the allure-results, see error above.')
    }

    // download allure
    await downloadAllure(allureRelease, allureArchiveName)
    await extractAllure(allureCliDir, allureArchiveName)

    // action
    await io.mkdirP(reportBaseDir)

    // cleanup (should be before the folder listing)
    if (branchCleanupEnabled) {
        await cleanupOutdatedBranches(ghPagesBaseDir)
    }
    if (maxReports > 0) {
        await cleanupOutdatedReports(ghPagesBaseDir, maxReports)
    }

    // folder listing
    if (listDirs) {
        if (await shouldWriteRootHtml(ghPagesPath)) {
            await writeFolderListing(ghPagesPath, '.')
        }
        await writeFolderListing(ghPagesPath, baseDir)
    }
    if (listDirsBranch) {
        await writeFolderListing(ghPagesPath, path.join(baseDir, branchName))
    }

    // process allure report
    const lastRunId = await getLastRunId(reportBaseDir)
    if (lastRunId) {
        const historyDir = path.join(reportBaseDir, lastRunId, 'history')
        if (await isFileExist(historyDir)) {
            await io.cp(historyDir, sourceReportDir, { recursive: true })
        }
    }
    await writeExecutorJson(sourceReportDir, {
        runUniqueId,
        buildOrder: github.context.runId,
        buildUrl: githubActionRunUrl,
        reportUrl: ghPagesReportUrl,
    })
    await spawnAllure(allureCliDir, sourceReportDir, reportDir)
    const results = await updateDataJson(reportBaseDir, reportDir, github.context.runId, runUniqueId)
    await writeAllureListing(reportBaseDir)
    await writeLastRunId(reportBaseDir, github.context.runId, runTimestamp)
    await writeLatestReport(reportBaseDir)

    // outputs
    core.setOutput('report_url', ghPagesReportUrl)
    core.setOutput('report_history_url', ghPagesBaseUrl)
    core.setOutput('test_result', results.testResult)
    core.setOutput('test_result_icon', getTestResultIcon(results.testResult))
    core.setOutput('test_result_passed', results.passed)
    core.setOutput('test_result_failed', results.failed)
    core.setOutput('test_result_total', results.total)
    core.setOutput('run_unique_id', runUniqueId)
    core.setOutput('report_path', reportDir)
} catch (error) {
    core.setFailed(error.message)
} finally {
    await deleteAllure(allureCliDir)
}
