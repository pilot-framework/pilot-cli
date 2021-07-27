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

const serviceAccountExists = (gcpProjectID: string) => {
  return new Promise((res, rej) => {
    exec(`gcloud iam service-accounts describe pilot-user@${gcpProjectID}.iam.gserviceaccount.com`, (error, _) => {
      if (error) {
        let errMsg = error.toString()

        if (errMsg.includes("NOT_FOUND")) {
          res(false)
        }
        
        rej(error)
      }
      res(true)
    }) 
  })
  .catch(error => {
    throw error
  })
}

const pilotRoleExists = async (gcpProjectID: string) => {
  return new Promise((res, rej) => {
    exec(`gcloud iam roles describe pilotService --project ${gcpProjectID}`, (error, stdout) => {
      if (error) {
        let errMsg = error.toString()

        if (errMsg.includes("NOT_FOUND")) {
          res(false)
        }
        
        rej(error)
      }
      res(true)
    }) 
  })
  .catch(error => {
    throw error
  })
}

const createServiceAccount = (gcpProjectID: string) => {
  return new Promise((res, rej) => {
    exec(`gcloud iam service-accounts create pilot-user --project ${gcpProjectID}`, (error, stdout) => {
      if (error) rej(error)
      res(stdout)
    })
  })
  .catch(error => {
    throw error
  })
}

const serviceAccountKeyGen = async (gcpProjectID: string) => {
  return new Promise((res, rej) => {
    exec(`gcloud iam service-accounts keys create ~/.pilot/gcp/service/pilot-user-file.json --iam-account=pilot-user@${gcpProjectID}.iam.gserviceaccount.com`, (error, stdout) => {
      if (error) rej(error)
      res(stdout)
    })
  })
  .catch(error => {
    throw error
  })
}

const createIAMRole = async (gcpProjectID: string) => {
  return new Promise((res, rej) => {
    exec(`gcloud iam roles create pilotService \\
    --project ${gcpProjectID} --title "Pilot Framework IAM Role" \\
    --description "This role has the necessary permissions that the Pilot service account uses to deploy applications" \\
    --permissions compute.addresses.list,compute.backendBuckets.create,compute.backendBuckets.delete,compute.backendBuckets.get,compute.backendBuckets.use,compute.globalAddresses.create,compute.globalAddresses.delete,compute.globalAddresses.get,compute.globalAddresses.use,compute.globalForwardingRules.create,compute.globalForwardingRules.delete,compute.globalForwardingRules.get,compute.globalOperations.get,compute.regions.list,compute.sslCertificates.create,compute.sslCertificates.delete,compute.sslCertificates.get,compute.sslCertificates.list,compute.targetHttpsProxies.create,compute.targetHttpsProxies.delete,compute.targetHttpsProxies.get,compute.targetHttpsProxies.use,compute.urlMaps.create,compute.urlMaps.delete,compute.urlMaps.get,compute.urlMaps.list,compute.urlMaps.use,storage.buckets.create,storage.buckets.delete \\
    --quiet`, (error, stdout) => {
      if (error) rej(error)
    })
  })
  .catch(error => {
    throw error
  })
}

const bindIAMRole = async (gcpProjectID: string) => {
  return new Promise((res, rej) => {
    exec(`gcloud projects add-iam-policy-binding ${gcpProjectID} --member="serviceAccount:pilot-user@${gcpProjectID}.iam.gserviceaccount.com" --role="projects/${gcpProjectID}/roles/pilotService"`, (error, stdout) => {
      if (error) rej(error)
      res(stdout)
    })
  })
  .catch(error => {
    throw error
  })

export default {
  terraInit,
  terraApply,
  terraDestroy,
  installWaypoint,
  serviceAccountExists,
  serviceAccountKeyGen,
  pilotRoleExists,
  createServiceAccount,
  createIAMRole,
  bindIAMRole,
}

