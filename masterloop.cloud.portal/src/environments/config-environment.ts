import { writeFile } from 'fs';
// Configure Angular `environment.ts` file path
const targetPath = './src/environments/environment.ts';

require('dotenv').config();
// `environment.ts` file structure
const envConfigFile = `export const environment = {
   production: ${process.env.PRODUCTION},
   api_url: '${process.env.API_URL}',
   app_name: '${process.env.APP_NAME}',
   api_version: '${process.env.API_VERSION}',
   live_port: '${process.env.LIVE_PORT}',
   live_connection_secured: ${process.env.LIVE_CONNECTION_SECURED}
};
`;
console.log(
  'The file `environment.ts` will be written with the following content: \n'
);
console.log(envConfigFile);
writeFile(targetPath, envConfigFile, function (err) {
  if (err) {
    throw console.error(err);
  } else {
    console.log(
      `Angular environment.ts file generated correctly at ${targetPath} \n`
    );
  }
});
