import WooCommerce from "../../Api/apiConfig.mjs";

const deleteProducts = async (productsToDelete, storeProducts) => {
  const batchSize = 100;
  const idsToDelete = productsToDelete.map(
    (sku) => storeProducts.find((product) => product.sku === sku).id
  );
  for (let i = 0; i < idsToDelete.length; i += batchSize) {
    const batch = idsToDelete.slice(i, i + batchSize);
    console.log("Deleting products batch:", batch);
    try {
      await WooCommerce.post("products/batch", { delete: batch });
    } catch (error) {
      console.error("Error deleting products:", error);
    }
  }
};

export { deleteProducts };
