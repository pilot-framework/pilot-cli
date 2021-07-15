pilot-framework
===============



[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/pilot-framework.svg)](https://npmjs.org/package/pilot-framework)
[![Downloads/week](https://img.shields.io/npm/dw/pilot-framework.svg)](https://npmjs.org/package/pilot-framework)
[![License](https://img.shields.io/npm/l/pilot-framework.svg)](https://github.com/pilot-framework/pilot-cli/blob/master/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g pilot-framework
$ pilot COMMAND
running command...
$ pilot (-v|--version|version)
pilot-framework/0.0.0 linux-x64 node-v15.6.0
$ pilot --help [COMMAND]
USAGE
  $ pilot COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`pilot hello [FILE]`](#pilot-hello-file)
* [`pilot help [COMMAND]`](#pilot-help-command)
* [`pilot server [FILE]`](#pilot-server-file)
* [`pilot setup`](#pilot-setup)
* [`pilot template [FILE]`](#pilot-template-file)

## `pilot hello [FILE]`

describe the command here

```
USAGE
  $ pilot hello [FILE]

OPTIONS
  -f, --force
  -h, --help       show CLI help
  -n, --name=name  name to print

EXAMPLE
  $ pilot hello
  hello world from ./src/hello.ts!
```

_See code: [src/commands/hello.ts](https://github.com/pilot-framework/pilot-cli/blob/v0.0.0/src/commands/hello.ts)_

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

## `pilot server [FILE]`

describe the command here

```
USAGE
  $ pilot server [FILE]

OPTIONS
  -f, --force
  -h, --help       show CLI help
  -n, --name=name  name to print
```

_See code: [src/commands/server.ts](https://github.com/pilot-framework/pilot-cli/blob/v0.0.0/src/commands/server.ts)_

## `pilot setup`

Sets up Pilot Framework environment

```
USAGE
  $ pilot setup

OPTIONS
  -h, --help  show CLI help
```

_See code: [src/commands/setup.ts](https://github.com/pilot-framework/pilot-cli/blob/v0.0.0/src/commands/setup.ts)_

## `pilot template [FILE]`

describe the command here

```
USAGE
  $ pilot template [FILE]

OPTIONS
  -f, --force
  -h, --help       show CLI help
  -n, --name=name  name to print
```

_See code: [src/commands/template.ts](https://github.com/pilot-framework/pilot-cli/blob/v0.0.0/src/commands/template.ts)_
<!-- commandsstop -->
