const http = require("http");
const https = require("https");
const { basename } = require("path");
const fs = require("fs");
const { URL } = require("url");

const TIMEOUT = 10 * 1000; // 10 seconds

const download = async (url, dest) => {
  if (!url) {
    throw new Error("URL is required");
  }

  const pkg = url.toLowerCase().startsWith('https:') ? https : http;

  const uri = new URL(url)
  if (!dest) {
    dest = basename(uri.pathname)
  }

  return new Promise((resolve, reject) => {
    const request = pkg.get(uri.href);
    request.on("response", async (response) => {
      if (response.statusCode === 200) {
        const file = fs.createWriteStream(dest, { flags: "wx" });

        response.on("end", () => {
          resolve({
            resolved: [{
              status: response.statusCode,
              url: uri.href,
            }],
            filename: dest,
            basename: file.basename,
            path: file.path,
            size: file.bytesWritten
          });
        }).on("error", err => {
          file.destroy();
          fs.unlink(dest, () => reject(err));
        }).pipe(file);
      }

      else if (response.statusCode === 302 || response.statusCode === 301) {
        try {
          const result = await download(response.headers.location, dest);

          if (Array.isArray(result.resolved) && result.resolved.length > 0) {
            if (result.resolved.find((resolved) => resolved.url === uri.href)) {
              reject(new Error("Circular redirect"));
            }
            else {
              return resolve({
                ...result,
                resolved: [{
                  status: response.statusCode,
                  url: uri.href
                }, ...result.resolved],
              });
            }
          }
          else {
            reject(new Error("No resolved attempts before redirect"));
          }
        }
        catch (err) {
          reject(err);
        }
      }
      else {
        reject(new Error(`Server responded with ${response.statusCode}: ${response.statusMessage}`));
      }
    });

    request.setTimeout(TIMEOUT, () => {
      request.abort();
      reject(new Error("Request timed out"));
    });
  });
};

module.exports = download;
