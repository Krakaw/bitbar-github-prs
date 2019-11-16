#!/usr/bin/env node

/**
 * <bitbar.title>GitHub Contributions</bitbar.title>
 * <bitbar.version>v1.0</bitbar.version>
 * <bitbar.author>Krakaw</bitbar.author>
 * <bitbar.author.github>Krakaw</bitbar.author.github>
 * <bitbar.desc>Counts GitHub user contributions</bitbar.desc>
 * <bitbar.dependencies>node</bitbar.dependencies>
 * <bitbar.image>https://raw.githubusercontent.com/Krakaw/bitbar-github-prs/master/screenshot.png</bitbar.image>
 * <bitbar.abouturl>https://github.com/Krakaw/bitbar-github-prs</bitbar.abouturl>
 */
const fs = require('fs')
const path = require("path");
const {getConfig, dateFormat, getContent} = require('./_helpers');
const config = getConfig();

/**
 * Your GitHub Username
 * @type {string}
 */
const username = config.USERNAME || "";
/**
 * Generate a GitHub personal access token at https://github.com/settings/tokens
 * @type {string}
 */
const password = config.PERSONAL_ACCESS_TOKEN || "";
/**
 * Your github username as the User-Agent
 * @type {string}
 */
const userAgent = username;
if (!userAgent) {
    console.log("Missing User-Agent");
}


let outputFile = path.resolve(__dirname, config.CONTRIBUTION_OUTPUT);
const userContributions = JSON.parse(fs.readFileSync(outputFile, 'utf-8'))

const args = process.argv.slice(2);
const checkUsers = (args[0] || config.CONTRIBUTION_USERS ||  '').split(',');
const writeFile = args[1] !== 'false' && args[1] !== '0';

const today = dateFormat('%Y-%m-%d');

async function getContriubtions() {
    const totalsByUser = []
    for (let i in checkUsers) {
        const checkUsername = checkUsers[i]
        const total = await getUserContributions(checkUsername, today)
        totalsByUser.push({username: checkUsername, total})
    }
    totalsByUser.sort((a, b) => {
        return a.total > b.total ? -1 : a.total < b.total ? 1 : 0;
    });
    console.log(totalsByUser);
    userContributions[today] = totalsByUser
    if (writeFile) {
        fs.writeFileSync(outputFile, JSON.stringify(userContributions));
    }


}

async function getUserContributions(checkUsername, date) {
    const content = await getContent({
        url: `https://github.com/users/${checkUsername}/contributions?to=${date}`,
        username,
        password,
        userAgent
    })
    const regex = /data-count="(\d+)"/gm
    const matches = content.body.match(regex)//content.match(regex);
    let total = 0
    matches.forEach(match => {
        total += +match.replace('data-count=', '').replace(/"/g, '')
    })
    return total
}

(async () => {
    await getContriubtions()
})();
