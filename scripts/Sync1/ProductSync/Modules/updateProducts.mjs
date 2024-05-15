import WooCommerce from "../../Api/apiConfig.mjs";

const updateProducts = async (updatedProducts) => {
  const batchSize = 50; // Reduced batch size
  const timeout = 60000; // 60 seconds timeout
  const maxRetries = 3; // Max number of retries

  const updateBatch = async (batch, retries = 0) => {
    try {
      await WooCommerce.post("products/batch", { update: batch }, { timeout });
      console.log("Batch updated successfully");
    } catch (error) {
      console.error("Error updating products:", error);
      if (retries < maxRetries) {
        console.log(`Retrying batch update (${retries + 1}/${maxRetries})...`);
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds before retrying
        await updateBatch(batch, retries + 1);
      }
    }
  };

  for (let i = 0; i < updatedProducts.length; i += batchSize) {
    const batch = updatedProducts.slice(i, i + batchSize);
    console.log("Updating products batch:", JSON.stringify(batch, null, 2));
    await updateBatch(batch);
  }
};

export { updateProducts };
