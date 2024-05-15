import axios from "axios";
import { chunkArray, delay } from "../../CategorySync/Modules/utils.mjs";

async function uploadProductsInBatches(products) {
  const batchSize = 75;
  const batches = chunkArray(products, batchSize);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];

    try {
      console.log(`Uploading batch ${i + 1}/${batches.length}`);
      await axios.post(
        "https://wootestsite.novawebsolutions.co.za/wp-json/wc/v3/products/batch",
        {
          create: batch,
        },
        {
          auth: {
            username: "ck_c3441b1f644988d27b4bdd3a13f674bbd0cca092",
            password: "cs_a92a795b8835f3b45f42b195f644b6e672cb0946",
          },
          params: {
            timeout: 60000,
          },
        }
      );
      console.log(`Batch ${i + 1} uploaded successfully.`);
    } catch (error) {
      console.error(`Error uploading batch ${i + 1}:`, error);
      // Retry logic can be added here if needed
    }

    // Introduce a delay of 1 minute between batch uploads
    if (i < batches.length - 1) {
      console.log("Waiting for 1 minute before uploading the next batch...");
      await delay(60000);
    }
  }
}

export { uploadProductsInBatches };
