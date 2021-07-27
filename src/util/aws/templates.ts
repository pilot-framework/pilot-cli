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
  # Docker host configuration
  - >-
    echo {\\"hosts\\": [\\"tcp://0.0.0.0:2375\\", \\"unix:///var/run/docker.sock\\"]} | sudo tee /etc/docker/daemon.json > /dev/null
  - sudo mkdir /etc/systemd/system/docker.service.d
  - echo "[Service]" | sudo tee /etc/systemd/system/docker.service.d/override.conf > /dev/null
  - echo "ExecStart=" | sudo tee -a /etc/systemd/system/docker.service.d/override.conf > /dev/null
  - echo "ExecStart=/usr/bin/dockerd" | sudo tee -a /etc/systemd/system/docker.service.d/override.conf > /dev/null
  - sudo systemctl daemon-reload
  - sudo systemctl restart docker.service`

export default {
  yamlConfig,
}
