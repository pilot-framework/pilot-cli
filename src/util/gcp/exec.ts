import {exec} from 'child_process'
import paths from '../paths'
const {google} = require('googleapis');
const compute = google.compute('v1');
const fs = require('fs')
let cmd = "waypoint install -platform=docker -docker-server-image=pilotframework/pilot-waypoint -accept-tos"

let echo = "echo hello world"

const terraInit = () => {
  return new Promise((res, rej) => {
    exec(`${paths.TERRAFORM_EXEC} -chdir=${paths.GCP_INSTANCES} init`, (error, _) => {
      if (error) rej(error)
      res('success')
    })
  })
  .catch(error => {
    throw error
  })
}

const terraApply = () => {
  return new Promise((res, rej) => {
    exec(`${paths.TERRAFORM_EXEC} -chdir=${paths.GCP_INSTANCES} apply -auto-approve`, (error, _) => {
      if (error) rej(error)
      res('success')
    })
  })
  .catch(error => {
    throw error
  })
}

const terraDestroy = () => {
  return new Promise((res, rej) => {
    exec(`${paths.TERRAFORM_EXEC} -chdir=${paths.GCP_INSTANCES} destroy -auto-approve`, (error, _) => {
      if (error) rej(error)
      res('success')
    })
  })
  .catch(error => {
    throw error
  })
}

const getServerStatus = (callback) => {
  return new Promise((res, rej) => {
  exec("gcloud compute instances describe pilot-gcp-instance --format=json", (error, stdout) => {
    if (error) rej(error)
      res(stdout)
    })
  })
  .then(result => {
    callback(result)
  })
  .catch(error => {
    throw error
  })
}

const installWaypoint = async () => {
  let status;
  while (status !== 'RUNNING') {
    await getServerStatus((result) => {
      let data = JSON.parse(result)
      status = data.status
    })
  }

  return new Promise((res, rej) => {
    console.log(status)
    exec(cmd, (error, stdout, stderr) => {
      if (error) console.log(error)
      res(stdout)
    })
  })
  .catch(error => {
    throw error
  }) 
}

export default {
  terraInit,
  terraApply,
  terraDestroy,
  installWaypoint,
}

