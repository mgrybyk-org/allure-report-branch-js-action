interface AllureSummaryStatistic {
    failed: number
    broken: number
    skipped: number
    passed: number
    unknown: number
    total: number
}

interface AllureSummaryTime {
    start: number
    stop: number
    duration: number
    minDuration: number
    maxDuration: number
    sumDuration: number
}

type AllureRecordTestResult = 'PASS' | 'FAIL' | 'UNKNOWN'

interface AllureRecord {
    timestamp: number
    runId: number
    runUniqueId: string
    testResult: AllureRecordResult
    summary: {
        statistic: AllureSummaryStatistic
        time: AllureSummaryTime
    }
}

interface AllureSummaryJson {
    reportName: string
    testRuns: unknown[]
    statistic: AllureSummaryStatistic
    time: AllureSummaryTime
}

interface LastRunJson {
    runId: number
    runTimestamp: number
}

interface AllureExecutor {
    type: 'github'
    name: string
    buildName: string
    buildUrl: string
    reportUrl: string
    buildOrder: number
}
