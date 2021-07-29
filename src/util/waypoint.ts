import { exec } from 'child_process'
import awsExec from './aws/exec'
import fs from './fs'
import creds from './gcp/creds'
import gcpExec from './gcp/exec'
import paths from './paths'

const dockerCopy = async (): Promise<string> => {
  const serverPlatform = (await fs.getPilotMetadata()).serverPlatform
  let ipAddress: string

  if (serverPlatform === 'aws')
    ipAddress = await awsExec.getServerIP()
  else if (serverPlatform === 'gcp') {
    ipAddress = await gcpExec.getServerIP()
  }

  return new Promise<string>((res, rej) => {
    exec(`ssh pilot@${ipAddress} -i ${paths.PILOT_SSH} -o StrictHostKeyChecking=no \\
    'docker cp ~/.config/pilot-user-file.json waypoint-runner:/root/.config/pilot-user-file.json'`, (error, stdout) => {
      if (error) rej(error)
      res(stdout)
    })
  })
    .catch(error => {
      throw error
    })
}

const dockerConfig = async (): Promise<string> => {
  const serverPlatform = (await fs.getPilotMetadata()).serverPlatform
  const defaultProject = await creds.getGCPProject()
  let ipAddress: string

  if (serverPlatform === 'aws')
    ipAddress = await awsExec.getServerIP()
  else if (serverPlatform === 'gcp') {
    ipAddress = await gcpExec.getServerIP()
  }

  return new Promise<string>((res, rej) => {
    exec(`ssh pilot@${ipAddress} -i ${paths.PILOT_SSH} -o StrictHostKeyChecking=no \\
    'docker exec waypoint-runner gcloud config set account pilot-user@${defaultProject}.iam.gserviceaccount.com'`, (error, stdout) => {
      if (error) rej(error)
      res(stdout)
    })
  })
    .catch(error => {
      throw error
    })
}

const dockerAuth = async (): Promise<string> => {
  const serverPlatform = (await fs.getPilotMetadata()).serverPlatform
  const defaultProject = await creds.getGCPProject()
  let ipAddress: string

  if (serverPlatform === 'aws')
    ipAddress = await awsExec.getServerIP()
  else if (serverPlatform === 'gcp') {
    ipAddress = await gcpExec.getServerIP()
  }

  return new Promise<string>((res, rej) => {
    exec(`ssh pilot@${ipAddress} -i ${paths.PILOT_SSH} -o StrictHostKeyChecking=no \\
    'docker exec waypoint-runner gcloud auth activate-service-account pilot-user@${defaultProject}.iam.gserviceaccount.com \\
    --key-file=/root/.config/pilot-user-file.json'`, (error, stdout) => {
      if (error) rej(error)
      res(stdout)
    })
  })
    .catch(error => {
      throw error
    })
}

const setEnvVars = async (envVars: Array<string>): Promise<boolean> => {
  return new Promise<boolean>((res, rej) => {
    exec(`${paths.WAYPOINT_EXEC} config set -runner ${envVars.join(' ')}`, error => {
      if (error) rej(error)
      res(true)
    })
  })
    .catch(error => {
      throw error
    })
}

const getEnvVars = async (): Promise<string> => {
  return new Promise<string>((res, rej) => {
    exec(`${paths.WAYPOINT_EXEC} config get -runner`, (error, stdout) => {
      if (error) rej(error)
      res(stdout)
    })
  })
    .catch(error => {
      throw error
    })
}

const setContext = async (ipAddress: string, token: string): Promise<void> => {
  return new Promise<void>((res, rej) => {
    exec(`${paths.WAYPOINT_EXEC} context create -server-tls-skip-verify -set-default \\
    -server-auth-token=${token.trim()} -server-addr=${ipAddress}:9701 -server-require-auth pilot-server`, error => {
      if (error) rej(error)
      res()
    })
  })
    .catch(error => {
      throw error
    })
}

const setDefaultContext = async (): Promise<void> => {
  return new Promise<void>((res, rej) => {
    exec(`${paths.WAYPOINT_EXEC} context use pilot-server`, error => {
      if (error) rej(error)
      res()
    })
  })
    .catch(error => {
      throw error
    })
}

const getToken = async (): Promise<string> => {
  return new Promise<string>((res, rej) => {
    exec(`${paths.WAYPOINT_EXEC} token new`, (error, data) => {
      if (error) rej(error)
      res(data.trim())
    })
  })
    .catch(error => {
      throw error
    })
}

const newProject = async (projectName: string): Promise<void> => {
  return new Promise<void>((res, rej) => {
    exec(`${paths.WAYPOINT_EXEC} project apply ${projectName}`, err => {
      if (err) rej(err)
      res()
    })
  })
    .catch(error => {
      throw error
    })
}

const getProjects = async (): Promise<Array<string>> => {
  return new Promise<Array<string>>((res, rej) => {
    exec(`${paths.WAYPOINT_EXEC} project list`, (err, data) => {
      if (err) rej(err)
      res(data.split(/\n/))
    })
  })
    .catch(error => {
      throw error
    })
}

export default {
  dockerAuth,
  dockerConfig,
  dockerCopy,
  setContext,
  setDefaultContext,
  setEnvVars,
  getEnvVars,
  getProjects,
  newProject,
  getToken,
}
