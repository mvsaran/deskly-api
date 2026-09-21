# Deskly local coded mock

Run from the repository root:

```sh
postman mock run ./postman/mocks/deskly-mock/default.js
```

The mock listens on port `4500` by default and responds successfully to:

```http
GET http://localhost:4500/health
```
