import {
    convertToBasicASCII,
    deductIgnoreWord,
    isContainsFirstOrSecondWord,
    isStartsWithFrontWord, isValidExactCapitalizedWords, validateBrandPosition
} from "./brands-validator";
import {buildCanonicalMapping, findBrandClusters} from "./brands-clustering";


describe('Brand Validation Rules', () => {
    describe('toBasicASCII - Edge case 1: Diacritic normalization', () => {
        test('normalizes Lithuanian special characters', () => {
            expect(convertToBasicASCII('Babē')).toBe('Babe')
            expect(convertToBasicASCII('eļļas')).toBe('ellas')
            expect(convertToBasicASCII('nīderlande')).toBe('niderlande')
        })

        test('handles regular ASCII without changes', () => {
            expect(convertToBasicASCII('normal text')).toBe('normal text')
        })
    })

    describe('deductIgnoreWord - Edge case 2: Ignore keywords', () => {
        test('removes BIO keyword', () => {
            expect(deductIgnoreWord('BIO Company')).toBe('Company')
        })

        test('removes NEB keyword', () => {
            expect(deductIgnoreWord('NEB Products')).toBe('Products')
        })

        test('removes both BIO and NEB', () => {
            expect(deductIgnoreWord('BIO NEB')).toBe('')
        })

        test('keeps normal brand names unchanged', () => {
            expect(deductIgnoreWord('Normal Brand')).toBe('Normal Brand')
        })

        test('is case-insensitive', () => {
            expect(deductIgnoreWord('bio company')).toBe('company')
            expect(deductIgnoreWord('Bio Company')).toBe('Company')
        })
    })

    describe('isStartsWithFrontWord - Edge case 3: Must be first', () => {
        test('returns true when front word matches first title word', () => {
            expect(isStartsWithFrontWord('RICH', 'RICH')).toBe(true)
            expect(isStartsWithFrontWord('ultra', 'ultra')).toBe(true)
        })

        test('returns false when front word does not match first title word', () => {
            expect(isStartsWithFrontWord('RICH', 'care')).toBe(false)
            expect(isStartsWithFrontWord('ultra', 'cream')).toBe(false)
        })

        test('returns true when word is not a front word', () => {
            expect(isStartsWithFrontWord('normal', 'care')).toBe(true)
        })

        test('is case-insensitive for matching', () => {
            expect(isStartsWithFrontWord('rich', 'RICH')).toBe(true)
            expect(isStartsWithFrontWord('ULTRA', 'ultra')).toBe(true)
        })
    })

    describe('isContainsFirstOrSecondWord - Edge case 4: First or second position', () => {
        test('returns true when word is at position 0', () => {
            expect(isContainsFirstOrSecondWord('heel', ['heel', 'care'])).toBe(true)
        })

        test('returns true when word is at position 1', () => {
            expect(isContainsFirstOrSecondWord('heel', ['care', 'heel'])).toBe(true)
        })

        test('returns false when word is at position 2 or later', () => {
            expect(isContainsFirstOrSecondWord('heel', ['care', 'foot', 'heel'])).toBe(false)
        })

        test('returns true when word is not in firstOrSecondWords list', () => {
            expect(isContainsFirstOrSecondWord('normal', ['care', 'foot', 'normal'])).toBe(true)
        })
    })

    describe('isValidExactCapitalizedWords - Edge case 6: Case-sensitive HAPPY', () => {
        test('returns true for exactly capitalized HAPPY', () => {
            expect(isValidExactCapitalizedWords('HAPPY')).toBe(true)
        })

        test('returns false for incorrectly capitalized happy', () => {
            expect(isValidExactCapitalizedWords('Happy')).toBe(false)
            expect(isValidExactCapitalizedWords('happy')).toBe(false)
        })

        test('returns true for words not in exact match list', () => {
            expect(isValidExactCapitalizedWords('normal')).toBe(true)
            expect(isValidExactCapitalizedWords('RICH')).toBe(true)
        })
    })

    describe('validateBrandPosition - Combined validation', () => {
        test('validates HAPPY must be capitalized and at start', () => {
            expect(validateBrandPosition('HAPPY care', 'HAPPY')).toBe(true)
            expect(validateBrandPosition('happy care', 'happy')).toBe(false)
            expect(validateBrandPosition('care HAPPY', 'HAPPY')).toBe(false)
        })

        test('validates front words must be at position 0', () => {
            expect(validateBrandPosition('ultra care', 'ultra')).toBe(true)
            expect(validateBrandPosition('care ultra', 'ultra')).toBe(false)
            expect(validateBrandPosition('RICH chocolate', 'RICH')).toBe(true)
        })

        test('validates first/second words can be at position 0 or 1', () => {
            expect(validateBrandPosition('heel care', 'heel')).toBe(true)
            expect(validateBrandPosition('care heel', 'heel')).toBe(true)
            expect(validateBrandPosition('care foot heel', 'heel')).toBe(false)
        })

        test('passes validation for normal brands', () => {
            expect(validateBrandPosition('bioderma cream', 'bioderma')).toBe(true)
            expect(validateBrandPosition('sensilis care', 'sensilis')).toBe(true)
        })
    })

    describe('Brand Clustering - Edge case 7', () => {
        test('findBrandClusters groups connected brands into same cluster', () => {
            const mapping = {
                'a': ['b', 'c'],
                'b': ['a', 'c'],
                'c': ['a', 'b'],
                'd': ['d']
            }
            const clusters = findBrandClusters(mapping)

            // a, b, c should be same cluster
            expect(clusters.get('a')).toBe(clusters.get('b'))
            expect(clusters.get('b')).toBe(clusters.get('c'))

            // d should be different cluster
            expect(clusters.get('d')).not.toBe(clusters.get('a'))
        })

        test('buildCanonicalMapping selects alphabetically first brand', () => {
            const mapping = {
                '3chenes': ['3c pharma', '3chenes'],
                '3c pharma': ['3chenes', '3c pharma']
            }
            const canonical = buildCanonicalMapping(mapping)

            expect(canonical.get('3chenes')).toBe('3c pharma')
            expect(canonical.get('3c pharma')).toBe('3c pharma')
        })

        test('handles single-brand clusters', () => {
            const mapping = {
                '112': ['112']
            }
            const canonical = buildCanonicalMapping(mapping)

            expect(canonical.get('112')).toBe('112')
        })
    })
})