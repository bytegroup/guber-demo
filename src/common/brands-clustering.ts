import {BrandsMapping} from "./brands";

/*
* 2nd task: products from a group always assign same brand.
* Finds connected brands (clusters) where all brands map to same canonical brand
* */
export function findBrandClusters(brandsMapping: BrandsMapping): Map<string, number> {
    const visited = new Set<string>()
    const brandToCluster = new Map<string, number>()
    let clusterId = 0

    for (const brand in brandsMapping) {
        if (!visited.has(brand)) {
            const queue: string[] = [brand]
            visited.add(brand)
            brandToCluster.set(brand, clusterId)

            while (queue.length > 0) {
                const currentBrand = queue.shift()!
                const relatedBrands = brandsMapping[currentBrand] || []

                for (const related of relatedBrands) {
                    if (!visited.has(related)) {
                        visited.add(related)
                        brandToCluster.set(related, clusterId)
                        queue.push(related)
                    }
                }
            }

            clusterId++
        }
    }

    return brandToCluster
}

function selectCanonicalBrand(clusterBrands: string[]): string {
    return clusterBrands.sort()[0]
}

export function buildCanonicalMapping(brandsMapping: BrandsMapping): Map<string, string> {
    const brandToCluster = findBrandClusters(brandsMapping)
    const clusterToBrands = new Map<number, string[]>()

    brandToCluster.forEach((clusterId, brand) => {
        if (!clusterToBrands.has(clusterId)) {
            clusterToBrands.set(clusterId, [])
        }
        clusterToBrands.get(clusterId)!.push(brand)
    })

    const canonicalMapping = new Map<string, string>()
    clusterToBrands.forEach((brands) => {
        const canonical = selectCanonicalBrand(brands)
        brands.forEach(brand => {
            canonicalMapping.set(brand, canonical)
        })
    })

    return canonicalMapping
}

export function resolveToCanonicalBrand(brand: string, canonicalMapping: Map<string, string>): string {
    return canonicalMapping.get(brand) || brand
}

// Maps first word of each brand to list of brands starting with that word
export function buildBrandIndex(brandsMapping: BrandsMapping): Map<string, Set<string>> {
    const index = new Map<string, Set<string>>()

    for (const brandKey in brandsMapping) {
        const relatedBrands = brandsMapping[brandKey]
        for (const brand of relatedBrands) {
            const words = brand.toLowerCase().split(/\s+/)
            const firstWord = words[0]

            if (!index.has(firstWord)) {
                index.set(firstWord, new Set())
            }
            index.get(firstWord)!.add(brand)
        }
    }

    return index
}

// Instead of checking ALL brands, only check brands whose first word appears in title
export function getPotentialBrands(title: string, brandIndex: Map<string, Set<string>>): Set<string> {
    const titleWords = title.toLowerCase().split(/\s+/)
    const potentialBrands = new Set<string>()

    for (const word of titleWords) {
        const brandsStartingWithWord = brandIndex.get(word)
        if (brandsStartingWithWord) {
            brandsStartingWithWord.forEach(brand => potentialBrands.add(brand))
        }
    }

    return potentialBrands
}
