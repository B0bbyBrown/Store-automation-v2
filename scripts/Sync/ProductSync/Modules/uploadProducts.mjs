import WooCommerce from "../../Api/apiConfig.mjs";

const uploadProducts = async (newProducts) => {
  const batchSize = 50;
  const timeout = 600000;
  const delay = 5000;
  const maxRetries = 3;

  const uploadBatch = async (batch, retries = 0) => {
    try {
      await WooCommerce.post("products/batch", { create: batch }, { timeout });
      console.log("Batch uploaded successfully");

      // Introduce delay
      if (batch.length === batchSize) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    } catch (error) {
      console.error("Error uploading products:" /*error*/);
      if (retries < maxRetries) {
        console.log(`Batch upload (${retries + 1}/${maxRetries})...`);
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds before retrying
        await uploadBatch(batch, retries + 1);
      }
    }
  };

  for (let i = 0; i < newProducts.length; i += batchSize) {
    const batch = newProducts.slice(i, i + batchSize);
    //console.log("Uploading products batch:", JSON.stringify(batch, null, 2));
    await uploadBatch(batch);
  }
};

export { uploadProducts };
