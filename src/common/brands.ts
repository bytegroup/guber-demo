import { Job } from "bullmq"
import { countryCodes, dbServers, EngineType } from "../config/enums"
import { ContextType } from "../libs/logger"
import _ from "lodash"
import { sources } from "../sites/sources"
import items from "./../data/pharmacyItems.json"
import connections from "./../data/brandConnections.json"
import {buildBrandIndex, buildCanonicalMapping} from "./brands-clustering";
import {processProductsBatch} from "./brands-batch-processor";

export type BrandsMapping = {
    [key: string]: string[]
}

export async function getBrandsMapping(): Promise<BrandsMapping> {
    const brandConnections = connections

    // Create a map to track brand relationships
    const brandMap = new Map<string, Set<string>>()

    brandConnections.forEach(({ manufacturer_p1, manufacturers_p2 }) => {
        const brand1 = manufacturer_p1.toLowerCase()
        const brands2 = manufacturers_p2.toLowerCase()
        const brand2Array = brands2.split(";").map((b) => b.trim())
        if (!brandMap.has(brand1)) {
            brandMap.set(brand1, new Set())
        }
        brand2Array.forEach((brand2) => {
            if (!brandMap.has(brand2)) {
                brandMap.set(brand2, new Set())
            }
            brandMap.get(brand1)!.add(brand2)
            brandMap.get(brand2)!.add(brand1)
        })
    })

    // Convert the flat map to an object for easier usage
    const flatMapObject: Record<string, string[]> = {}

    brandMap.forEach((relatedBrands, brand) => {
        flatMapObject[brand] = Array.from(relatedBrands)
    })

    return flatMapObject
}

async function getPharmacyItems(countryCode: countryCodes, source: sources, versionKey: string, mustExist = true) {
    const finalProducts = items

    return finalProducts
}

export function checkBrandIsSeparateTerm(input: string, brand: string): boolean {
    // Escape any special characters in the brand name for use in a regular expression
    const escapedBrand = brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

    // Check if the brand is at the beginning or end of the string
    const atBeginningOrEnd = new RegExp(
        `^(?:${escapedBrand}\\s|.*\\s${escapedBrand}\\s.*|.*\\s${escapedBrand})$`,
        "i"
    ).test(input)

    // Check if the brand is a separate term in the string
    const separateTerm = new RegExp(`\\b${escapedBrand}\\b`, "i").test(input)

    // The brand should be at the beginning, end, or a separate term
    return atBeginningOrEnd || separateTerm
}

export async function assignBrandIfKnown(countryCode: countryCodes, source: sources, job?: Job) {
    const context = { scope: "assignBrandIfKnown" } as ContextType

    const brandsMapping = await getBrandsMapping()
    const canonicalMapping = buildCanonicalMapping(brandsMapping)

    /*
    * create brand indexing using first word of brand name
    * */
    const brandIndex = buildBrandIndex(brandsMapping)

    const versionKey = "assignBrandIfKnown"
    let products = await getPharmacyItems(countryCode, source, versionKey, false)

    /*
    * To optimize performance we can use batch processing of products
    * Process in batches will manage memory efficiently
    * TODO: Consider migrating to a distributed batch processor like BullMQ for better scalability
    * */
    const BATCH_SIZE = 100
    const totalBatches = Math.ceil(products.length / BATCH_SIZE)

    console.log(`Processing ${products.length} products in ${totalBatches} batches of ${BATCH_SIZE}`)

    for (let i = 0; i < products.length; i += BATCH_SIZE) {
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1
        const batch = products.slice(i, i + BATCH_SIZE)

        const batchResults = await processProductsBatch(
            batch,
            brandsMapping,
            canonicalMapping,
            brandIndex,
            source
        )

        // Log batch progress
        console.log(`Batch ${batchNumber}/${totalBatches} completed: ${batchResults.length} products processed`)

        /*
        * TODO: Consider migrating to a distributed batch processor like BullMQ for better scalability,
        *  perform optimally while storing into DB
        * */
        let counter = 0;
        for (const result of batchResults) {
            /*
            * store result into db - batch insertion.
            * */
            console.log(`${counter++}# ${result.product.title} -> ${_.uniq(result.matchedBrands)} -> Final: ${result.finalBrand}`)
        }

        // Update job progress if using BullMQ
        /*if (job) {
            await job.progress((i + BATCH_SIZE) / products.length * 100)
        }*/
    }

    console.log(`Completed processing all ${products.length} products`)
}
