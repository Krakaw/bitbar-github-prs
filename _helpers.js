const fs = require('fs')
const path = require("path");
const getConfig = (filename = '.env') => {
    const config = _parseEnv(path.resolve(__dirname, ".env"));
    return config;
}

function _parseEnv(envPath) {
    const env = {};
    try {
        if (fs.existsSync(envPath)) {
            let data = fs.readFileSync(envPath, "utf8");
            data = data.split("\n");
            data.filter(line => {
                let trimmedLine = line.trim();
                return trimmedLine !== "" && trimmedLine.substr(0, 1) !== "#" && trimmedLine.indexOf("=") > -1;
            }).forEach(line => {
                let trimmedLine = line.trim();
                let indexOfEqual = trimmedLine.indexOf("=");
                let key = trimmedLine.substr(0, indexOfEqual);
                let value = trimmedLine.substr(indexOfEqual + 1);
                env[key] = value;
            });
        }
    } catch (e) {
    }
    return env;
}

function dateFormat(fstr, date, utc) {
    date = date || new Date();
    utc = utc ? 'getUTC' : 'get';
    return fstr.replace(/%[YmdHMS]/g, function (m) {
        switch (m) {
            case '%Y':
                return date[utc + 'FullYear'](); // no leading zeros required
            case '%m':
                m = 1 + date[utc + 'Month']();
                break;
            case '%d':
                m = date[utc + 'Date']();
                break;
            case '%H':
                m = date[utc + 'Hours']();
                break;
            case '%M':
                m = date[utc + 'Minutes']();
                break;
            case '%S':
                m = date[utc + 'Seconds']();
                break;
            default:
                return m.slice(1); // unknown code, remove %
        }
        // add leading zero if required
        return ('0' + m).slice(-2);
    });
}

/**
 * Generic'ish function to GET a url
 * @param contentData {url: string, name: string}
 * @return {Promise}
 */
function getContent(contentData) {
    if (typeof contentData === 'string') {
        contentData = {url: contentData};
    }
    const {url, username = '', password = '', userAgent = '', ...rest} = contentData;

    return new Promise((resolve, reject) => {
        const headers = {
            "Content-Type": "application/json",
            "User-Agent": userAgent,
            "Cache-Control": "no-cache, no-store, must-revalidate"
        };

        if (username && password) {
            headers["Authorization"] = `Basic ${Buffer.from(username + ":" + password).toString('base64')}`
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
            response.on("end", () => resolve({body: body.join(""), response, ...rest}));
        });
        // handle connection errors of the request
        request.on("error", (err) => reject(err, response))
    })
}

module.exports = {
    getConfig,
    dateFormat,
    getContent
};
