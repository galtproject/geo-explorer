# Geo explorer

Working with SpaceGeoData contract in GaltProject contracts.

Indexing changes of contours and providing api for getting:
- Contours discovery by parent geohashes
- Proof of location by geohashes inside contours

## How to run

1. Edit config.ts, specify database
2. Install database software and configure it at ./database/<config.database>/ folder
3. `npm i`
4. `npm start`

## Environment variables

| Variable | Description |
|-----|-------------|
| DATABASE_NAME | Specify database name for store |
| API_PORT | Specify port of application api  |
| CHAIN_ENV | Specify environment of contracts(local, dev, test, prod for example)  |

## API

| Uri | Description | Output example |
|-----|-------------|----------------|
| /v1/contours/by/inner-geohash/:geohash | get contours list by inner geohash | {"lastChangeBlockNumber":"965112","currentBlockNumber":965114,"data":[{"contour":["w24q8xwf4uq0","w24q8xwfjuk0","w24q8xwfvfk0","w24q8xwfffq0"],"spaceTokenId":"1"},{"contour":["w24q8xwf4uq0","w24q8xwfjuk0","w24q8xwfvfk0","w24q8xwfffq0"],"spaceTokenId":"2"}]} |
| /v1/contours/by/parent-geohash/:geohashes | get by contours list by parent geohash or list separated by "," | {"lastChangeBlockNumber":"965112","currentBlockNumber":965114,"data":[{"contour":["w24q8xwf4uq0","w24q8xwfjuk0","w24q8xwfvfk0","w24q8xwfffq0"],"spaceTokenId":"1"},{"contour":["w24q8xwf4uq0","w24q8xwfjuk0","w24q8xwfvfk0","w24q8xwfffq0"],"spaceTokenId":"2"}]} |


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

