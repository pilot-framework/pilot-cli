import { exec } from 'child_process'
import awsExec from './aws/exec'
import gcpExec from './gcp/exec'
import paths from './paths'

const dockerCopy = async (provider: string): Promise<string> => {
  let ipAddress: string

  if (provider === 'aws')
    ipAddress = await awsExec.getServerIP()
  else if (provider === 'gcp') {
    ipAddress = await gcpExec.getServerIP('us-east1-b', 'gcp-pilot-testing')
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

const dockerConfig = async (gcpProjectID: string, provider: string): Promise<string> => {
  let ipAddress: string

  if (provider === 'aws')
    ipAddress = await awsExec.getServerIP()
  else if (provider === 'gcp') {
    ipAddress = await gcpExec.getServerIP('us-east1-b', 'gcp-pilot-testing')
  }

  return new Promise<string>((res, rej) => {
    exec(`ssh pilot@${ipAddress} -i ${paths.PILOT_SSH} -o StrictHostKeyChecking=no \\
    'docker exec waypoint-runner gcloud config set account pilot-user@${gcpProjectID}.iam.gserviceaccount.com'`, (error, stdout) => {
      if (error) rej(error)
      res(stdout)
    })
  })
    .catch(error => {
      throw error
    })
}

const dockerAuth = async (gcpProjectID: string, provider: string): Promise<string> => {
  let ipAddress: string

  if (provider === 'aws')
    ipAddress = await awsExec.getServerIP()
  else if (provider === 'gcp') {
    ipAddress = await gcpExec.getServerIP('us-east1-b', 'gcp-pilot-testing')
  }

  return new Promise<string>((res, rej) => {
    exec(`ssh pilot@${ipAddress} -i ${paths.PILOT_SSH} -o StrictHostKeyChecking=no \\
    'docker exec waypoint-runner gcloud auth activate-service-account pilot-user@${gcpProjectID}.iam.gserviceaccount.com \\
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

const setEnvVar = async (envStr: string): Promise<boolean> => {
  return new Promise<boolean>((res, rej) => {
    exec(`${paths.WAYPOINT_EXEC} config set -runner ${envStr}`, error => {
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

export default {
  dockerAuth,
  dockerConfig,
  dockerCopy,
  setContext,
  setDefaultContext,
  setEnvVar,
  setEnvVars,
  getEnvVars,
  getToken,
}
