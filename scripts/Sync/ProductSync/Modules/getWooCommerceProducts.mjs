import WooCommerce from "../../Api/apiConfig.mjs";

const getWooCommerceProducts = async () => {
  try {
    const response = await WooCommerce.get("products", { per_page: 100 });
    return response.data;
  } catch (error) {
    console.error("Error fetching WooCommerce products:", error);
    return [];
  }
};

export { getWooCommerceProducts };
