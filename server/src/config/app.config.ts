export const appConfig = {
  porta: process.env.APP_PORT ? parseInt(process.env.APP_PORT) : 3000,
  ambiente: process.env.NODE_ENV || "development",
};
