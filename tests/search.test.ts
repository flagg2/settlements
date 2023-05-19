import { it, describe, expect } from "vitest"
import { searchSettlements } from "../src/search"

describe("search", () => {
   it("Should find an exact match", async () => {
      const query = "Pezinok"
      const results = await searchSettlements({
         query,
      })
      expect(results.unwrap()).toContain("Pezinok")
   })

   it("Should return multiple results", async () => {
      const query = "Čierna"
      const results = await searchSettlements({
         query,
      })

      expect(results.unwrap()).toContain("Čierna nad Tisou")
      expect(results.unwrap()).toContain("Čierna")
      expect(results.unwrap()).toContain("Čierna Lehota")
   })

   it("Should work with limit", async () => {
      const query = "Čierna"
      const results = await searchSettlements({
         query,
         limit: 2,
      })

      expect(results.unwrap()).toHaveLength(2)
   })

   it("Should prefer cities with an option", async () => {
      const query = "Čierna"
      const results = await searchSettlements({
         query,
      })

      expect(results.unwrap()[0]).not.toBe("Čierna nad Tisou")

      const resultsWithOption = await searchSettlements({
         query,
         addScoreToSettlementKind: {
            city: 1,
         },
      })

      expect(resultsWithOption.unwrap()[0]).toBe("Čierna nad Tisou")
   })

   it("Should be fuzzy", async () => {
      const query = "Čiera"
      const results = await searchSettlements({
         query,
      })

      expect(results.unwrap()).toContain("Čierna nad Tisou")
      expect(results.unwrap()).toContain("Čierna")
      expect(results.unwrap()).toContain("Čierne")
   })

   it("Should not be fuzzy with threshold", async () => {
      const query = "Čierna"
      const results = await searchSettlements({
         query,
         threshold: 0.1,
      })

      expect(results.unwrap()).toContain("Čierna")
      expect(results.unwrap()).not.toContain("Čierne")
   })

   it("Should only return requested settlement kinds", async () => {
      const query = "Čierna"
      const results = await searchSettlements({
         query,
         settlementKinds: ["village"],
      })

      expect(results.unwrap()).not.toContain("Čierna nad Tisou")
      expect(results.unwrap()).toContain("Čierna")
      expect(results.unwrap()).toContain("Čierne")
   })
})
