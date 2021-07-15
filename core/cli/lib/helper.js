const chalk = require('chalk')
const boxen = require("boxen")
const readline = require('readline')
const clearConsole = title => {
  if (process.stdout.isTTY) {
    const blank = '\n'.repeat(process.stdout.rows)
    console.log(blank)
    readline.cursorTo(process.stdout, 0, 0)
    readline.clearScreenDown(process.stdout)
    if (title) {
      console.log(title)
    }
  }
}

exports.generateTitle = async function (version, lastestVersion) {
  let upgradeMessage = `New version available ${chalk.magenta(
    version
  )} → ${chalk.green(lastestVersion)}`;

  try {
    let name = require("../../../package.json").name;
    upgradeMessage += `\nRun ${chalk.yellow(
      `npm i -g ${name}`
    )} to update!`;
    
  } catch (e) {
    throw new Error(e)
  }
  const upgradeBox = boxen(upgradeMessage, {
    align: "center",
    borderColor: "green",
    dimBorder: true,
    padding: 1,
  });
  return upgradeBox
}

exports.clearConsole = async function clearConsoleWithTitle(version, lastestVersion) {
  const title = await exports.generateTitle(version, lastestVersion);
  clearConsole(title);
};

