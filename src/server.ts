import { Config } from "./config";
import app from "./app";
import logger from "./config/logger";

const startServer = () => {
  const PORT = Config.PORT;
  try {
    app.listen(PORT, () => {
      logger.info(`Listening on port ${PORT}`, { test: "Hello" });
    });
  } catch (err) {
    if (err instanceof Error) {
      logger.error(err.message);
      setTimeout(() => {
        process.exit(1);
      }, 1000);
    }
  }
};

startServer();
