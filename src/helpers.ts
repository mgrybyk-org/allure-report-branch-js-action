import type { context } from '@actions/github'

export const getBranchName = (gitRef: string, pull_request?: (typeof context)['payload']) => {
    const branchName: string = pull_request ? pull_request.head.ref : gitRef.replace('refs/heads/', '')

    return branchName.replaceAll('/', '_').replaceAll('.', '_')
}
