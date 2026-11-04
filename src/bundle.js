const containsPath = require('contains-path');
const fs = require('fs');
const path = require('path');
const tar = require('tar');

function cleanTmp(tmpPath) {
  try {
    fs.mkdirSync(tmpPath, { recursive: true });
  } catch (e) {
    console.log(e);
  }
  console.log('rm path', path.join(tmpPath, '*'));
  fs.readdirSync(tmpPath).forEach((entry) => {
    fs.rmSync(path.join(tmpPath, entry), { recursive: true, force: true });
  });
}

export default function createBundle(appPath, tmpPath, api) {
  console.log('tmp', tmpPath);
  cleanTmp(tmpPath);

  return new Promise((resolve, reject) => {
    const bundlePath = api.resolvePath(tmpPath, 'bundle.tar.gz');

    console.log('starting archive');

    tar.c({
      file: bundlePath,
      onwarn(message, data) { console.log(message, data); },
      cwd: path.resolve(api.getBasePath(), appPath),
      portable: true,
      gzip: {
        level: 9,
      },
      filter(_path) {
        if (containsPath(_path, '.git')) {
          return false;
        }
        if (containsPath(_path, 'node_modules')) {
          return false;
        }

        return true;
      },
    }, ['.'], (err) => {
      if (err) {
        console.log('err bundling');
        console.log(err);
        reject(err);
      } else {
        resolve();
      }
    });
  });
}
