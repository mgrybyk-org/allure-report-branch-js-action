/* eslint-disable @typescript-eslint/ban-ts-comment */
import * as child_process from 'child_process'
import * as fs from 'fs/promises'
import * as path from 'path'
import { platform } from 'process'
// @ts-ignore lib provides no types
import decompress from '@xhmikosr/decompress'
// @ts-ignore lib provides no types
import decompressTargz from '@xhmikosr/decompress-targz'
import { allureReport } from './report_allure.js'
import { isFileExist } from './isFileExists.js'

export const writeExecutorJson = async (
    sourceReportDir: string,
    {
        buildUrl,
        buildOrder,
        reportUrl,
        runUniqueId,
    }: {
        buildUrl: string
        runUniqueId: string
        buildOrder: number
        reportUrl: string
    }
) => {
    const dataFile = path.join(sourceReportDir, 'executor.json')
    const dataJson: AllureExecutor = {
        // type is required, otherwise allure fails with java.lang.NullPointerException
        type: 'github',
        // adds link to GitHub Actions Run
        name: 'GitHub Actions',
        buildName: `Run ${runUniqueId}`,
        buildUrl,
        // required to open previous report in TREND
        reportUrl,
        buildOrder,
    }
    await fs.writeFile(dataFile, JSON.stringify(dataJson, null, 2))
}

export const extractAllure = async (allureCliDir: string, allureArchiveName: string) => {
    await decompress(allureArchiveName, '.', {
        map: (file: { data: Buffer; mode: number; mtime: string; path: string; type: string }) => {
            if (platform === 'win32') {
                console.log(file.path)
            }
            file.path = `${allureCliDir}${file.path.substring(file.path.indexOf('/'))}`
            return file
        },
        plugins: [decompressTargz()],
    })
    console.log('successfully extracted', allureArchiveName, 'to', allureCliDir)
}

export const downloadAllure = async (allureRelease: string, allureArchiveName: string) => {
    const downloadUrl = `https://repo.maven.apache.org/maven2/io/qameta/allure/allure-commandline/${allureRelease}/allure-commandline-${allureRelease}.tgz`
    const res = await fetch(downloadUrl)
    const blob = await res.blob()
    // @ts-ignore some nodejs bug converting stream to stream
    await fs.writeFile(allureArchiveName, blob.stream())
    console.log('successfully downloaded allure', allureRelease)
}

export const deleteAllure = async (allureCliDir: string) => {
    try {
        await fs.rm(allureCliDir, { recursive: true, force: true })
    } catch (err) {
        console.error(err)
    }
}

export const spawnAllure = async (allureCliDir: string, allureResultsDir: string, allureReportDir: string) => {
    const cliArgs = ['generate', '--clean', allureResultsDir, '-o', allureReportDir]
    let allureChildProcess: child_process.ChildProcess
    if (platform === 'win32') {
        allureChildProcess = child_process.spawn('cmd', ['/c', path.join(allureCliDir, 'bin', 'allure.bat'), ...cliArgs], {
            stdio: 'inherit',
        })
    } else {
        allureChildProcess = child_process.spawn(`${allureCliDir}/bin/allure`, cliArgs, { stdio: 'inherit' })
    }
    const generation = new Promise<void>((resolve, reject) => {
        allureChildProcess.once('error', reject)
        allureChildProcess.once('exit', (code: unknown) => (code === 0 ? resolve() : reject(code)))
    })

    return generation
}

export const getLastRunId = async (reportBaseDir: string) => {
    const dataFile = path.join(reportBaseDir, 'lastRun.json')

    if (await isFileExist(dataFile)) {
        const lastRun: LastRunJson = JSON.parse((await fs.readFile(dataFile)).toString('utf-8'))
        return `${lastRun.runId}_${lastRun.runTimestamp}`
    } else {
        return null
    }
}

export const writeLastRunId = async (reportBaseDir: string, runId: number, runTimestamp: number) => {
    const dataFile = path.join(reportBaseDir, 'lastRun.json')

    const dataJson: LastRunJson = { runId, runTimestamp }

    await fs.writeFile(dataFile, JSON.stringify(dataJson, null, 2))
}

export const updateDataJson = async (reportBaseDir: string, reportDir: string, runId: number, runUniqueId: string) => {
    const summaryJson: AllureSummaryJson = JSON.parse(
        (await fs.readFile(path.join(reportDir, 'widgets', 'summary.json'))).toString('utf-8')
    )
    const dataFile = path.join(reportBaseDir, 'data.json')
    let dataJson: AllureRecord[]

    if (await isFileExist(dataFile)) {
        dataJson = JSON.parse((await fs.readFile(dataFile)).toString('utf-8'))
    } else {
        dataJson = []
    }

    const failedTests = summaryJson.statistic.broken + summaryJson.statistic.failed
    const testResult: AllureRecordTestResult = failedTests > 0 ? 'FAIL' : summaryJson.statistic.passed > 0 ? 'PASS' : 'UNKNOWN'
    const record: AllureRecord = {
        runId,
        runUniqueId,
        testResult,
        timestamp: summaryJson.time.start,
        summary: {
            statistic: summaryJson.statistic,
            time: summaryJson.time,
        },
    }
    dataJson.unshift(record)
    await fs.writeFile(dataFile, JSON.stringify(dataJson, null, 2))

    return {
        testResult,
        passed: summaryJson.statistic.passed,
        failed: failedTests,
        total: summaryJson.statistic.total,
    }
}

export const getTestResultIcon = (testResult: AllureRecordTestResult) => {
    if (testResult === 'PASS') {
        return '✅'
    }
    if (testResult === 'FAIL') {
        return '❌'
    }
    return '❔'
}

export const writeAllureListing = async (reportBaseDir: string) => fs.writeFile(path.join(reportBaseDir, 'index.html'), allureReport)

export const isAllureResultsOk = async (sourceReportDir: string) => {
    if (await isFileExist(sourceReportDir)) {
        const listfiles = (await fs.readdir(sourceReportDir, { withFileTypes: true })).filter(
            (d) => d.isFile() && d.name.toLowerCase().endsWith('.json')
        )

        if (listfiles.length > 0) {
            return true
        }
        console.log('allure-results folder has no json files:', sourceReportDir)
        return false
    }
    console.log("allure-results folder doesn't exist:", sourceReportDir)
    return false
}
