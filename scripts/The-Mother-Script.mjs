import { mainDownload } from "./Download.mjs";
import { mainConversion } from "./Conversion.mjs";
import { mainScraper } from "./Scraper.mjs";
import { mainWooRephrase } from "./WooRephrase.mjs";
//import { mainFinalFilter } from "./Final-Filter.mjs";
//import { mainFinalTouches } from "./Final-Touches.mjs";

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

  //   try {
  //     console.log("Initiating final Filter process...");
  //     await mainFinalFilter();
  //     console.log("Final Filter process completed successfully.");
  //   } catch (error) {
  //     console.error("Error in mainFinalFilter:", error);
  //   }
  //   console.log("The Mother Script has completed successfully.");

  //   try {
  //     console.log("Initiating final touches process...");
  //     await mainFinalTouches();
  //     console.log("Final touches process completed successfully.");
  //   } catch (error) {
  //     console.error("Error in mainFinalTouches:", error);
  //   }
  //   console.log("The Mother Script has completed successfully.");
}

TheMotherScript();
