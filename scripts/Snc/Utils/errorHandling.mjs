function handleAPIError(error, message, retryOptions) {
  console.error(message, error);
  if (retryOptions && retryOptions.canRetry && retryError.retryCount < 3) {
    setTimeout(retryOptions.callback, 2000); // Retry after 2 seconds
  } else {
    throw new Error(`Failed after retries: ${message}`);
  }
}

export { handleAPIError };
