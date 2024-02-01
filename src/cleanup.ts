import * as path from 'path'
import * as fs from 'fs/promises'
import { spawnProcess } from './spawnProcess.js'

export const cleanupOutdatedBranches = async (ghPagesBaseDir: string) => {
    try {
        const prefix = 'refs/heads/'
        const lsRemote = await spawnProcess('git', ['ls-remote', '--heads'])
        const remoteBranches = lsRemote
            .split('\n')
            .filter((l) => l.includes(prefix))
            .map((l) => l.split(prefix)[1])
        console.log('remoteBranches:', remoteBranches)

        const localBranches = (await fs.readdir(ghPagesBaseDir, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name)
        console.log('localBranches:', localBranches)

        for (const localBranch of localBranches) {
            if (!remoteBranches.includes(localBranch)) {
                console.log('deleting branch:', localBranch)
                await fs.rm(path.join(ghPagesBaseDir, localBranch), { recursive: true, force: true })
            } else {
                console.log('branch still exists:', localBranch)
            }
        }
    } catch (err) {
        console.error('cleanup outdated branches failed.', err)
    }
}

export const cleanupOutdatedReports = async (ghPagesBaseDir: string, maxReports: number) => {
    try {
        console.log('maxReports', maxReports)
        const localBranches = (await fs.readdir(ghPagesBaseDir, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name)

        // branches
        for (const localBranch of localBranches) {
            const reports = (await fs.readdir(path.join(ghPagesBaseDir, localBranch), { withFileTypes: true }))
                .filter((d) => d.isDirectory())
                .map((d) => d.name)

            // report per branch
            for (const reportName of reports) {
                const runs = (await fs.readdir(path.join(ghPagesBaseDir, localBranch), { withFileTypes: true }))
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
                } else {
                    console.log('no need to cleanup branch', localBranch, reportName, runs.length)
                }
            }
        }
    } catch (err) {
        console.error('cleanup outdated reports failed.', err)
    }
}
