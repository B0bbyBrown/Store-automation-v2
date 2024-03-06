import { mainDownload } from "./Download.mjs";
import { mainConversion } from "./Conversion.mjs";

async function TheMotherScript() {
  console.log("Starting up The Mother Script...");

  try {
    await mainDownload();
  } catch (error) {
    console.error("Error in mainDownload:", error);
  }

  try {
    await mainConversion();
  } catch (error) {
    console.error("Error in mainConversion:", error);
  }

  console.log("The Mother Script has finished");
}

// Call the main script
TheMotherScript();
