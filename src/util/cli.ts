import chalk from 'chalk'
const ora = require('ora')

export const planeSpinnerAnim = {
  interval: 500,
  frames: [
    '\u2708  ',
    ' \u2708 ',
    '  \u2708',
  ],
}

export const pilotSpinner = () => {
  const s = ora()
  s.color = 'magenta'
  s.spinner = planeSpinnerAnim
  return s
}

export const pilotText = chalk.bold.magentaBright
export const successText = chalk.bold.green
export const failText = chalk.bold.red
export const grayText = chalk.gray

export const logo = chalk.bold.magentaBright(`

    *(((((((((((((((((((((((((((((((((((.  (((((((((((((((((* 
                                     .((.                     
         *(((((((((((((((((.         .((.  ((((((((((((*      
                       .((.         .((.                     
             *(((((((.  ((/         /((. .(((((((*           
                         ((((.    ((((                       
                           ./(((((/. 

    _________________________________________________________
              _____      __    __        ___     ______
              /    )     /      /      /    )      /
     __  __  /____/ __  /  __  /  __  /    /  __  /  __  __
            /          /      /      /    /      /
           /         _/_     /____/ (____/      /
    _________________________________________________________


`)
