import WooCommerce from "../../Api/apiConfig.mjs";
import { retryRequest } from "../../utils/errorHandling.mjs";

const getWooCommerceCategories = async () => {
  const fetchCategories = async () => {
    return await WooCommerce.get("products/categories", {
      per_page: 100,
    });
  };

  try {
    const response = await retryRequest(fetchCategories);
    return response.data;
  } catch (error) {
    console.error("Error fetching WooCommerce categories:", error);
    return [];
  }
};

export { getWooCommerceCategories };
