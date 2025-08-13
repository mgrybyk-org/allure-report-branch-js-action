import * as fs from 'fs/promises'

export const isFileExist = async (filePath: string) => {
    try {
        await fs.access(filePath, 0)
        return true
    } catch {
        return false
    }
}
