import { compareProducts } from "./compareProducts.mjs";
import { uploadProducts } from "./uploadProducts.mjs";
import { updateProducts } from "./updateProducts.mjs";
import { deleteProducts } from "./deleteProducts.mjs";

const processProducts = async (csvProducts, storeProducts) => {
  console.log("Comparing products...");
  const { newProducts, updatedProducts, productsToDelete } = compareProducts(
    csvProducts,
    storeProducts
  );

  console.log(`${newProducts.length} new products to upload.`);
  console.log(`${updatedProducts.length} products to update.`);
  console.log(`${productsToDelete.length} products to delete.`);

  if (newProducts.length > 0) {
    try {
      await uploadProducts(newProducts);
      console.log("New products uploaded successfully.");
    } catch (error) {
      console.error("Error uploading new products:", error);
    }
  }

  if (updatedProducts.length > 0) {
    try {
      await updateProducts(updatedProducts);
      console.log("Products updated successfully.");
    } catch (error) {
      console.error("Error updating products:", error);
    }
  }

  if (productsToDelete.length > 0) {
    try {
      await deleteProducts(productsToDelete, storeProducts);
      console.log("Products deleted successfully.");
    } catch (error) {
      console.error("Error deleting products:", error);
    }
  }
};

export { processProducts };
