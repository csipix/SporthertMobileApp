import { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  // Ez egy egyszerű teszt function
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Helló a Netlify Function-ből!",
      method: event.httpMethod,
    }),
  };
};
