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

const baseDir = 'allure-js-action'
const allureRelease = '2.26.0'
const allureCliDir = 'allure-cli'
const allureArchiveName = 'allure-commandline.tgz'

try {
    const runTimestamp = Date.now()

    // vars
    const sourceReportDir = core.getInput('report_dir')
    const ghPagesPath = core.getInput('gh_pages')
    const reportId = core.getInput('report_id')
    const listDirs = core.getInput('list_dirs') == 'true'
    const branchName = getBranchName(github.context.ref, github.context.payload.pull_request)
    const reportBaseDir = path.join(ghPagesPath, baseDir, branchName, reportId)

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
    const ghPagesBaseDir = `${ghPagesUrl}/${baseDir}/${branchName}/${reportId}`.replaceAll(' ', '%20')
    const ghPagesReportDir = `${ghPagesBaseDir}/${runUniqueId}`.replaceAll(' ', '%20')

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
        report_url: ghPagesReportDir,
        listDirs,
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

    // folder listing
    if (listDirs) {
        if (await shouldWriteRootHtml(ghPagesPath)) {
            await writeFolderListing(ghPagesPath, '.')
        }
        await writeFolderListing(ghPagesPath, baseDir)
        await writeFolderListing(ghPagesPath, path.join(baseDir, branchName))
    }

    // process allure report
    const lastRunId = await getLastRunId(reportBaseDir)
    if (lastRunId) {
        await io.cp(path.join(reportBaseDir, lastRunId, 'history'), sourceReportDir, { recursive: true })
    }
    await writeExecutorJson(sourceReportDir, {
        runUniqueId,
        buildOrder: github.context.runId,
        buildUrl: githubActionRunUrl,
        reportUrl: ghPagesReportDir,
    })
    await spawnAllure(allureCliDir, sourceReportDir, reportDir)
    const results = await updateDataJson(reportBaseDir, reportDir, github.context.runId, runUniqueId)
    await writeAllureListing(reportBaseDir)
    await writeLastRunId(reportBaseDir, github.context.runId, runTimestamp)

    // outputs
    core.setOutput('report_url', ghPagesReportDir)
    core.setOutput('report_history_url', ghPagesBaseDir)
    core.setOutput('test_result', results.testResult)
    core.setOutput('test_result_icon', getTestResultIcon(results.testResult))
    core.setOutput('test_result_passed', results.passed)
    core.setOutput('test_result_failed', results.failed)
    core.setOutput('test_result_total', results.total)
} catch (error) {
    core.setFailed(error.message)
} finally {
    await deleteAllure(allureCliDir)
}
