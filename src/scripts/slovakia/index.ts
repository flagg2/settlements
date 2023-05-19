import { readFileSync, writeFileSync } from "fs"
import Fuse from "fuse.js"

function createCityIndex() {
   const parsed = JSON.parse(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      readFileSync("data/slovakia/cities.json", "utf-8"),
   ) as string[]

   // create index for cities

   const cityIndex = Fuse.createIndex(["name"], parsed).toJSON()

   // write index to file

   writeFileSync("indexes/slovakia/cities.json", JSON.stringify(cityIndex))
}

function createVillageIndex() {
   const parsed = JSON.parse(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      readFileSync("data/slovakia/villages.json", "utf-8"),
   ) as string[]

   // create index for villages

   const villageIndex = Fuse.createIndex(["name"], parsed).toJSON()

   // write index to file

   writeFileSync("indexes/slovakia/villages.json", JSON.stringify(villageIndex))
}

function createSlovakiaIndex() {
   createCityIndex()
   createVillageIndex()
}

createSlovakiaIndex()
