import { mainDownload } from "./CSV-Manipulation/Download.mjs";
import { mainConversion } from "./CSV-Manipulation/Conversion.mjs";
import { mainScraper } from "./CSV-Manipulation/Scraper.mjs";
import { mainWooRephrase } from "./CSV-Manipulation/WooRephrase.mjs";

async function TheMotherScript() {
  console.log("Starting up The Mother Script...");

  try {
    console.log("Initiating download process...");
    await mainDownload();
    console.log("Download process completed successfully.");
  } catch (error) {
    console.error("Error in mainDownload:", error);
  }

  try {
    console.log("Initiating conversion process...");
    await mainConversion();
    console.log("Conversion process completed successfully.");
  } catch (error) {
    console.error("Error in mainConversion:", error);
  }

  try {
    console.log("Initiating scraping process...");
    await mainScraper();
    console.log("Scraping process completed successfully.");
  } catch (error) {
    console.error("Error in mainScraper:", error);
  }

  try {
    console.log("Initiating rephrasing process...");
    await mainWooRephrase();
    console.log("Rephrasing process completed successfully.");
  } catch (error) {
    console.error("Error in mainWooRephrase:", error);
  }
}

TheMotherScript();
