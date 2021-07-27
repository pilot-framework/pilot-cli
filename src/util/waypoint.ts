import { exec } from "child_process"
import awsExec from "./aws/exec"
import paths from "./paths"

const dockerCopy = async () => {
  const ipAddress = String(await awsExec.getServerIP())
  return new Promise((res, rej) => {
    exec(`ssh pilot@${ipAddress} -i ${paths.TF_CLOUD_INIT} -o StrictHostKeyChecking=no "docker cp ~/.config/pilot-user-file.json waypoint-runner:/root/.config/pilot-user-file.json"`, (error, stdout) => {
      if (error) rej(error)
      res(stdout)
    })
  })
  .catch(err => {
    throw err
  })
}
  
const dockerConfig = async (gcpProjectID: string) => {
  const ipAddress = String(await awsExec.getServerIP())
  return new Promise((res, rej) => {
    exec(`ssh pilot@${ipAddress} -i ${paths.TF_CLOUD_INIT} -o StrictHostKeyChecking=no "docker exec waypoint-runner gcloud config set account pilot-user@${gcpProjectID}.iam.gserviceaccount.com"`, (error, stdout) => {
      if (error) rej(error)
      res(stdout)
    })
  })
  .catch(err => {
    throw err
  })
}
  
const dockerAuth = async (gcpProjectID: string) => {
  const ipAddress = String(await awsExec.getServerIP())
  return new Promise((res, rej) => {
    exec(`ssh pilot@${ipAddress} -i ${paths.TF_CLOUD_INIT} -o StrictHostKeyChecking=no "docker exec waypoint-runner gcloud auth activate-service-account pilot-user@${gcpProjectID}.iam.gserviceaccount.com --key-file=/root/.config/pilot-user-file.json"`, (error, stdout) => {
      if (error) rej(error)
      res(stdout)
    })
  })
  .catch(err => {
    throw err
  })
}

const setEnvVar = async (envStr: string) => {
  return new Promise((res, rej) => {
    exec(`${paths.WAYPOINT_EXEC} config set -runner ${envStr}`, (error, stdout) => {
      if (error) rej(error)
      res(stdout)
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
  setEnvVar,
}