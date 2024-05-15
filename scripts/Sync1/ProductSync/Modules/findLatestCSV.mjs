import { promises as fsPromises } from "fs";
import path from "path";

const findLatestCSV = async (directory) => {
  let latestFile = null;
  let latestTime = 0;

  const traverseDirectories = async (dir) => {
    const files = await fsPromises.readdir(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const fileStat = await fsPromises.stat(filePath);
      if (fileStat.isDirectory()) {
        await traverseDirectories(filePath);
      } else if (file.endsWith(".csv") && fileStat.mtimeMs > latestTime) {
        latestFile = filePath;
        latestTime = fileStat.mtimeMs;
      }
    }
  };

  await traverseDirectories(directory);
  return latestFile;
};

export { findLatestCSV };
