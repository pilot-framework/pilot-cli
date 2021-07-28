const yamlConfig = (sshPubKey: string) =>
  `#cloud-config
# Add groups to the system
# Adds the ubuntu group with members 'root' and 'sys'
# and the empty group pilot.
groups:
  - ubuntu: [root,sys]
  - pilotgrp
  - docker

# Add users to the system. Users are added after groups are added.
users:
  - default
  - name: pilot
    gecos: pilot
    shell: /bin/bash
    primary_group: pilotgrp
    sudo: ALL=(ALL) NOPASSWD:ALL
    groups: users, admin, docker
    lock_passwd: false
    ssh_authorized_keys:
      - ${sshPubKey}

apt:
  preserve_sources_list: true
  sources:
    docker:
      source: "deb [arch=amd64] https://download.docker.com/linux/ubuntu focal stable"
      keyid: 9DC8 5822 9FC7 DD38 854A  E2D8 8D81 803C 0EBF CD88
    waypoint:
      source: "deb [arch=amd64] https://apt.releases.hashicorp.com focal main"
      keyid: E8A0 32E0 94D8 EB4E A189  D270 DA41 8C88 A321 9F7B

apt_update: true

packages:
  - apt-transport-https
  - ca-certificates
  - curl
  - gnupg
  - lsb-release
  - docker-ce
  - docker-ce-cli
  - containerd.io
  - waypoint

# Configuration files for Docker host
write_files:
  - content: |
      [Service]
      ExecStart=
      ExecStart=/usr/bin/dockerd
    path: /etc/systemd/system/docker.service.d/override.conf
  - content: |
      {"hosts": ["tcp://0.0.0.0:2375", "unix:///var/run/docker.sock"]}
    path: /etc/docker/daemon.json

runcmd:
  - sudo systemctl daemon-reload
  - sudo systemctl restart docker.service`

export default {
  yamlConfig,
}
