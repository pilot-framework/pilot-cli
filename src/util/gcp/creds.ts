import paths from '../paths'
import fsUtil from '../../util/fs'
import { existsSync } from 'fs'

const getGCPZone = async (): Promise<string> => {
  const path = existsSync(paths.PILOT_GCP_CONFIG) ? paths.PILOT_GCP_CONFIG : paths.GCP_CONFIG
  const cfg = await fsUtil.fileToString(path)
  const defaultZone = cfg.match(/zone = \S*/)

  if (defaultZone === null) {
    return ''
  }

  return defaultZone[0].replace('zone = ', '')
}

const getGCPRegion = async (): Promise<string> => {
  const zone = (await getGCPZone()).split('-')

  return `${zone[0]}-${zone[1]}`
}

const getGCPProject = async (): Promise<string> => {
  const path = existsSync(paths.PILOT_GCP_CONFIG) ? paths.PILOT_GCP_CONFIG : paths.GCP_CONFIG
  const cfg = await fsUtil.fileToString(path)
  const defaultProject = cfg.match(/project = \S*/)

  if (defaultProject === null) {
    return ''
  }

  return defaultProject[0].replace('project = ', '')
}

export default {
  getGCPProject,
  getGCPZone,
  getGCPRegion,
}
