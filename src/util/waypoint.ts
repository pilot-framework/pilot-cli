import { exec } from "child_process"
import awsExec from "./aws/exec"
import paths from "./paths"

const dockerCopy = async (): Promise<string> => {
  const ipAddress = await awsExec.getServerIP()
  return new Promise<string>((res, rej) => {
    exec(`ssh pilot@${ipAddress} -i ${paths.TF_CLOUD_INIT} -o StrictHostKeyChecking=no \\
    "docker cp ~/.config/pilot-user-file.json waypoint-runner:/root/.config/pilot-user-file.json"`, (error, stdout) => {
      if (error) rej(error)
      res(stdout)
    })
  })
  .catch(err => {
    throw err
  })
}
  
const dockerConfig = async (gcpProjectID: string): Promise<string> => {
  const ipAddress = await awsExec.getServerIP()
  return new Promise<string>((res, rej) => {
    exec(`ssh pilot@${ipAddress} -i ${paths.TF_CLOUD_INIT} -o StrictHostKeyChecking=no \\
    "docker exec waypoint-runner gcloud config set account pilot-user@${gcpProjectID}.iam.gserviceaccount.com"`, (error, stdout) => {
      if (error) rej(error)
      res(stdout)
    })
  })
  .catch(err => {
    throw err
  })
}
  
const dockerAuth = async (gcpProjectID: string): Promise<string> => {
  const ipAddress = await awsExec.getServerIP()
  return new Promise<string>((res, rej) => {
    exec(`ssh pilot@${ipAddress} -i ${paths.TF_CLOUD_INIT} -o StrictHostKeyChecking=no \\
    "docker exec waypoint-runner gcloud auth activate-service-account pilot-user@${gcpProjectID}.iam.gserviceaccount.com \\
    --key-file=/root/.config/pilot-user-file.json"`, (error, stdout) => {
      if (error) rej(error)
      res(stdout)
    })
  })
  .catch(err => {
    throw err
  })
}

const setDockerHost = async () => {
  const dockerHost = `tcp://${await awsExec.getServerIP()}:2375`
  await setEnvVar(`DOCKER_HOST=${dockerHost}`)
}

const setEnvVars = async (envVars: Array<string>): Promise<boolean> => {
  return new Promise<boolean>((res, rej) => {
    exec(`${paths.WAYPOINT_EXEC} config set -runner ${envVars.join(" ")}`, (error) => {
      if (error) rej(error)
      res(true)
    })
  })
  .catch(err => {
    throw err
  })
}

const setEnvVar = async (envStr: string): Promise<boolean> => {
  return new Promise<boolean>((res, rej) => {
    exec(`${paths.WAYPOINT_EXEC} config set -runner ${envStr}`, (error) => {
      if (error) rej(error)
      res(true)
    })
  })
  .catch(err => {
    throw err
  })
}

const getEnvVars = async (): Promise<string> => {
  return new Promise<string>((res, rej) => {
    exec(`${paths.WAYPOINT_EXEC} config get -runner`, (error, stdout) => {
      if (error) rej(error)
      res(stdout)
    })
  })
  .catch(err => {
    throw err
  })
}

const setContext = async (ipAddress: string, token: string): Promise<void> => {
  return new Promise<void>((res, rej) => {
    exec(`${paths.WAYPOINT_EXEC} context create -server-tls-skip-verify -set-default \\
    -server-auth-token=${token} -server-addr=${ipAddress}:9701 -server-require-auth pilot-server`, (err) => {
      if (err) throw err
      res()
    })
  })
  .catch(err => {
    throw err
  })
}

const getToken = async (): Promise<string> => {
  return new Promise<string>((res, rej) => {
    exec(`${paths.WAYPOINT_EXEC} token new`, (err, data) => {
      if (err) throw err
      res(data.trim())
    })
  })
  .catch(err => {
    throw err
  })
}

export default {
  dockerAuth,
  dockerConfig,
  dockerCopy,
  setDockerHost,
  setContext,
  setEnvVar,
  setEnvVars,
  getEnvVars,
}