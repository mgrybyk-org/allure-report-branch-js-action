import * as fs from 'fs/promises'
import { listingReport } from './report_listing.js'
import { isFileExist } from './isFileExists.js'

const indexHtmlFirstLine = '<!-- report-action -->'

export const writeFolderListing = async (ghPagesPath: string, relPath: string) => {
    const isRoot = relPath === '.'
    const fullPath = isRoot ? ghPagesPath : `${ghPagesPath}/${relPath}`

    const links: string[] = []
    if (!isRoot) {
        links.push('..')
    }
    const listdir = (await fs.readdir(fullPath, { withFileTypes: true }))
        .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
        .map((d) => d.name)
    links.push(...listdir)

    const data = { links }

    await fs.writeFile(`${fullPath}/data.json`, JSON.stringify(data, null, 2))
    await fs.writeFile(`${fullPath}/index.html`, listingReport)
}

export const shouldWriteRootHtml = async (ghPagesPath: string) => {
    // do noot overwrite index.html in the folder root to avoid conflicts
    const rootHtmlPath = `${ghPagesPath}/index.html`
    const isRootHtmlExisting = await isFileExist(rootHtmlPath)

    // write index.html in the folder root if it doesn't exist
    if (!isRootHtmlExisting) {
        return true
    }

    // overwrite index.html in the folder root if it was created with the Github Action
    const rootHtmlFirstLine = (await fs.readFile(rootHtmlPath)).toString('utf-8').split('\n')[0]
    if (rootHtmlFirstLine === indexHtmlFirstLine) {
        return true
    }

    // do not overwrite index.html in the folder root to avoid conflicts
    return false
}
