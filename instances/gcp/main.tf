data "google_billing_account" "acct" {
  display_name = "My Billing Account"
  open         = true
}

resource "google_project" "my_project" {
  name       = "pilot-10"
  project_id = "pilot-10"
  billing_account = data.google_billing_account.acct.id
}

resource "google_project_service" "iamService" {
  project = "${google_project.my_project.project_id}"
  service = "iam.googleapis.com"

  timeouts {
    create = "30m"
    update = "40m"
  }

  disable_dependent_services = true  
}

resource "google_project_service" "computeEngine" {
  project = "${google_project.my_project.project_id}"
  service = "compute.googleapis.com"

  timeouts {
    create = "30m"
    update = "40m"
  }

  disable_dependent_services = true  
}

resource "google_project_service" "crm" {
  project = "${google_project.my_project.project_id}"
  service = "cloudresourcemanager.googleapis.com"

  timeouts {
    create = "30m"
    update = "40m"
  }

  disable_dependent_services = true  
}

resource "google_service_account" "service_account" {
  account_id   = "pilot-service-account"
  project = "${google_project.my_project.project_id}"
}

resource "google_service_account_key" "mykey" {
  service_account_id = google_service_account.service_account.name
}

data "google_service_account_key" "mykey" {
  name            = google_service_account_key.mykey.name
  public_key_type = "TYPE_X509_PEM_FILE"
}

resource "google_compute_instance" "default" {
  name         = "pilot-gcp-instance"
  machine_type = "e2-medium"
  zone         = "us-central1-a"
  project = "${google_project.my_project.project_id}"

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-9"
    }
  }

  network_interface {
    network = "default"

    access_config {
      // Ephemeral IP
    }
  }

  metadata = {
    startup-script = <<EOF
      #!/bin/sh

      sudo curl -fsSL https://get.docker.com -o get-docker.sh 
      sudo sh get-docker.sh 
      sudo apt-get install -y software-properties-common
      curl -fsSL https://apt.releases.hashicorp.com/gpg | sudo apt-key add -
      sudo apt-add-repository "deb [arch=amd64] https://apt.releases.hashicorp.com $(lsb_release -cs) main"
      sudo apt-get update && sudo apt-get install -y waypoint
      curl -fsSL https://deb.nodesource.com/setup_14.x | sudo -E bash -
      sudo apt-get install -y nodejs
      sudo apt install -y awscli
      sudo apt install -y yarn      
    EOF
  }

  service_account {
    # Google recommends custom service accounts that have cloud-platform scope and permissions granted via IAM Roles.
    email  = google_service_account.service_account.email
    scopes = ["cloud-platform"]
  }

  depends_on = [google_project_service.computeEngine]
}

resource "google_compute_network" "default" {
  name = "pilot-network"
  project = "${google_project.my_project.project_id}"

  depends_on = [google_project_service.computeEngine]
}

resource "google_compute_firewall" "default" {
  name    = "pilot-firewall"
  project = "${google_project.my_project.project_id}"
  network = google_compute_network.default.name

  allow {
    protocol = "icmp"
  }

  allow {
    protocol = "tcp"
    ports    = ["80", "8080", "1000-2000", "9701", "9702"]
  }

  source_tags = ["web"]
}