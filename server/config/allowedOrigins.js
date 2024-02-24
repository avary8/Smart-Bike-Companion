/* Cross Origin Resource Sharing
    put websites <that you want> that should have access to this api 
    make sure to remove certain sites from allowedOrigins after development 
*/

const allowedOrigins = [
    'https://www.yourWebsite.com', 
    'http://127.0.0.1:5500', 
    'http://localhost:3500',
    'http://localhost:5173'
];


module.exports = allowedOrigins;