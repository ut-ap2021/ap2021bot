import request from 'request';

const headers = {
  Authorization: 'Bearer ' + process.env.ESA_IO_SITOO_TOKEN,
};

const apiUrl = 'https://api.esa.io/v1/teams/ap2021students/posts';

const optionsDefault = {
  url: 'https://api.esa.io/v1/teams/ap2021students/posts',
  method: 'GET',
  headers: headers,
};

request(optionsDefault, function (error, response, body) {
  error;
  console.log(response);
  console.log(body);
});

const requestToApi = (req: string) => {
  req;
};

const getPosts = (q: string) => {
  q;
};

apiUrl;
requestToApi;
getPosts;
