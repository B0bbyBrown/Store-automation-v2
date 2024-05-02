import { readdir, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { join } from "node:path";
import path from "path";
import fs from "fs";
import csvParser from "csv-parser";
import csv from "fast-csv";

async function findLatestCSV(convertedDirectoryPath) {
  let latestFile = null;
  let latestTime = 0;

  async function traverseDirectories(directory) {
    const files = await readdir(directory);
    for (const file of files) {
      const filePath = join(directory, file);
      const fileStat = await stat(filePath);

      if (fileStat.isDirectory()) {
        await traverseDirectories(filePath);
      } else if (file.endsWith(".csv") && fileStat.mtimeMs > latestTime) {
        latestFile = filePath;
        latestTime = fileStat.mtimeMs;
      }
    }
  }

  await traverseDirectories(convertedDirectoryPath);
  return latestFile;
}

async function filterProductsByKeywords(filePath, keywords, logger) {
  const has = [];
  const hasNot = [];
  const products = [];

  return new Promise((resolve, reject) => {
    logger.info("Reading and parsing CSV data...");
    createReadStream(filePath)
      .pipe(csvParser())
      .on("data", (row) => products.push(row))
      .on("end", () => {
        logger.info("CSV data read successfully. Processing data...");

        for (const product of products) {
          const productName = product.product_name || "";
          const productMetaData = product.meta_data || "";

          let found = false;

          for (const keyword of keywords) {
            if (
              productName.includes(keyword) ||
              productMetaData.includes(keyword)
            ) {
              has.push(product);
              found = true;
              break;
            }
          }

          if (!found) {
            hasNot.push(product);
          }
        }

        logger.info("Data processing complete.");
        resolve({ has, hasNot });
      })
      .on("error", (error) => {
        logger.error("Error parsing CSV file:", error);
        reject(error);
      });
  });
}

async function saveFilteredProducts(filteredProducts, outputPath, logger) {
  return new Promise((resolve, reject) => {
    ensureDirectoryExistence(outputPath);

    logger.info("Writing data to new CSV...");
    csv
      .writeToPath(outputPath, filteredProducts, { headers: true })
      .on("error", (error) => {
        logger.error("Error writing CSV file:", error);
        reject(error);
      })
      .on("finish", () => {
        logger.info(`Filtered products saved to ${outputPath}`);
        resolve();
      });
  });
}

function ensureDirectoryExistence(filePath) {
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
}

export {
  findLatestCSV,
  filterProductsByKeywords,
  saveFilteredProducts,
  ensureDirectoryExistence,
};
// Path: scripts/Final_Touches/Modules/logger.mjs
