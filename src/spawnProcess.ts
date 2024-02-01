import * as child_process from 'child_process'

const logError = (err: unknown, output: string[]) => {
    console.log(output.join(''))
    return err
}

export const spawnProcess = async (command: string, args: string[], cwd?: string) => {
    const childProcess = child_process.spawn(command, args, { cwd })
    return new Promise<string>((resolve, reject) => {
        const output: string[] = []
        const r1 = childProcess.stdout?.on('data', (d) => output.push(d.toString()))
        const r2 = childProcess.stderr?.on('data', (d) => output.push(d.toString()))

        const p1 = new Promise<void>((resolve) => (r1 ? r1.once('close', resolve) : resolve()))
        const p2 = new Promise<void>((resolve) => (r2 ? r2.once('close', resolve) : resolve()))

        childProcess.once('error', (err) => reject(logError(err, output)))
        childProcess.once('exit', async (code: unknown) => {
            r1?.removeAllListeners('data')
            r2?.removeAllListeners('data')
            await p1
            await p2
            return code === 0 ? resolve(output.join('')) : reject(logError(code, output))
        })
    })
}
