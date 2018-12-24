#!/usr/bin/env /usr/local/bin/node

/**
 * <bitbar.title>Pending GitHub Pull Requests</bitbar.title>
 * <bitbar.version>v1.0</bitbar.version>
 * <bitbar.author>Krakaw</bitbar.author>
 * <bitbar.author.github>Krakaw</bitbar.author.github>
 * <bitbar.desc>Checks for pending GitHub PR's</bitbar.desc>
 * <bitbar.dependencies>node</bitbar.dependencies>
 * <bitbar.image>https://raw.githubusercontent.com/Krakaw/bitbar-github-prs/master/screenshot.png</bitbar.image>
 * <bitbar.abouturl>https://github.com/Krakaw/bitbar-github-prs</bitbar.abouturl>
 */

const fs = require("fs");
const path = require("path");
const ENV = _parseEnv(path.resolve(__dirname, ".env"));
/**
 * Your GitHub Username
 * @type {string}
 */
const USERNAME = ENV.USERNAME || "";
/**
 * Generate a GitHub personal access token at https://github.com/settings/tokens
 * @type {string}
 */
const PERSONAL_ACCESS_TOKEN = ENV.PERSONAL_ACCESS_TOKEN || "";
/**
 * Your github username as the User-Agent
 * @type {string}
 */
const USER_AGENT = USERNAME;
if (!USER_AGENT) {
	console.log("Missing User-Agent");
}

/**
 * A list of github repos and their name
 * [{url: "https://api.github.com/repos/big-neon/bn-api/pulls", name: "big-neon/bn-api" }]
 * @type {*[{url: string, name: string}]}
 */
const URLS = ENV.PR_URLS_BASE64 ? eval(Buffer.from(ENV.PR_URLS_BASE64, "base64").toString("ascii")) : [];;
/**
 * The toolbar title
 * The only var is {count} which is the total pending pull requests
 * @type {string}
 */
const TITLE = "{count} PR's";

const promises = [];

URLS.forEach(url => {
	promises.push(getContent(url));
});

Promise.all(promises).then(results => {
	let count = 0;
	let body = "";
	results.forEach(result => {
		result = parsePulls(result);
		count += result.count;
		body += result.result;
	});
	body = TITLE.replace("{count}", count) + "\n" + body;
	console.log(body);
}).catch((response) => {
	if (response.statusCode === 403) {
		let date = (new Date(response.headers['x-ratelimit-reset'] * 1000));
		let fmt = _dateFormat(date, "%H:%M:%S");
		console.log("Rate Limit Exceeded Until: ", fmt)
	} else {
		console.log("Error", response.statusCode);
	}
})

/**
 * Parses the github response and pulls the fields out
 * @param resultData
 * @return {{count: *, result: (string|string)}}
 */
function parsePulls(resultData) {
	const {jsonString, name} = resultData;
	let json = JSON.parse(jsonString);
	let result = "";
	let count = json.length;
	let repoName = name;
	result += json.map(pull => {
		repoName = pull.base.repo.full_name;
		let row = `--#${pull.number} - ${pull.title} - ${pull.user.login} | href=${pull.html_url}`;
		return row;
	}).join("\n");
	result = "---\n" + repoName + " (" + count + ")\n" + result + "\n";
	return { count, result };
}

/**
 * Generic'ish function to GET a url
 * @param contentData {url: string, name: string}
 * @return {Promise}
 */
function getContent(contentData) {
	const {name} = contentData;
	const url = contentData.url;
	// return new pending promise
	return new Promise((resolve, reject) => {
		const headers = {"Content-Type": "application/json", "User-Agent": USER_AGENT};
		if (USERNAME && PERSONAL_ACCESS_TOKEN) {
			headers["Authorization"] = `Basic ${Buffer.from(USERNAME + ":" + PERSONAL_ACCESS_TOKEN).toString('base64')}`
		}
		// select http or https module, depending on reqested url
		const lib = url.startsWith("https") ? require("https") : require("http");
		const request = lib.get(url, {headers}, (response) => {
			// handle http errors
			if (response.statusCode < 200 || response.statusCode > 299) {
				reject(response);
			}
			// temporary data holder
			const body = [];
			// on every content chunk, push it to the data array
			response.on("data", (chunk) => body.push(chunk));
			// we are done, resolve promise with those joined chunks
			response.on("end", () => resolve({jsonString: body.join(""), name}));
		});
		// handle connection errors of the request
		request.on("error", (err) => reject(err, response))
	})
}

function _dateFormat (date, fstr, utc) {
	utc = utc ? 'getUTC' : 'get';
	return fstr.replace (/%[YmdHMS]/g, function (m) {
		switch (m) {
			case '%Y': return date[utc + 'FullYear'] (); // no leading zeros required
			case '%m': m = 1 + date[utc + 'Month'] (); break;
			case '%d': m = date[utc + 'Date'] (); break;
			case '%H': m = date[utc + 'Hours'] (); break;
			case '%M': m = date[utc + 'Minutes'] (); break;
			case '%S': m = date[utc + 'Seconds'] (); break;
			default: return m.slice (1); // unknown code, remove %
		}
		// add leading zero if required
		return ('0' + m).slice (-2);
	});
}

function _parseEnv(envPath) {
	const env = {};
	try {
		if (fs.existsSync(envPath)) {
			let data = fs.readFileSync(envPath, "utf8");
			data = data.split("\n");
			data.filter(line => {
				let trimmedLine = line.trim();
				return trimmedLine !== "" && trimmedLine.substr(0,1) !== "#" && trimmedLine.indexOf("=") > -1;
			}).forEach(line => {
				let trimmedLine = line.trim();
				let indexOfEqual = trimmedLine.indexOf("=");
				let key = trimmedLine.substr(0,indexOfEqual);
				let value = trimmedLine.substr(indexOfEqual + 1);
				env[key] = value;
			});
		}
	}catch(e) {
	}
	return env;
}