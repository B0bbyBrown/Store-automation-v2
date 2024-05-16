import WooCommerce from "../../Api/apiConfig.mjs";
import { delay } from "./utils.mjs";

async function fetchExistingCategories(retries = 3, delayMs = 1000) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await WooCommerce.get("products/categories", {
        per_page: 100,
      });
      return response.data;
    } catch (error) {
      if (attempt < retries - 1) {
        console.log(`fetching existing categories... (attempt ${attempt + 1})`);
        await delay(delayMs * Math.pow(2, attempt)); // Exponential backoff
      } else {
        throw error;
      }
    }
  }
}

export { fetchExistingCategories };
