import { Config } from "./config";
import app from "./app";

const startServer = () => {
  const PORT = Config.PORT;
  try {
    app.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log("Listening on port", PORT);
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.log(err);
    process.exit(1);
  }
};

startServer();
