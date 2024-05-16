import WooCommerce from "../../Api/apiConfig.mjs";

const deleteProducts = async (productsToDelete, storeProducts) => {
  const batchSize = 50;
  const delay = 5000;

  const idsToDelete = productsToDelete.map(
    (sku) => storeProducts.find((product) => product.sku === sku).id
  );

  for (let i = 0; i < idsToDelete.length; i += batchSize) {
    const batch = idsToDelete.slice(i, i + batchSize);
    console.log("Deleting products batch:", batch);
    try {
      await WooCommerce.post("products/batch", { delete: batch });
      console.log("Batch deleted successfully");

      // Introduce delay
      if (i + batchSize < idsToDelete.length) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    } catch (error) {
      console.error("Error deleting products:", error);
    }
  }
};

export { deleteProducts };
