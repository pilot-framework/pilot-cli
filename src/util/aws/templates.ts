const yamlConfig = (sshPubKey: string) =>
  `#cloud-config
# Add groups to the system
# Adds the ubuntu group with members 'root' and 'sys'
# and the empty group pilot.
groups:
  - ubuntu: [root,sys]
  - pilotgrp

# Add users to the system. Users are added after groups are added.
users:
  - default
  - name: pilot
    gecos: pilot
    shell: /bin/bash
    primary_group: pilotgrp
    sudo: ALL=(ALL) NOPASSWD:ALL
    groups: users, admin
    lock_passwd: false
    ssh_authorized_keys:
      - ${sshPubKey}

# Sets the GOPATH & downloads the demo payload
runcmd:
  - sudo su pilot
  # install Docker
  - sudo curl -fsSL https://get.docker.com -o get-docker.sh
  - sudo sh get-docker.sh
  - sudo groupadd docker
  - sudo usermod -aG docker pilot
  - newgrp docker
  # install Waypoint
  - curl -fsSL https://apt.releases.hashicorp.com/gpg | sudo apt-key add -
  - sudo apt-add-repository "deb [arch=amd64] https://apt.releases.hashicorp.com $(lsb_release -cs) main"
  - sudo apt-get update && sudo apt-get install waypoint
  - curl -fsSL https://deb.nodesource.com/setup_14.x | sudo -E bash -
  - sudo apt-get install -y nodejs
  - sudo apt install -y awscli
  - sudo npm install -g yarn
  - sudo apt-get install python
  - echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | sudo tee -a /etc/apt/sources.list.d/google-cloud-sdk.list
  - sudo apt-get install -y apt-transport-https ca-certificates gnupg
  - curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key --keyring /usr/share/keyrings/cloud.google.gpg add -
  - sudo apt-get update && sudo apt-get install -y google-cloud-sdk`

export default {
  yamlConfig,
}
