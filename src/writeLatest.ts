import * as path from 'path'
import * as fs from 'fs/promises'
import { latestReport } from './report_latest.js'

export const writeLatestReport = async (relPath: string) => {
    await fs.writeFile(path.join(relPath, 'latest.html'), latestReport)
}
