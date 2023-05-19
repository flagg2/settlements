import { AsyncResult, Result } from "@flagg2/result"
import { readFile } from "fs"
import Fuse from "fuse.js"
import path from "path"

type ByCountry = {
   slovakia: "city" | "village"
}

type SearchHit = {
   item: {
      name: string
   }
   refIndex: number
   score: number
}

const dataPaths = {
   slovakia: {
      city: path.join(__dirname, "..", "data/slovakia/cities.json"),
      village: path.join(__dirname, "..", "data/slovakia/villages.json"),
   },
}

const indexPaths = {
   slovakia: {
      city: path.join(__dirname, "..", "indexes/slovakia/cities.json"),
      village: path.join(__dirname, "..", "indexes/slovakia/villages.json"),
   },
}

async function searchSettlements<T extends keyof ByCountry>(params: {
   query: string
   countries?: T[]
   settlementKinds?: ByCountry[T][]
   addScoreToSettlementKind?: {
      [key in ByCountry[T]]?: number
   }
   limit?: number
   threshold?: number
}): AsyncResult<string[]> {
   return Result.from(async () => {
      const {
         query,
         countries = ["slovakia"] as T[],
         settlementKinds = ["city", "village"] as ByCountry[T][],
         addScoreToSettlementKind = {} as {
            [key in ByCountry[T]]?: number
         },
         threshold = 0.3,
      } = params

      const indexes: Promise<Fuse.FuseIndex<any>>[] = []
      const data: Promise<
         {
            name: string
         }[]
      >[] = []

      for (const country of countries) {
         for (const settlementKind of settlementKinds) {
            indexes.push(
               new Promise((resolve) => {
                  readFile(
                     indexPaths[country][settlementKind],
                     "utf-8",
                     (error, data) => {
                        if (error) {
                           throw error
                        }
                        resolve(JSON.parse(data) as Fuse.FuseIndex<string>)
                     },
                  )
               }),
            ) as unknown as Fuse.FuseIndex<any>

            data.push(
               new Promise((resolve) => {
                  readFile(
                     dataPaths[country][settlementKind],
                     "utf-8",
                     (error, data) => {
                        if (error) {
                           throw error
                        }
                        resolve(JSON.parse(data) as { name: string }[])
                     },
                  )
               }),
            )
         }
      }

      const indexResults = (await Promise.all(indexes)).map((index) =>
         Fuse.parseIndex(index),
      )
      const dataResults = await Promise.all(data)

      let results: SearchHit[] = []

      for (const [i, index] of indexResults.entries()) {
         const fuse = new Fuse(
            dataResults[i]!,
            {
               keys: ["name"],
               threshold,
               includeScore: true,
            },
            index,
         )

         const extraScore = addScoreToSettlementKind[settlementKinds[i]!] ?? 0

         results = [
            ...results,
            ...(fuse.search(query).map((result) => ({
               ...result,
               score: (result.score ?? 0) + extraScore,
            })) as SearchHit[]),
         ]
      }

      return results
         .sort((a, b) => b.score - a.score)
         .map((result) => result.item.name)
         .slice(0, params.limit)
   })
}

export { searchSettlements }
