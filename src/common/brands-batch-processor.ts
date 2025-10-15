import {BrandsMapping, checkBrandIsSeparateTerm} from "./brands";
import {sources} from "../sites/sources";
import {stringToHash} from "../utils";
import {getPotentialBrands, resolveToCanonicalBrand} from "./brands-clustering";
import {filterMatchesByValidation, prioritizeByPosition} from "./brands-validator";

/*
* batch processor function
* Each batch is processed in sequence, reducing memory footprint
* TODO: Consider migrating to a distributed batch processor like BullMQ for better scalability
* */
export async function processProductsBatch(
    batch: any[],
    brandsMapping: BrandsMapping,
    canonicalMapping: Map<string, string>,
    brandIndex: Map<string, Set<string>>,
    source: sources
): Promise<any[]> {
    const results = []

    for (const product of batch) {
        if (product.m_id) {
            continue
        }

        // Only check potential brands instead of all brands
        const potentialBrands = getPotentialBrands(product.title, brandIndex)
        let matchedBrands = []

        for (const brand of potentialBrands) {
            const isBrandMatch = checkBrandIsSeparateTerm(product.title, brand)
            if (isBrandMatch) {
                matchedBrands.push(brand)
            }
        }

        // Apply edge case validation rules (1-6)
        matchedBrands = filterMatchesByValidation(matchedBrands, product.title)

        // prioritize by position
        matchedBrands = prioritizeByPosition(matchedBrands, product.title)

        // Resolve to canonical brand (task 2)
        let finalBrand = null
        if (matchedBrands.length > 0) {
            finalBrand = resolveToCanonicalBrand(matchedBrands[0], canonicalMapping)
        }

        const sourceId = product.source_id
        const meta = { matchedBrands }
        const brand = finalBrand

        const key = `${source}_${sourceId}`
        const uuid = stringToHash(key)

        results.push({
            product,
            matchedBrands,
            finalBrand,
            uuid
        })
    }

    return results
}