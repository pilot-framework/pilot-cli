const terraInit = () => {
  return new Promise((res, rej) => {
    exec(paths.TERRAFORM_EXEC + `-chdir=${paths.GCP_INSTANCES} init`, (error, _) => {
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
    exec(paths.TERRAFORM_EXEC + `-chdir=${paths.GCP_INSTANCES} apply -auto-approve`, (error, _) => {
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
    exec(paths.TERRAFORM_EXEC + `-chdir=${paths.GCP_INSTANCES} destroy -auto-approve`, (error, _) => {
      if (error) rej(error)
      res('success')
    })
  })
  .catch(error => {
    throw error
  })
}

const getWaypointAuthToken = async (ipAddress: string) => {
  return new Promise((res, rej) => {
    exec(`ssh pilot@${ipAddress} -i ${paths.TF_CLOUD_INIT} "waypoint token new"`, (error, data) => {
      if (error) rej(error)
      res(data)
    })
  })
  .catch(error => {
    throw error
  })
}

