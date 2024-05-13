import { loadConfig } from "./Modules/configManager.mjs";
import { createLogger } from "./Modules/logger.mjs";
import {
  findLatestCSV,
  filterProductsByKeywords,
  saveFilteredProducts,
} from "./Modules/csvHandler.mjs";

async function mainFinalFilter() {
  const logger = createLogger();

  const config = loadConfig();
  const keywords = config.keywords;
  const outputDirectory = config.directories.output;

  const convertedDirectoryPath = "./output/final_touches/";

  try {
    logger.info("Finding the latest CSV file...");
    const latestFile = await findLatestCSV(convertedDirectoryPath);
    if (!latestFile) {
      logger.error("No CSV file found.");
      return;
    }
    logger.info(`Latest CSV file found: ${latestFile}`);

    logger.info(`Filtering products by keywords: ${keywords}`);
    const { has, hasNot } = await filterProductsByKeywords(
      latestFile,
      keywords,
      logger
    );

    logger.info(
      `Found ${has.length} products matching keywords and ${hasNot.length} not matching.`
    );

    if (has.length > 0) {
      const folderPath = generateFolderPath();
      const outputPath = `${outputDirectory}/${folderPath}/final_filter.csv`;

      logger.info("Saving filtered products...");
      await saveFilteredProducts(has, outputPath, logger);

      logger.info("Filtered products successfully saved.");
    }
  } catch (error) {
    logger.error("Error occurred during the filtering process:", error);
  }
}

function generateFolderPath() {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = ("0" + (now.getMonth() + 1)).slice(-2);
  const day = ("0" + now.getDate()).slice(-2);
  const hour = ("0" + now.getHours()).slice(-2);
  const minute = ("0" + now.getMinutes()).slice(-2);

  return `final_filter/${year}/${month}/${day}/${hour}/${minute}`;
}

export { mainFinalFilter };
