const https = require('https');

const url = "https://ziboanpnqrzwdzelmwkf.supabase.co/storage/v1/object/public/banco_preguntas/Ciencias/Fisica/Fis_21-1_01.png";

https.get(url, (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('Headers:', res.headers);
}).on('error', (e) => {
  console.error(e);
});
