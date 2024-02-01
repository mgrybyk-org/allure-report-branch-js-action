import * as path from 'path'
import * as fs from 'fs/promises'
import { spawnProcess } from './spawnProcess.js'
import { normalizeBranchName } from './helpers.js'

export const cleanupOutdatedBranches = async (ghPagesBaseDir: string) => {
    try {
        const prefix = 'refs/heads/'
        const lsRemote = await spawnProcess('git', ['ls-remote', '--heads'])
        const remoteBranches = lsRemote
            .split('\n')
            .filter((l) => l.includes(prefix))
            .map((l) => normalizeBranchName(l.split(prefix)[1]))

        const localBranches = (await fs.readdir(ghPagesBaseDir, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name)

        for (const localBranch of localBranches) {
            if (!remoteBranches.includes(localBranch)) {
                await fs.rm(path.join(ghPagesBaseDir, localBranch), { recursive: true, force: true })
            }
        }
    } catch (err) {
        console.error('cleanup outdated branches failed.', err)
    }
}

export const cleanupOutdatedReports = async (ghPagesBaseDir: string, maxReports: number) => {
    try {
        const localBranches = (await fs.readdir(ghPagesBaseDir, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name)

        // branches
        for (const localBranch of localBranches) {
            const reports = (await fs.readdir(path.join(ghPagesBaseDir, localBranch), { withFileTypes: true }))
                .filter((d) => d.isDirectory())
                .map((d) => d.name)

            // report per branch
            for (const reportName of reports) {
                const runs = (await fs.readdir(path.join(ghPagesBaseDir, localBranch, reportName), { withFileTypes: true }))
                    .filter((d) => d.isDirectory())
                    .map((d) => d.name)

                // run per report
                if (runs.length > maxReports) {
                    runs.sort()
                    while (runs.length > maxReports) {
                        await fs.rm(path.join(ghPagesBaseDir, localBranch, reportName, runs.shift() as string), {
                            recursive: true,
                            force: true,
                        })
                    }
                }
            }
        }
    } catch (err) {
        console.error('cleanup outdated reports failed.', err)
    }
}
