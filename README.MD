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
| CHAIN_ENV | Specify environment of contracts(local, test, prod for example)  |

## API

| Uri | Description | Output example |
|-----|-------------|----------------|
| /v1/contours/by/inner-geohash/:geohash | get contours list by inner geohash | {"lastUpdateBlockNumber":"965112","currentBlockNumber":965114,"data":[{"contour":["w24q8xwf4uq0","w24q8xwfjuk0","w24q8xwfvfk0","w24q8xwfffq0"],"spaceTokenId":"1"},{"contour":["w24q8xwf4uq0","w24q8xwfjuk0","w24q8xwfvfk0","w24q8xwfffq0"],"spaceTokenId":"2"}]} |
| /v1/contours/by/parent-geohash/:geohashes | get by inner  | [{"contour":["w24q8xwf4uq0","w24q8xwfjuk0","w24q8xwfvfk0","w24q8xwfffq0"],"spaceTokenId":"1"},{"contour":["w24q8xwf4uq0","w24q8xwfjuk0","w24q8xwfvfk0","w24q8xwfffq0"],"spaceTokenId":"2"}] |

##  Tests
```
npm test
```

### Tests coverage ~97.41% Statements.
```
npm run testCoverage
```

