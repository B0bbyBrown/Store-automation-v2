import { mainDownload } from "./CSV-Manipulation/Download.mjs";
import { mainConversion } from "./CSV-Manipulation/Conversion.mjs";
import { mainScraper } from "./CSV-Manipulation/Scraper.mjs";
import { mainWooRephrase } from "./CSV-Manipulation/WooRephrase.mjs";
import { mainFinalFilter } from "./Final_Touches/Final-Filter.mjs";
import { mainFinalTouches } from "./Final_Touches/Final-Touches.mjs";
// import { mainSync } from "./CSV-Manipulation/WooUpdate.mjs";

async function TheMotherScript() {
  console.log("Starting up The Mother Script...");

  // Download & Unzip
  try {
    console.log("Initiating download process...");
    await mainDownload();
    console.log("Download process completed successfully.");
  } catch (error) {
    console.error("Error in mainDownload:", error);
  }

  // Conversion
  try {
    console.log("Initiating conversion process...");
    await mainConversion();
    console.log("Conversion process completed successfully.");
  } catch (error) {
    console.error("Error in mainConversion:", error);
  }

  // Product Scraper
  try {
    console.log("Initiating scraping process...");
    await mainScraper();
    console.log("Scraping process completed successfully.");
  } catch (error) {
    console.error("Error in mainScraper:", error);
  }

  // Rephrasing
  try {
    console.log("Initiating rephrasing process...");
    await mainWooRephrase();
    console.log("Rephrasing process completed successfully.");
  } catch (error) {
    console.error("Error in mainWooRephrase:", error);
  }

  // 15 Second Delay for Rephrase Completion
  console.log("Waiting for 15 seconds before initiating final touches...");
  await new Promise((resolve) => setTimeout(resolve, 15000));

  // Final Touches
  try {
    console.log("Initiating final touches process...");
    await mainFinalTouches();
    console.log("Final touches process completed successfully.");
  } catch (error) {
    console.error("Error in mainFinalTouches:", error);
  }

  // Final Filter
  try {
    console.log("Initiating final filter process...");
    await mainFinalFilter();
    console.log("Final filter process completed successfully.");
  } catch (error) {
    console.error("Error in mainFinalFilter:", error);
  }

  // // Synchronization
  // try {
  //   console.log("Initiating synchronization process...");
  //   await mainSync();
  //   console.log("Synchronization process completed successfully.");
  // } catch (error) {
  //   console.error("Error in mainSync:", error);
  // }
}

TheMotherScript();
