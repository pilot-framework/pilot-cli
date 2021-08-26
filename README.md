pilot-framework
===============



[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/pilot-framework.svg)](https://www.npmjs.com/package/@pilot-framework/pilot)
[![Downloads/week](https://img.shields.io/npm/dw/pilot-framework.svg)](https://www.npmjs.com/package/@pilot-framework/pilot)
[![License](https://img.shields.io/npm/l/pilot-framework.svg)](https://github.com/pilot-framework/pilot-cli/blob/master/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g @pilot-framework/pilot
$ pilot COMMAND
running command...
$ pilot (-v|--version|version)
@pilot-framework/pilot/0.1.7 linux-x64 node-v15.6.0
$ pilot --help [COMMAND]
USAGE
  $ pilot COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
- [pilot-framework](#pilot-framework)
- [Usage](#usage)
- [Commands](#commands)
  - [`pilot configure`](#pilot-configure)
  - [`pilot connect`](#pilot-connect)
  - [`pilot destroy [APP]`](#pilot-destroy-app)
  - [`pilot help [COMMAND]`](#pilot-help-command)
  - [`pilot init`](#pilot-init)
  - [`pilot invite`](#pilot-invite)
  - [`pilot new TYPE`](#pilot-new-type)
  - [`pilot server`](#pilot-server)
  - [`pilot setup`](#pilot-setup)
  - [`pilot ui`](#pilot-ui)
  - [`pilot up [PROJECT] [PATH]`](#pilot-up-project-path)

## `pilot configure`

Configure remote Waypoint Server with credentials for selected cloud provider.

```
USAGE
  $ pilot configure

OPTIONS
  -h, --help             show CLI help
  -p, --project=project  Project ID for GCP Project that the service account and IAM role will be created for
  --aws                  Configure server with AWS Pilot IAM credentials
  --gcp                  Configure server with GCP Pilot IAM credentials

DESCRIPTION
  This typically only needs to be run once for each provider.
```

_See code: [src/commands/configure.ts](https://github.com/pilot-framework/pilot-cli/blob/v0.1.7/src/commands/configure.ts)_

## `pilot connect`

Used to set the connection context to a Waypoint server from an invite

```
USAGE
  $ pilot connect

OPTIONS
  -h, --help           show CLI help
  -v, --verify         Verify connection with the Waypoint server
  --address=address    Address of server
  --provider=provider  Pilot server cloud provider
  --token=token        Authentication token of server
```

_See code: [src/commands/connect.ts](https://github.com/pilot-framework/pilot-cli/blob/v0.1.7/src/commands/connect.ts)_

## `pilot destroy [APP]`

Destroys all deployments and releases of an application

```
USAGE
  $ pilot destroy [APP]

OPTIONS
  -h, --help  show CLI help
```

_See code: [src/commands/destroy.ts](https://github.com/pilot-framework/pilot-cli/blob/v0.1.7/src/commands/destroy.ts)_

## `pilot help [COMMAND]`

display help for pilot

```
USAGE
  $ pilot help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v3.2.2/src/commands/help.ts)_

## `pilot init`

Scaffolds Pilot's metadata information in ~/.pilot

```
USAGE
  $ pilot init

OPTIONS
  -h, --help               show CLI help
  --gcp-policy=gcp-policy  Specify a path to a CSV file for granular permissions
```

_See code: [src/commands/init.ts](https://github.com/pilot-framework/pilot-cli/blob/v0.1.7/src/commands/init.ts)_

## `pilot invite`

Creates an invite string that can be sent to team members

```
USAGE
  $ pilot invite

OPTIONS
  -h, --help  show CLI help
```

_See code: [src/commands/invite.ts](https://github.com/pilot-framework/pilot-cli/blob/v0.1.7/src/commands/invite.ts)_

## `pilot new TYPE`

Initializes a project or application to be used with Pilot

```
USAGE
  $ pilot new TYPE

ARGUMENTS
  TYPE  (project|app) the type you are trying to initialize (project or app)

OPTIONS
  -b, --bare  Generates Waypoint's template project hcl file.
  -h, --help  show CLI help
```

_See code: [src/commands/new.ts](https://github.com/pilot-framework/pilot-cli/blob/v0.1.7/src/commands/new.ts)_

## `pilot server`

Used to interact with the remote management server

```
USAGE
  $ pilot server

OPTIONS
  -d, --destroy  Teardown the remote management server with its provisioned resources
  -h, --help     show CLI help
  -l, --list     List existing Waypoint Runner configuration
  -s, --ssh      SSH to remote management server
  --db           Provides database connection information
```

_See code: [src/commands/server.ts](https://github.com/pilot-framework/pilot-cli/blob/v0.1.7/src/commands/server.ts)_

## `pilot setup`

Sets up Pilot Framework environment

```
USAGE
  $ pilot setup

OPTIONS
  -d, --dev   Provision Waypoint server using our experimental Docker image. Not guaranteed to work.
  -h, --help  show CLI help
  --aws       Provision Waypoint server on AWS EC2 using Pilot's Docker image.

  --bare      Provision Waypoint server using the default Waypoint Docker image.
              WARNING: you will not have access to Pilot's custom plugins.

  --gcp       Provision Waypoint server on GCP Compute Engine using Pilot's Docker image.
```

_See code: [src/commands/setup.ts](https://github.com/pilot-framework/pilot-cli/blob/v0.1.7/src/commands/setup.ts)_

## `pilot ui`

Opens the Waypoint UI on the default browser

```
USAGE
  $ pilot ui

OPTIONS
  -a, --authenticate  Automatically log in to Waypoint UI
  -h, --help          show CLI help
```

_See code: [src/commands/ui.ts](https://github.com/pilot-framework/pilot-cli/blob/v0.1.7/src/commands/ui.ts)_

## `pilot up [PROJECT] [PATH]`

Deploys your project

```
USAGE
  $ pilot up [PROJECT] [PATH]

OPTIONS
  -h, --help  show CLI help
```

_See code: [src/commands/up.ts](https://github.com/pilot-framework/pilot-cli/blob/v0.1.7/src/commands/up.ts)_
<!-- commandsstop -->
