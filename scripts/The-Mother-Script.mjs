import { mainDownload } from "./Download.mjs";
import { mainConversion } from "./Conversion.mjs";
import { mainScraper } from "./Scraper.mjs";
import { mainWoocommerce } from "./Woocommerce.mjs";

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
    console.log("Initiating upload process...");
    await mainWoocommerce();
    console.log("Upload process completed successfully.");
  } catch (error) {
    console.error("Error in mainWooCommerce:", error);
  }

  console.log("The Mother Script has finished");
}

// Call the main script
TheMotherScript();
