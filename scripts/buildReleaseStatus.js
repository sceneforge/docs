const { writeFile } = require('fs/promises');
const { join } = require('path');

module.exports = async ({ path }) => {
  const status = JSON.stringify({
    draft: process.env.RELEASE_DRAFT,
    name: process.env.RELEASE_NAME,
    prerelease: process.env.RELEASE_PRERELEASE,
    timestamp: new Date().toISOString(),
  }, null, 2);

  return await writeFile(join(path, '.release-status.json'), status, {
    encoding: 'utf8',
    flag: 'w',
  });
};
