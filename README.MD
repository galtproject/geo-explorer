p align="center"> <img src="https://raw.githubusercontent.com/galtproject/galtproject-docs/master/images/Artboard7.png" alt="Accurate land plots coordinates in smart contract" width="300"/></p>
# Galt Project Geo explorer

Working with SpaceGeoData contract in GaltProject contracts.

Indexing changes of contours and providing api for getting:
- Contours discovery by parent geohashes
- Proof of location by geohashes inside contours

## Servers:

- Local(pre-dev) contracts: https://geo-explorer.testnet.galtproject.io:33440
- Dev contracts: https://geo-explorer.testnet.galtproject.io:33550

## Result in UI:
![image](https://user-images.githubusercontent.com/4842007/65043644-982f5180-d95b-11e9-8ded-e71c99c2aee9.png)

## How to run

1. Edit `config.ts`, specify database
2. Install database software and configure it at `./database/<config.database>/` folder
3. `npm i`
4. `npm start`

## Environment variables

| Variable | Description |
|-----|-------------|
| DATABASE_NAME | Specify database name for store |
| API_PORT | Specify port of application api  |
| CHAIN_ENV | Specify environment of contracts(`local`, `dev`, `test`, `prod` for example)  |

## API

| Uri | Description | Output example |
|-----|-------------|----------------|
| /v1/contours/by/inner-geohash/:geohash | get contours list by inner geohash | {"lastChangeBlockNumber":"965112","currentBlockNumber":965114,"data":[{"contour":["w24q8xwf4uq0","w24q8xwfjuk0","w24q8xwfvfk0","w24q8xwfffq0"],"tokenId":"1"},{"contour":["w24q8xwf4uq0","w24q8xwfjuk0","w24q8xwfvfk0","w24q8xwfffq0"],"tokenId":"2"}]} |
| /v1/contours/by/parent-geohash/:geohashes | get by contours list by parent geohash or list separated by "," | {"lastChangeBlockNumber":"965112","currentBlockNumber":965114,"data":[{"contour":["w24q8xwf4uq0","w24q8xwfjuk0","w24q8xwfvfk0","w24q8xwfffq0"],"tokenId":"1"},{"contour":["w24q8xwf4uq0","w24q8xwfjuk0","w24q8xwfvfk0","w24q8xwfffq0"],"tokenId":"2"}]} |


## Use pm2 example
```
pm2 install typescript
DATABASE_NAME=geo_explorer_local CHAIN_ENV=local API_PORT=3344 pm2 start ./index.ts --name "geo-explorer-local"
pm2 save
pm2 startup
```

##  Tests
```
npm test
```

### Tests coverage ~97.41% Statements.
```
npm run testCoverage
```

