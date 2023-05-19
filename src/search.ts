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

/**
 * Search settlements by query. The lower the score, the better the match.
 *
 * @param params
 * @param params.query Query to search for.
 * @param params.countries Countries to search in.
 * @param params.settlementKinds Settlement kinds to search in.
 * @param params.reduceScoreForSettlementKind If you want a settlement kind to be preferred, you can reduce its score. You can experiment with the score to get the best results.
 * @param params.limit Limit the number of results.
 * @param params.threshold Threshold for fuzzy search. If you want to disable fuzzy search, set this to 0.
 * @returns Array of settlement names.
 */

async function searchSettlements<T extends keyof ByCountry>(params: {
   query: string
   countries?: T[]
   settlementKinds?: ByCountry[T][]
   reduceScoreForSettlementKind?: {
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
         reduceScoreForSettlementKind = {} as {
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

         const extraScore =
            reduceScoreForSettlementKind[settlementKinds[i]!] ?? 0

         results = [
            ...results,
            ...(fuse.search(query).map((result) => ({
               ...result,
               score: (result.score ?? 0) - extraScore,
            })) as SearchHit[]),
         ]
      }

      return results
         .sort((a, b) => a.score - b.score)
         .map((result) => result.item.name)
         .slice(0, params.limit)
   })
}

export { searchSettlements }
