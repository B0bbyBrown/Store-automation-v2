import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api";
import dotenv from "dotenv";

dotenv.config({ path: "./scripts/.env" });

const WooCommerce = new WooCommerceRestApi.default({
  url: process.env.WC_URL,
  consumerKey: process.env.WC_CONSUMER_KEY,
  consumerSecret: process.env.WC_CONSUMER_SECRET,
  version: "wc/v3",
});

export default WooCommerce;
