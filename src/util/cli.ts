import chalk from 'chalk'
const ora = require('ora')

const planeSpinnerAnim = {
  interval: 500,
  frames: [
    '\u2708  ',
    ' \u2708 ',
    '  \u2708',
  ],
}

const pilotSpinner = () => {
  const s = ora()
  s.color = 'magenta'
  s.spinner = planeSpinnerAnim
  return s
}

export default {
  pilotSpinner,
}
